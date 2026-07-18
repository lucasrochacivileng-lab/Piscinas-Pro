import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const minimalPdf = Buffer.from(`%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 800 600]>>endobj
trailer<</Root 1 0 R>>
%%EOF`);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto("/", { waitUntil: "domcontentloaded" });
});

test("importa PDF, calibra, orienta, mede e preserva o rascunho ao abrir histórico", async ({ page }) => {
  await page.getByRole("button", { name: "Novo projeto" }).click();
  const navigator = page.locator("aside.navigator");
  await navigator.getByLabel("Nome").fill("Piscina CAD Curva");
  await navigator.getByLabel("Local").fill("Senador Canedo - GO");
  await navigator.getByRole("button", { name: "Criar projeto" }).click();

  await expect(page.getByRole("heading", { name: "CAD 2D da piscina" })).toBeVisible();
  await page.locator(".cad-file-input").setInputFiles({
    name: "planta-piscina.pdf",
    mimeType: "application/pdf",
    buffer: minimalPdf
  });
  await expect(page.locator("object[aria-label='PDF de fundo']")).toHaveCount(1);

  const canvas = page.getByLabel("Prancheta CAD 2D");
  await page.getByRole("spinbutton", { name: "Distância real de calibração mm" }).fill("8000");
  await page.getByRole("button", { name: "Calibrar", exact: true }).click();
  await canvas.click({ position: { x: 120, y: 90 } });
  await canvas.click({ position: { x: 520, y: 90 } });
  await expect(page.getByText("CALIBRADO", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Contorno curvo", exact: true }).click();
  for (const position of [
    { x: 150, y: 150 }, { x: 500, y: 120 }, { x: 760, y: 260 },
    { x: 700, y: 520 }, { x: 350, y: 590 }, { x: 120, y: 380 }
  ]) {
    await canvas.click({ position });
  }
  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  await expect(page.locator(".cad-path.boundary")).toHaveCount(1);

  await page.getByRole("button", { name: "Eixo longitudinal", exact: true }).click();
  await canvas.click({ position: { x: 150, y: 330 } });
  await canvas.click({ position: { x: 700, y: 330 } });
  await expect(page.getByText("EIXO DEFINIDO", { exact: true })).toBeVisible();

  const depthInput = page.getByRole("spinbutton", { name: "Profundidade a inserir mm" });
  await page.locator(".cad-path-hit").first().click();
  await depthInput.focus();
  await depthInput.press("End");
  await depthInput.press("Backspace");
  await expect(page.locator(".cad-path.boundary")).toHaveCount(1);
  await depthInput.fill("1400");
  await page.getByRole("button", { name: "Profundidade", exact: true }).click();
  await canvas.click({ position: { x: 430, y: 350 } });

  const area = page.locator(".cad-metrics article").filter({ hasText: "Área interna" });
  const perimeter = page.locator(".cad-metrics article").filter({ hasText: "Perímetro" });
  await expect(area).not.toContainText("—");
  await expect(perimeter).not.toContainText("—");
  await expect(page.locator(".cad-metrics article").filter({ hasText: "Profundidade máxima válida" })).toContainText("1.400");

  await page.getByRole("button", { name: "Aplicar ao cálculo" }).click();
  await expect(page.getByText(/Dimensões orientadas e cotas vinculadas aplicadas/)).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar DXF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("piscina-cad-curva-geometria-cad.dxf");
  const path = await download.path();
  expect(path).not.toBeNull();
  const dxf = await readFile(path!, "utf8");
  expect(dxf).toContain("CONTORNO");
  expect(dxf).toContain("PROFUNDIDADE");
  expect(dxf).toContain("EIXO_LONGITUDINAL");

  await page.getByRole("button", { name: "Calcular e salvar revisão" }).click();
  await expect(page.getByRole("button", { name: /R1/ })).toBeVisible();
  await page.getByRole("button", { name: "Calcular e salvar revisão" }).click();
  await expect(page.getByRole("button", { name: /R2/ })).toBeVisible();

  await page.getByRole("button", { name: "Quebra reta", exact: true }).click();
  await canvas.click({ position: { x: 280, y: 270 } });
  await canvas.click({ position: { x: 590, y: 300 } });
  await page.getByRole("button", { name: "Finalizar", exact: true }).click();
  await expect(page.locator(".cad-path.breakline")).toHaveCount(1);

  await page.getByRole("button", { name: /R1/ }).click();
  await expect(page.getByText("REVISÃO HISTÓRICA", { exact: true })).toBeVisible();
  await expect(page.locator(".cad-path.breakline")).toHaveCount(1);
});
