import type { ExportBundle } from "./bundle";
import { createZip, type ZipEntry } from "./zip";

// Exportacao XLSX (OOXML) minima e deterministica, sem dependencias externas.
// Usa cadeias em linha (inlineStr) para dispensar a tabela de strings.

type Cell = string | number;

const escapeXml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
  }[character] ?? character));

const columnLetter = (index: number): string => {
  let letter = "";
  let value = index;
  do {
    letter = String.fromCharCode(65 + (value % 26)) + letter;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return letter;
};

function cellXml(reference: string, cell: Cell): string {
  if (typeof cell === "number" && Number.isFinite(cell)) {
    return `<c r="${reference}"><v>${cell}</v></c>`;
  }
  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(cell))}</t></is></c>`;
}

function sheetXml(rows: readonly (readonly Cell[])[]): string {
  const body = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, columnIndex) => cellXml(`${columnLetter(columnIndex)}${rowIndex + 1}`, cell))
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData>${body}</sheetData></worksheet>`
  );
}

function buildRows(bundle: ExportBundle): Cell[][] {
  const { project, revision, quantities, costs } = bundle;
  const rows: Cell[][] = [
    [`POOLSTRUCT - ${project.name}`],
    [`Revisao R${revision.revisionNumber}`, project.location || "Local nao informado"],
    [`Familia ${bundle.family.id}`, `Tabela ${bundle.priceTable.id}`, `Perdas ${quantities.wasteFactor}`],
    [],
    ["Material", "Quantidade", "Unidade", "Preco unit (BRL)", "Total (BRL)"]
  ];
  for (const item of costs.lines) {
    rows.push([item.label, Math.round(item.quantity * 1_000) / 1_000, item.unit, item.unitPriceBRL, item.totalBRL]);
  }
  rows.push([]);
  rows.push(["Perdas embutidas (BRL)", costs.wasteShareBRL]);
  rows.push(["Subtotal liquido (BRL)", costs.netBRL]);
  rows.push(["Total (BRL)", costs.totalBRL]);
  rows.push([]);
  rows.push(["Pre-dimensionamento academico. Custos ilustrativos; nao substituem cotacao ou projeto executivo."]);
  return rows;
}

export function buildQuantitiesXlsx(bundle: ExportBundle): Uint8Array {
  const encoder = new TextEncoder();
  const files: Record<string, string> = {
    "[Content_Types].xml":
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
      `</Types>`,
    "_rels/.rels":
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
      `</Relationships>`,
    "xl/workbook.xml":
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
      `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<sheets><sheet name="Quantitativos" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels":
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
      `</Relationships>`,
    "xl/worksheets/sheet1.xml": sheetXml(buildRows(bundle))
  };

  const entries: ZipEntry[] = Object.entries(files).map(([name, content]) => ({
    name,
    data: encoder.encode(content)
  }));
  return createZip(entries);
}
