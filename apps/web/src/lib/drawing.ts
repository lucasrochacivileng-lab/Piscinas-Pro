import type { Phase1DesignInput, Phase1DesignResult } from "@poolstruct/calculation-engine";
import type { ProjectRecord, RevisionRecord } from "./models";

export const DRAWING_SHEET = {
  widthMm: 420,
  heightMm: 297,
  designation: "PS-01",
  format: "A3"
} as const;

const escapeXml = (value: string): string => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&apos;", '"': "&quot;"
}[character] ?? character));

const mm = (value: number): string => new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0
}).format(value);

const metres = (value: number): string => new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(value / 1_000);

const bar = (diameterMm: number, spacingMm: number): string =>
  `Ø${mm(diameterMm)} c/${mm(spacingMm)} mm`;

const line = (x1: number, y1: number, x2: number, y2: number, className = "thin"): string =>
  `<line class="${className}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;

const text = (x: number, y: number, value: string, className = "label", anchor = "start"): string =>
  `<text class="${className}" x="${x}" y="${y}" text-anchor="${anchor}">${escapeXml(value)}</text>`;

function horizontalDimension(x1: number, x2: number, y: number, targetY: number, label: string): string {
  return `${line(x1, targetY, x1, y + 2, "extension")}${line(x2, targetY, x2, y + 2, "extension")}` +
    `<line class="dimension" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" marker-start="url(#arrow)" marker-end="url(#arrow)"/>` +
    text((x1 + x2) / 2, y - 1.8, label, "dimension-text", "middle");
}

function verticalDimension(x: number, y1: number, y2: number, targetX: number, label: string): string {
  const cy = (y1 + y2) / 2;
  return `${line(targetX, y1, x - 2, y1, "extension")}${line(targetX, y2, x - 2, y2, "extension")}` +
    `<line class="dimension" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" marker-start="url(#arrow)" marker-end="url(#arrow)"/>` +
    `<text class="dimension-text" x="${x - 2}" y="${cy}" text-anchor="middle" transform="rotate(-90 ${x - 2} ${cy})">${escapeXml(label)}</text>`;
}

function reinforcementLines(
  x: number,
  y: number,
  width: number,
  height: number,
  direction: "horizontal" | "vertical",
  physicalLengthMm: number,
  spacingMm: number
): string {
  const count = Math.max(2, Math.min(24, Math.ceil(physicalLengthMm / spacingMm) + 1));
  return Array.from({ length: count }, (_, index) => {
    const ratio = count === 1 ? 0 : index / (count - 1);
    return direction === "vertical"
      ? line(x + ratio * width, y, x + ratio * width, y + height, "rebar")
      : line(x, y + ratio * height, x + width, y + ratio * height, "rebar");
  }).join("");
}

function planView(input: Phase1DesignInput, result: Phase1DesignResult): string {
  const { internalLengthMm: length, internalWidthMm: width, wallThicknessMm: wall } = input.geometry;
  const outerLength = length + 2 * wall;
  const outerWidth = width + 2 * wall;
  const maxWidth = 190;
  const maxHeight = 94;
  const scale = Math.min(maxWidth / outerLength, maxHeight / outerWidth);
  const drawingWidth = outerLength * scale;
  const drawingHeight = outerWidth * scale;
  const wallDraw = wall * scale;
  const x = 21 + (200 - drawingWidth) / 2;
  const y = 31 + (94 - drawingHeight) / 2;
  const innerX = x + wallDraw;
  const innerY = y + wallDraw;
  const innerWidth = length * scale;
  const innerHeight = width * scale;

  return `<g id="planta" data-view="plan">${text(14, 18, "PLANTA DE FORMAS E ARMADURAS", "view-title")}` +
    text(14, 23, "Escala gráfica ajustada à prancha · cotas em mm", "note") +
    `<rect class="concrete" x="${x}" y="${y}" width="${drawingWidth}" height="${drawingHeight}"/>` +
    `<rect class="water" x="${innerX}" y="${innerY}" width="${innerWidth}" height="${innerHeight}"/>` +
    reinforcementLines(innerX, innerY, innerWidth, innerHeight, "vertical", length, result.slab.bottomX.layout.spacingMm) +
    reinforcementLines(innerX, innerY, innerWidth, innerHeight, "horizontal", width, result.slab.bottomY.layout.spacingMm) +
    `<path class="section-line" d="M ${x - 5} ${y + drawingHeight / 2} H ${x + drawingWidth + 5}" marker-start="url(#section)" marker-end="url(#section)"/>` +
    text(x - 7, y + drawingHeight / 2 - 2, "A", "section-text", "middle") +
    text(x + drawingWidth + 7, y + drawingHeight / 2 - 2, "A", "section-text", "middle") +
    horizontalDimension(innerX, innerX + innerWidth, y + drawingHeight + 11, y + drawingHeight, `${mm(length)}`) +
    horizontalDimension(x, x + drawingWidth, y + drawingHeight + 20, y + drawingHeight, `${mm(outerLength)}`) +
    verticalDimension(x - 10, innerY, innerY + innerHeight, x, `${mm(width)}`) +
    verticalDimension(x - 19, y, y + drawingHeight, x, `${mm(outerWidth)}`) +
    text(innerX + innerWidth / 2, innerY + innerHeight / 2 - 2, `LAJE INF. X: ${bar(result.slab.bottomX.layout.diameterMm, result.slab.bottomX.layout.spacingMm)}`, "callout", "middle") +
    text(innerX + innerWidth / 2, innerY + innerHeight / 2 + 3, `LAJE INF. Y: ${bar(result.slab.bottomY.layout.diameterMm, result.slab.bottomY.layout.spacingMm)}`, "callout", "middle") +
    `</g>`;
}

