import type { ProjectRecord, RevisionRecord } from "../models";

// Exportacao DXF R12 em ASCII: planta e corte da piscina como base CAD
// vetorial, em milimetros reais, sem dependencia de AutoCAD ou bibliotecas.

const num = (value: number): string => (Math.round(value * 100) / 100).toFixed(2);

function line(layer: string, x1: number, y1: number, x2: number, y2: number): string {
  return [
    "0", "LINE", "8", layer,
    "10", num(x1), "20", num(y1), "30", "0",
    "11", num(x2), "21", num(y2), "31", "0"
  ].join("\n");
}

function rect(layer: string, x: number, y: number, width: number, height: number): string {
  return [
    line(layer, x, y, x + width, y),
    line(layer, x + width, y, x + width, y + height),
    line(layer, x + width, y + height, x, y + height),
    line(layer, x, y + height, x, y)
  ].join("\n");
}

function text(layer: string, x: number, y: number, heightMm: number, value: string): string {
  const sanitized = value.replace(/[\r\n]+/g, " ");
  return ["0", "TEXT", "8", layer, "10", num(x), "20", num(y), "30", "0", "40", num(heightMm), "1", sanitized].join("\n");
}

export function buildTechnicalDrawingDxf(project: ProjectRecord, revision: RevisionRecord): string {
  const { internalLengthMm: length, internalWidthMm: width, waterDepthMm: depth, wallThicknessMm: wall, slabThicknessMm: slab } =
    revision.input.geometry;
  const outerLength = length + 2 * wall;
  const outerWidth = width + 2 * wall;

  const entities: string[] = [];

  // Planta (origem 0,0, Y para cima).
  entities.push(text("TEXTO", 0, outerWidth + 400, 120, "PLANTA DE FORMAS"));
  entities.push(rect("PAREDE", 0, 0, outerLength, outerWidth));
  entities.push(rect("AGUA", wall, wall, length, width));
  entities.push(text("COTAS", length / 2, -180, 90, `${outerLength.toFixed(0)} mm`));
  entities.push(text("COTAS", -260, width / 2, 90, `${outerWidth.toFixed(0)} mm`));

  // Corte A-A abaixo da planta.
  const sectionTop = -(outerWidth + 1_600);
  const baseY = sectionTop;
  entities.push(text("TEXTO", 0, baseY + depth + slab + 300, 120, "CORTE A-A"));
  // Laje de fundo.
  entities.push(rect("PAREDE", 0, baseY, outerLength, slab));
  // Paredes laterais.
  entities.push(rect("PAREDE", 0, baseY + slab, wall, depth));
  entities.push(rect("PAREDE", outerLength - wall, baseY + slab, wall, depth));
  // Lamina d'agua.
  entities.push(rect("AGUA", wall, baseY + slab, length, depth));
  entities.push(text("NIVEL", outerLength + 200, baseY + slab + depth, 90, "N.A. +-0,00"));
  entities.push(text("NIVEL", outerLength + 200, baseY + slab, 90, `FUNDO -${(depth / 1_000).toFixed(2)}`));
  entities.push(text("COTAS", outerLength / 2, baseY - 200, 90, `${length.toFixed(0)} mm`));

  // Carimbo textual.
  const stampY = baseY - 900;
  entities.push(text("CARIMBO", 0, stampY + 200, 110, `POOLSTRUCT - ${project.name}`));
  entities.push(text("CARIMBO", 0, stampY, 90, `Revisao R${revision.revisionNumber} - ${project.location || "Local nao informado"}`));
  entities.push(
    text(
      "CARIMBO",
      0,
      stampY - 200,
      80,
      `Motor ${revision.result.engineVersion} - Status ${revision.result.overallStatus} - PRE-DIMENSIONAMENTO ACADEMICO`
    )
  );

  return [
    "0", "SECTION", "2", "HEADER",
    "9", "$INSUNITS", "70", "4", // milimetros
    "0", "ENDSEC",
    "0", "SECTION", "2", "ENTITIES",
    entities.join("\n"),
    "0", "ENDSEC",
    "0", "EOF", ""
  ].join("\n");
}

export function drawingDxfMimeType(): string {
  return "image/vnd.dxf";
}
