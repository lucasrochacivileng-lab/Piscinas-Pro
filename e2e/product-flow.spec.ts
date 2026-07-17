import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const unexpectedErrors = new WeakMap<Page, string[]>();

async function createProject(page: Page, name: string, location = "João Pessoa - PB") {
  await page.getByRole("button", { name: "Novo projeto" }).click();
  const navigator = page.locator("aside.navigator");
  await navigator.getByLabel("Nome").fill(name);
  await navigator.getByLabel("Local").fill(location);
  await navigator.getByRole("button", { name: "Criar projeto" }).click();
}

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  unexpectedErrors.set(page, errors);
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("POOLSTRUCT_OPERATIONAL_EVENT")) {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("poolstruct:e2e-initialized")) {
      localStorage.clear();
      sessionStorage.setItem("poolstruct:e2e-initialized", "true");
    }
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
});

test.afterEach(async ({ page }) => {
  expect(unexpectedErrors.get(page) ?? []).toEqual([]);
});

test("cria projeto, calcula, persiste R1 e exporta a memória", async ({ page }) => {
  await createProject(page, "Piscina E2E Alfa");

  await expect(page.getByRole("heading", { name: "Piscina E2E Alfa" })).toBeVisible();
  await page.getByRole("button", { name: "Calcular e salvar revisão" }).click();

  await expect(page.getByText("Calculado", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resultado estrutural" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Modulação dos blocos" })).toBeVisible();
  await expect(page.getByText("JB Blocos · 19 × 19 × 39", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Classe A · fbk 8 MPa", { exact: true })).toBeVisible();
  await expect(page.getByText(/canaletas/).first()).toBeVisible();
  await expect(page.getByText("44.800 L", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /R1/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Prancha estrutural" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Prancha estrutural Piscina E2E Alfa/ })).toBeVisible();

  const drawingDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar prancha SVG" }).click();
  const drawingDownload = await drawingDownloadPromise;
  expect(drawingDownload.suggestedFilename()).toBe("piscina-e2e-alfa-r1-ps-01.svg");
  const drawingPath = await drawingDownload.path();
  expect(drawingPath).not.toBeNull();
  const drawing = await readFile(drawingPath!, "utf8");
  expect(drawing).toContain("PLANTA DE FORMAS — PERFIL LONGITUDINAL");
  expect(drawing).toContain("CORTE LONGITUDINAL A—A");
  expect(drawing).toContain("R1");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar memória HTML" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("piscina-e2e-alfa-r1.html");
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  const html = await readFile(downloadedPath!, "utf8");
  expect(html).toContain("Piscina E2E Alfa");
  expect(html).toContain("POOLSTRUCT · MEMÓRIA DE CÁLCULO");
  expect(html).toContain("Zonas de profundidade");

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("navigation").getByRole("button", { name: /^Piscina E2E Alfa / }).click();
  await expect(page.getByRole("button", { name: /R1/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resultado estrutural" })).toBeVisible();
});

test("modela prainha, fundo principal e parede de degrau", async ({ page }) => {
  await createProject(page, "Piscina com Prainha");
  await page.getByRole("button", { name: "Adicionar zona" }).click();

  const depthInputs = page.getByRole("spinbutton", { name: /^Profundidade d'água mm$/ });
  const lengthInputs = page.getByRole("spinbutton", { name: /^Comprimento horizontal mm$/ });
  await expect(depthInputs).toHaveCount(2);
  await expect(lengthInputs).toHaveCount(2);
  await depthInputs.nth(0).fill("400");
  await depthInputs.nth(1).fill("1600");
  await lengthInputs.nth(0).fill("1600");
  await lengthInputs.nth(1).fill("6400");
  await page.getByRole("button", { name: "Calcular e salvar revisão" }).click();

  const results = page.locator(".results-panel");
  await expect(results.getByRole("heading", { name: "Zonas de profundidade" })).toBeVisible();
  await expect(results.getByText("Prainha", { exact: true })).toBeVisible();
  await expect(results.getByText(/degrau/i).first()).toBeVisible();
  const panelMetric = results.locator(".metrics article").filter({ hasText: "Paredes calculadas" });
  await expect(panelMetric).toContainText("7");
});

test("modela praia contínua de zero até o fundo sem criar degrau falso", async ({ page }) => {
  await createProject(page, "Piscina Praia Inclinada");
  await page.getByRole("button", { name: "Adicionar praia" }).click();

  const lengths = page.getByRole("spinbutton", { name: /^Comprimento horizontal mm$/ });
  await expect(lengths).toHaveCount(2);
  await lengths.nth(0).fill("5000");
  await lengths.nth(1).fill("3000");
  await page.getByRole("spinbutton", { name: /^Profundidade inicial mm$/ }).fill("0");
  await page.getByRole("spinbutton", { name: /^Profundidade final mm$/ }).fill("1400");
  await page.getByRole("spinbutton", { name: /^Profundidade d'água mm$/ }).fill("1400");
  await expect(page.getByRole("textbox", { name: /^Inclinação \/ comprimento real$/ })).toHaveValue(/28\.00%/);

  await page.getByRole("button", { name: "Calcular e salvar revisão" }).click();
  const results = page.locator(".results-panel");
  await expect(results.getByText("Com praia inclinada", { exact: true })).toBeVisible();
  await expect(results.getByText(/0 → 1\.400 mm/)).toBeVisible();
  await expect(results.getByText(/28%/).first()).toBeVisible();
  await expect(results.getByRole("heading", { name: "Laje inclinada — Praia" })).toBeVisible();
  await expect(results.getByText(/pressão uniforme equivalente/i).first()).toBeVisible();
  await expect(results.getByRole("heading", { name: /^Degrau/ })).toHaveCount(0);

  const drawingDownloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar prancha SVG" }).click();
  const drawingDownload = await drawingDownloadPromise;
  const drawingPath = await drawingDownload.path();
  expect(drawingPath).not.toBeNull();
  const drawing = await readFile(drawingPath!, "utf8");
  expect(drawing).toContain("praia inclinada ativa");
  expect(drawing).toContain("28.00%");
});

test("mantém projetos de navegação separados e permite arquivamento", async ({ page }) => {
  for (const name of ["Piscina Norte", "Piscina Sul"]) {
    await createProject(page, name);
  }

  await page.getByRole("navigation").getByRole("button", { name: /^Piscina Norte / }).click();
  await expect(page.getByRole("heading", { name: "Piscina Norte" })).toBeVisible();
  await page.getByRole("button", { name: "Arquivar Piscina Norte" }).click();
  await expect(page.getByRole("navigation").getByRole("button", { name: /^Piscina Norte / })).toHaveCount(0);
  await expect(page.getByRole("navigation").getByRole("button", { name: /^Piscina Sul / })).toBeVisible();
});

test("correlaciona falha de cálculo sem vazar mensagem interna", async ({ page }) => {
  await createProject(page, "Piscina Inválida");
  await page.getByText("Parâmetros de detalhamento", { exact: true }).click();
  await page.getByRole("spinbutton", { name: /Fator de altura efetiva/ }).fill("0");
  await page.getByRole("button", { name: "Calcular e salvar revisão" }).click();

  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Não foi possível executar o cálculo.");
  await expect(alert).toContainText(/Código do incidente: [0-9a-f-]{36}/);
  await expect(alert).not.toContainText("effectiveHeightFactor");

  const events = await page.evaluate(() => localStorage.getItem("poolstruct:operational-events"));
  expect(events).toContain("calculation_or_save_failed");
  expect(events).not.toContain("effectiveHeightFactor");
});