function sectionView(input: Phase1DesignInput, result: Phase1DesignResult): string {
  const { internalWidthMm: width, waterDepthMm: depth, wallThicknessMm: wall, slabThicknessMm: slab } = input.geometry;
  const scale = Math.min(170 / (width + 2 * wall), 62 / (depth + slab));
  const x = 39;
  const top = 166;
  const wallDraw = Math.max(3, wall * scale);
  const slabDraw = Math.max(4, slab * scale);
  const depthDraw = depth * scale;
  const innerWidth = width * scale;
  const floorY = top + depthDraw;
  const outsideWidth = innerWidth + 2 * wallDraw;

  return `<g id="corte-a-a" data-view="section">${text(14, 153, "CORTE A—A", "view-title")}` +
    `<rect class="hatch" x="${x}" y="${top}" width="${wallDraw}" height="${depthDraw + slabDraw}"/>` +
    `<rect class="hatch" x="${x + wallDraw + innerWidth}" y="${top}" width="${wallDraw}" height="${depthDraw + slabDraw}"/>` +
    `<rect class="hatch" x="${x}" y="${floorY}" width="${outsideWidth}" height="${slabDraw}"/>` +
    `<rect class="water" x="${x + wallDraw}" y="${top + 2}" width="${innerWidth}" height="${depthDraw - 2}"/>` +
    line(x + wallDraw, top + 2, x + wallDraw + innerWidth, top + 2, "water-line") +
    line(x + wallDraw / 2, top + 3, x + wallDraw / 2, floorY - 3, "rebar") +
    line(x + wallDraw + innerWidth + wallDraw / 2, top + 3, x + wallDraw + innerWidth + wallDraw / 2, floorY - 3, "rebar") +
    line(x + 3, floorY + slabDraw / 2, x + outsideWidth - 3, floorY + slabDraw / 2, "rebar") +
    verticalDimension(x - 12, top, floorY, x, `${mm(depth)}`) +
    verticalDimension(x - 21, top, floorY + slabDraw, x, `${mm(depth + slab)}`) +
    horizontalDimension(x + wallDraw, x + wallDraw + innerWidth, floorY + slabDraw + 10, floorY + slabDraw, `${mm(width)}`) +
    text(x + outsideWidth + 7, top + 2, "N.A. ±0,00", "level") +
    text(x + outsideWidth + 7, floorY, `FUNDO −${metres(depth)}`, "level") +
    text(x + outsideWidth + 7, floorY + slabDraw, `BASE −${metres(depth + slab)}`, "level") +
    text(x + outsideWidth / 2, floorY + slabDraw / 2 + 1, `LAJE h=${mm(slab)} mm`, "callout", "middle") +
    text(x + outsideWidth / 2, top + depthDraw / 2, "ÁGUA", "water-label", "middle") +
    `</g>`;
}

