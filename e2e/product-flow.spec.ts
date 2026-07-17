import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const unexpectedErrors = new WeakMap<Page, string[]>();

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
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await page.getByLabel("Nome").fill("Piscina E2E Alfa");
  await page.getByLabel("Local").fill("João Pessoa - PB");
  await page.getByRole("button", { name: "Criar projeto" }).click();

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
  expect(drawing).toContain("PLANTA DE FORMAS E ARMADURAS");
  expect(drawing).toContain("CORTE A—A");
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

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("navigation").getByRole("button", { name: /^Piscina E2E Alfa / }).click();
  await expect(page.getByRole("button", { name: /R1/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resultado estrutural" })).toBeVisible();
});

test("mantém projetos de navegação separados e permite arquivamento", async ({ page }) => {
  for (const name of ["Piscina Norte", "Piscina Sul"]) {
    await page.getByRole("button", { name: "Novo projeto" }).click();
    await page.getByLabel("Nome").fill(name);
    await page.getByRole("button", { name: "Criar projeto" }).click();
  }

  await page.getByRole("navigation").getByRole("button", { name: /^Piscina Norte / }).click();
  await expect(page.getByRole("heading", { name: "Piscina Norte" })).toBeVisible();
  await page.getByRole("button", { name: "Arquivar Piscina Norte" }).click();
  await expect(page.getByRole("navigation").getByRole("button", { name: /^Piscina Norte / })).toHaveCount(0);
  await expect(page.getByRole("navigation").getByRole("button", { name: /^Piscina Sul / })).toBeVisible();
});

test("correlaciona falha de cálculo sem vazar mensagem interna", async ({ page }) => {
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await page.getByLabel("Nome").fill("Piscina Inválida");
  await page.getByRole("button", { name: "Criar projeto" }).click();
  await page.getByRole("spinbutton", { name: /Lâmina d'água/ }).fill("0");
  await page.getByRole("button", { name: "Calcular e salvar revisão" }).click();

  const alert = page.getByRole("alert");
  await expect(alert).toContainText("Não foi possível executar o cálculo.");
  await expect(alert).toContainText(/Código do incidente: [0-9a-f-]{36}/);
  await expect(alert).not.toContainText("waterDepthMm");

  const events = await page.evaluate(() => localStorage.getItem("poolstruct:operational-events"));
  expect(events).toContain("calculation_or_save_failed");
  expect(events).not.toContain("waterDepthMm");
});