function wallElevation(input: Phase1DesignInput, result: Phase1DesignResult): string {
  const length = input.geometry.internalLengthMm + 2 * input.geometry.wallThicknessMm;
  const depth = input.geometry.waterDepthMm;
  const width = 150;
  const height = 55;
  const x = 254;
  const y = 32;
  const horizontal = result.longWall.design.parallel.layout;
  const vertical = result.longWall.design.perpendicular.layout;
  return `<g id="elevacao-parede-longa" data-view="wall-elevation">${text(248, 18, "ELEVAÇÃO — PAREDE LONGA", "view-title")}` +
    text(248, 23, "Armaduras esquemáticas · barras em células grauteadas", "note") +
    `<rect class="masonry" x="${x}" y="${y}" width="${width}" height="${height}"/>` +
    reinforcementLines(x + 2, y + 2, width - 4, height - 4, "horizontal", depth, horizontal.spacingMm) +
    reinforcementLines(x + 2, y + 2, width - 4, height - 4, "vertical", length, vertical.spacingMm) +
    horizontalDimension(x, x + width, y + height + 9, y + height, `${mm(length)}`) +
    verticalDimension(x - 8, y, y + height, x, `${mm(depth)}`) +
    text(x + width / 2, y + 19, `HORIZONTAL: ${bar(horizontal.diameterMm, horizontal.spacingMm)}`, "callout", "middle") +
    text(x + width / 2, y + 25, `VERTICAL: ${bar(vertical.diameterMm, vertical.spacingMm)}`, "callout", "middle") +
    `</g>`;
}

function reinforcementSchedule(result: Phase1DesignResult): string {
  const rows = [
    ["P1-H", "Parede longa · horizontal", result.longWall.design.parallel.layout],
    ["P1-V", "Parede longa · vertical", result.longWall.design.perpendicular.layout],
    ["P2-H", "Parede curta · horizontal", result.shortWall.design.parallel.layout],
    ["P2-V", "Parede curta · vertical", result.shortWall.design.perpendicular.layout],
    ["L-BX", "Laje inferior · X", result.slab.bottomX.layout],
    ["L-BY", "Laje inferior · Y", result.slab.bottomY.layout],
    ["L-TX", "Laje superior · X", result.slab.topX.layout],
    ["L-TY", "Laje superior · Y", result.slab.topY.layout]
  ] as const;
  const x = 248;
  const y = 109;
  const rowHeight = 10;
  const content = rows.map(([mark, description, layout], index) => {
    const rowY = y + 12 + index * rowHeight;
    return `${line(x, rowY, 412, rowY)}${text(x + 2, rowY + 6.5, mark, "table-text")}` +
      text(x + 22, rowY + 6.5, description, "table-text") +
      text(410, rowY + 6.5, bar(layout.diameterMm, layout.spacingMm), "table-text", "end");
  }).join("");
  return `<g id="quadro-armaduras" data-view="schedule">${text(x, y - 4, "QUADRO DE ARMADURAS", "view-title")}` +
    `<rect class="table-border" x="${x}" y="${y}" width="164" height="${12 + rows.length * rowHeight}"/>` +
    line(x + 20, y, x + 20, y + 12 + rows.length * rowHeight) +
    line(x + 111, y, x + 111, y + 12 + rows.length * rowHeight) +
    text(x + 2, y + 8, "MARCA", "table-header") + text(x + 22, y + 8, "POSIÇÃO", "table-header") +
    text(410, y + 8, "BITOLA / ESPAÇAMENTO", "table-header", "end") + content + `</g>`;
}

function titleBlock(project: ProjectRecord, revision: RevisionRecord): string {
  const x = 248;
  const y = 225;
  const width = 164;
  const height = 64;
  const date = new Date(revision.createdAt).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  return `<g id="carimbo" data-view="title-block"><rect class="title-border" x="${x}" y="${y}" width="${width}" height="${height}"/>` +
    text(x + 5, y + 10, "POOLSTRUCT", "brand-text") +
    text(x + 5, y + 16, "PRÉ-DIMENSIONAMENTO ESTRUTURAL DE PISCINA", "table-header") +
    line(x, y + 21, x + width, y + 21) +
    text(x + 4, y + 29, "PROJETO", "meta-label") + text(x + 28, y + 29, project.name, "meta-value") +
    text(x + 4, y + 36, "LOCAL", "meta-label") + text(x + 28, y + 36, project.location || "Não informado", "meta-value") +
    line(x, y + 41, x + width, y + 41) + line(x + 72, y + 41, x + 72, y + height) + line(x + 118, y + 41, x + 118, y + height) +
    text(x + 4, y + 48, "PRANCHA", "meta-label") + text(x + 4, y + 57, DRAWING_SHEET.designation, "meta-strong") +
    text(x + 76, y + 48, "REVISÃO / DATA", "meta-label") + text(x + 76, y + 57, `R${revision.revisionNumber} · ${date}`, "meta-strong") +
    text(x + 122, y + 48, "FORMATO", "meta-label") + text(x + 122, y + 57, DRAWING_SHEET.format, "meta-strong") +
    `</g>`;
}

export function buildTechnicalDrawingSvg(project: ProjectRecord, revision: RevisionRecord): string {
  const { input, result } = revision;
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297" role="img" aria-labelledby="sheet-title sheet-description" data-poolstruct-drawing="phase5-1.0.0">` +
    `<title id="sheet-title">Prancha estrutural ${escapeXml(project.name)} R${revision.revisionNumber}</title>` +
    `<desc id="sheet-description">Planta, corte, elevação e quadro de armaduras calculados pelo POOLSTRUCT.</desc>` +
    `<defs><marker id="arrow" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto-start-reverse"><path d="M0,0 L4,2 L0,4 Z" fill="#183231"/></marker>` +
    `<marker id="section" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#0c7772"/></marker>` +
    `<pattern id="concrete-pattern" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 5 L5 0" stroke="#aab9b7" stroke-width=".25"/></pattern>` +
    `<pattern id="masonry-pattern" width="12" height="6" patternUnits="userSpaceOnUse"><path d="M0 0H12M0 6H12M0 0V6M6 0V6" stroke="#b8c4c2" stroke-width=".25"/></pattern></defs>` +
    `<style>svg{background:#fff;font-family:Arial,sans-serif}.sheet-border,.title-border,.table-border{fill:none;stroke:#183231;stroke-width:.65}.thin,.extension{stroke:#183231;stroke-width:.35;fill:none}.extension{stroke-width:.2}.dimension{stroke:#183231;stroke-width:.3}.view-title{font-size:4px;font-weight:700;fill:#0d3432}.note{font-size:2.6px;fill:#667c79}.label,.callout,.level,.water-label{font-size:2.8px;fill:#183231}.callout{font-size:2.6px;font-weight:700}.level{font-size:2.7px}.water-label{fill:#167f9b;font-weight:700}.dimension-text,.section-text{font-size:2.7px;fill:#183231}.section-text{font-size:3.4px;font-weight:700;fill:#0c7772}.concrete{fill:#e6edeb;stroke:#183231;stroke-width:.65;fill-rule:evenodd}.hatch{fill:url(#concrete-pattern);stroke:#183231;stroke-width:.55}.masonry{fill:url(#masonry-pattern);stroke:#183231;stroke-width:.55}.water{fill:#d8f1f5;stroke:#2b91aa;stroke-width:.3}.water-line{stroke:#168aa5;stroke-width:.7}.rebar{stroke:#d28a14;stroke-width:.55}.section-line{stroke:#0c7772;stroke-width:.45;stroke-dasharray:5 2}.table-text{font-size:2.55px;fill:#183231}.table-header,.meta-label{font-size:2.25px;font-weight:700;fill:#526966}.brand-text{font-size:5.5px;font-weight:800;fill:#0c7772}.meta-value{font-size:3px;fill:#183231}.meta-strong{font-size:3.2px;font-weight:700;fill:#183231}.warning{font-size:3px;font-weight:700;fill:#9b2923}</style>` +
    `<rect class="sheet-border" x="8" y="8" width="404" height="281"/>` +
    planView(input, result) + sectionView(input, result) + wallElevation(input, result) +
    reinforcementSchedule(result) + titleBlock(project, revision) +
    text(14, 282, "PRÉ-DIMENSIONAMENTO ACADÊMICO — NÃO EXECUTAR SEM REVISÃO E RESPONSABILIDADE TÉCNICA", "warning") +
    text(14, 287, `Motor ${result.engineVersion} · Perfil ${result.profileId} v${result.profileVersion} · Status ${result.overallStatus}`, "note") +
    `</svg>`;
}

export function drawingFilename(project: ProjectRecord, revision: RevisionRecord): string {
  const slug = project.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "projeto";
  return `${slug}-r${revision.revisionNumber}-${DRAWING_SHEET.designation.toLowerCase()}.svg`;
}

export function downloadTechnicalDrawing(project: ProjectRecord, revision: RevisionRecord): void {
  const svg = buildTechnicalDrawingSvg(project, revision);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = drawingFilename(project, revision);
  link.click();
  URL.revokeObjectURL(url);
}
