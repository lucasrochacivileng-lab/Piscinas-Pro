import type {
  Phase1DesignInput,
  Phase1DesignResult,
  PoolDepthZoneInput
} from "@poolstruct/calculation-engine";
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
const mm = (value: number): string => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
const metres = (value: number): string => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 1_000);
const bar = (diameterMm: number, spacingMm: number): string => `Ø${mm(diameterMm)} c/${mm(spacingMm)} mm`;
const line = (x1: number, y1: number, x2: number, y2: number, className = "thin"): string => `<line class="${className}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const text = (x: number, y: number, value: string, className = "label", anchor = "start"): string => `<text class="${className}" x="${x}" y="${y}" text-anchor="${anchor}">${escapeXml(value)}</text>`;
const rect = (x: number, y: number, width: number, height: number, className: string): string => `<rect class="${className}" x="${x}" y="${y}" width="${width}" height="${height}"/>`;

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

function zonesFrom(input: Phase1DesignInput, result: Phase1DesignResult): readonly PoolDepthZoneInput[] {
  const resultZones = result.geometryModel?.zones;
  if (Array.isArray(resultZones) && resultZones.length > 0) return resultZones;
  const inputZones = input.geometry.depthZones;
  if (inputZones && inputZones.length > 0) return inputZones;
  return [{ id: "main", label: "Fundo principal", kind: "MAIN", lengthMm: input.geometry.internalLengthMm, waterDepthMm: input.geometry.waterDepthMm }];
}

function reinforcementLines(x: number, y: number, width: number, height: number, direction: "horizontal" | "vertical", physicalLengthMm: number, spacingMm: number): string {
  const count = Math.max(2, Math.min(20, Math.ceil(physicalLengthMm / spacingMm) + 1));
  return Array.from({ length: count }, (_, index) => {
    const ratio = index / (count - 1);
    return direction === "vertical"
      ? line(x + ratio * width, y, x + ratio * width, y + height, "rebar")
      : line(x, y + ratio * height, x + width, y + ratio * height, "rebar");
  }).join("");
}

function planView(input: Phase1DesignInput, result: Phase1DesignResult): string {
  const { internalLengthMm: length, internalWidthMm: width, wallThicknessMm: wall } = input.geometry;
  const zones = zonesFrom(input, result);
  const outerLength = length + 2 * wall;
  const outerWidth = width + 2 * wall;
  const scale = Math.min(190 / outerLength, 76 / outerWidth);
  const drawingWidth = outerLength * scale;
  const drawingHeight = outerWidth * scale;
  const wallDraw = wall * scale;
  const x = 19 + (196 - drawingWidth) / 2;
  const y = 32;
  const innerX = x + wallDraw;
  const innerY = y + wallDraw;
  const innerWidth = length * scale;
  const innerHeight = width * scale;
  let cursor = innerX;
  const zoneGraphics = zones.map((zone, index) => {
    const zoneWidth = zone.lengthMm * scale;
    const center = cursor + zoneWidth / 2;
    const boundary = index === 0 ? "" : line(cursor, innerY, cursor, innerY + innerHeight, "step-line");
    const label = text(center, innerY + innerHeight / 2 - 1, zone.label, "zone-label", "middle") +
      text(center, innerY + innerHeight / 2 + 4, `h=${mm(zone.waterDepthMm)} mm`, "zone-note", "middle");
    cursor += zoneWidth;
    return boundary + label;
  }).join("");
  const slabX = result.slabZones?.[0]?.design.bottomX ?? result.slab.bottomX;
  const slabY = result.slabZones?.[0]?.design.bottomY ?? result.slab.bottomY;
  return `<g id="planta" data-view="plan">${text(14, 18, "PLANTA DE FORMAS — ZONAS DE PROFUNDIDADE", "view-title")}` +
    text(14, 23, `${zones.length} zona(s) · cotas em mm`, "note") +
    rect(x, y, drawingWidth, drawingHeight, "concrete") + rect(innerX, innerY, innerWidth, innerHeight, "water") +
    reinforcementLines(innerX, innerY, innerWidth, innerHeight, "vertical", length, slabX.layout.spacingMm) +
    reinforcementLines(innerX, innerY, innerWidth, innerHeight, "horizontal", width, slabY.layout.spacingMm) +
    zoneGraphics +
    `<path class="section-line" d="M ${x - 4} ${y + drawingHeight / 2} H ${x + drawingWidth + 4}" marker-start="url(#section)" marker-end="url(#section)"/>` +
    text(x - 7, y + drawingHeight / 2 - 2, "A", "section-text", "middle") + text(x + drawingWidth + 7, y + drawingHeight / 2 - 2, "A", "section-text", "middle") +
    horizontalDimension(innerX, innerX + innerWidth, y + drawingHeight + 10, y + drawingHeight, mm(length)) +
    horizontalDimension(x, x + drawingWidth, y + drawingHeight + 19, y + drawingHeight, mm(outerLength)) +
    verticalDimension(x - 10, innerY, innerY + innerHeight, x, mm(width)) +
    text(innerX + innerWidth / 2, y + drawingHeight + 28, `LAJE: ${bar(slabX.layout.diameterMm, slabX.layout.spacingMm)} / ${bar(slabY.layout.diameterMm, slabY.layout.spacingMm)}`, "callout", "middle") + `</g>`;
}

function sectionView(input: Phase1DesignInput, result: Phase1DesignResult): string {
  const zones = zonesFrom(input, result);
  const { internalLengthMm: length, wallThicknessMm: wall, slabThicknessMm: slab } = input.geometry;
  const maxDepth = Math.max(...zones.map((zone) => zone.waterDepthMm));
  const horizontalScale = 188 / (length + 2 * wall);
  const verticalScale = 68 / (maxDepth + slab);
  const x = 20;
  const top = 153;
  const wallDraw = Math.max(3, wall * horizontalScale);
  const slabDraw = Math.max(3, slab * verticalScale);
  const innerX = x + wallDraw;
  const innerWidth = length * horizontalScale;
  const outerWidth = innerWidth + 2 * wallDraw;
  const bottom = top + maxDepth * verticalScale + slabDraw;
  let cursor = innerX;
  const zoneRects = zones.map((zone, index) => {
    const zoneWidth = zone.lengthMm * horizontalScale;
    const floorY = top + zone.waterDepthMm * verticalScale;
    const waterHeight = Math.max(1, floorY - top);
    const slabZone = result.slabZones?.[index];
    const zoneDrawing = rect(cursor, top, zoneWidth, waterHeight, "water") +
      rect(cursor, floorY, zoneWidth, slabDraw, "hatch") +
      text(cursor + zoneWidth / 2, floorY - 3, `${zone.label} · ${metres(zone.waterDepthMm)} m`, "zone-section-label", "middle") +
      (slabZone ? text(cursor + zoneWidth / 2, floorY + slabDraw / 2 + 1, bar(slabZone.design.bottomX.layout.diameterMm, slabZone.design.bottomX.layout.spacingMm), "tiny", "middle") : "");
    const step = index > 0 ? rect(cursor - 1.1, Math.min(top + (zones[index - 1]?.waterDepthMm ?? 0) * verticalScale, floorY), 2.2, Math.abs((zones[index - 1]?.waterDepthMm ?? 0) - zone.waterDepthMm) * verticalScale + slabDraw, "step-wall") : "";
    cursor += zoneWidth;
    return step + zoneDrawing;
  }).join("");
  return `<g id="corte-a-a" data-view="section">${text(14, 141, "CORTE LONGITUDINAL A—A", "view-title")}` +
    text(14, 146, "Perfil escalonado · prainha, fundos e paredes de degrau", "note") +
    rect(x, top, wallDraw, bottom - top, "hatch") + rect(x + outerWidth - wallDraw, top, wallDraw, bottom - top, "hatch") + zoneRects +
    line(innerX, top + 1, innerX + innerWidth, top + 1, "water-line") +
    verticalDimension(x - 10, top, top + maxDepth * verticalScale, x, mm(maxDepth)) +
    horizontalDimension(innerX, innerX + innerWidth, bottom + 10, bottom, mm(length)) +
    text(x + outerWidth + 5, top + 2, "N.A. ±0,00", "level") + text(x + outerWidth + 5, top + maxDepth * verticalScale, `FUNDO −${metres(maxDepth)}`, "level") + `</g>`;
}

function wallElevation(input: Phase1DesignInput, result: Phase1DesignResult): string {
  const panels = result.wallPanels ?? [];
  const wall = panels.length > 0
    ? panels.reduce((current, candidate) => candidate.heightMm > current.heightMm ? candidate : current)
    : null;
  const length = wall?.lengthMm ?? input.geometry.internalLengthMm + 2 * input.geometry.wallThicknessMm;
  const depth = wall?.heightMm ?? input.geometry.waterDepthMm;
  const horizontal = wall?.design.parallel.layout ?? result.longWall.design.parallel.layout;
  const vertical = wall?.design.perpendicular.layout ?? result.longWall.design.perpendicular.layout;
  const x = 248;
  const y = 31;
  const width = 158;
  const height = 50;
  const courseCount = result.masonry?.modulation.courseCount ?? Math.max(1, Math.ceil(depth / 200));
  const rowHeight = height / courseCount;
  const courses = Array.from({ length: courseCount }, (_, index) => {
    const rowY = y + index * rowHeight;
    const channel = index === 0 || index === courseCount - 1 ? rect(x, rowY, width, rowHeight, "channel-fill") : "";
    return channel + line(x, rowY, x + width, rowY, "block-joint");
  }).join("");
  return `<g id="elevacao-parede-longa" data-view="wall-elevation">${text(246, 18, "ELEVAÇÃO — PAINEL GOVERNANTE", "view-title")}` +
    text(246, 23, result.masonry ? `${result.masonry.family.label} · Classe ${result.masonry.blockClass} · ${courseCount} fiadas` : "Armadura esquemática", "note") +
    rect(x, y, width, height, "masonry") + courses +
    reinforcementLines(x + 2, y + 2, width - 4, height - 4, "horizontal", depth, horizontal.spacingMm) +
    reinforcementLines(x + 2, y + 2, width - 4, height - 4, "vertical", length, vertical.spacingMm) +
    text(x + width / 2, y + 19, `H: ${bar(horizontal.diameterMm, horizontal.spacingMm)}`, "callout", "middle") +
    text(x + width / 2, y + 25, `V: ${bar(vertical.diameterMm, vertical.spacingMm)}`, "callout", "middle") +
    horizontalDimension(x, x + width, y + height + 8, y + height, mm(length)) + `</g>`;
}

function reinforcementSchedule(result: Phase1DesignResult): string {
  const wallRows = (result.wallPanels ?? []).slice(0, 4).flatMap((wall, index) => [
    [`P${index + 1}H`, `${wall.label} H`, wall.design.parallel.layout] as const,
    [`P${index + 1}V`, `${wall.label} V`, wall.design.perpendicular.layout] as const
  ]);
  const rows = wallRows.length > 0 ? wallRows : [
    ["P1H", "Parede longa H", result.longWall.design.parallel.layout] as const,
    ["P1V", "Parede longa V", result.longWall.design.perpendicular.layout] as const,
    ["P2H", "Parede curta H", result.shortWall.design.parallel.layout] as const,
    ["P2V", "Parede curta V", result.shortWall.design.perpendicular.layout] as const
  ];
  const x = 248;
  const y = 102;
  const rowHeight = 8;
  const visibleRows = rows.slice(0, 8);
  const content = visibleRows.map(([mark, description, layout], index) => {
    const rowY = y + 10 + index * rowHeight;
    return line(x, rowY, 412, rowY) + text(x + 2, rowY + 5.5, mark, "table-text") +
      text(x + 18, rowY + 5.5, description.slice(0, 36), "table-text") +
      text(410, rowY + 5.5, bar(layout.diameterMm, layout.spacingMm), "table-text", "end");
  }).join("");
  return `<g id="quadro-armaduras" data-view="schedule">${text(x, y - 4, "QUADRO DE PAINÉIS", "view-title")}` +
    rect(x, y, 164, 10 + visibleRows.length * rowHeight, "table-border") +
    text(x + 2, y + 7, "MARCA", "table-header") + text(x + 18, y + 7, "PAINEL / DIREÇÃO", "table-header") +
    text(410, y + 7, "BITOLA / ESP.", "table-header", "end") + content +
    ((result.wallPanels?.length ?? 0) > 4 ? text(x, y + 15 + visibleRows.length * rowHeight, `Demais painéis: ${(result.wallPanels?.length ?? 0) - 4} — consultar memória`, "note") : "") + `</g>`;
}

function titleBlock(project: ProjectRecord, revision: RevisionRecord): string {
  const x = 248;
  const y = 225;
  const width = 164;
  const height = 64;
  const date = new Date(revision.createdAt).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  return `<g id="carimbo">${rect(x, y, width, height, "title-border")}` +
    text(x + 5, y + 10, "POOLSTRUCT", "brand-text") + text(x + 5, y + 16, "PRÉ-DIMENSIONAMENTO · GEOMETRIA ESCALONADA", "table-header") +
    line(x, y + 21, x + width, y + 21) + text(x + 4, y + 29, "PROJETO", "meta-label") + text(x + 28, y + 29, project.name, "meta-value") +
    text(x + 4, y + 36, "LOCAL", "meta-label") + text(x + 28, y + 36, project.location || "Não informado", "meta-value") +
    line(x, y + 41, x + width, y + 41) + line(x + 72, y + 41, x + 72, y + height) + line(x + 118, y + 41, x + 118, y + height) +
    text(x + 4, y + 48, "PRANCHA", "meta-label") + text(x + 4, y + 57, DRAWING_SHEET.designation, "meta-strong") +
    text(x + 76, y + 48, "REVISÃO / DATA", "meta-label") + text(x + 76, y + 57, `R${revision.revisionNumber} · ${date}`, "meta-strong") +
    text(x + 122, y + 48, "FORMATO", "meta-label") + text(x + 122, y + 57, DRAWING_SHEET.format, "meta-strong") + `</g>`;
}

export function buildTechnicalDrawingSvg(project: ProjectRecord, revision: RevisionRecord): string {
  const { input, result } = revision;
  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="420mm" height="297mm" viewBox="0 0 420 297" role="img" data-poolstruct-drawing="phase-geometry-2.0.0">` +
    `<title>Prancha estrutural ${escapeXml(project.name)} R${revision.revisionNumber}</title>` +
    `<defs><marker id="arrow" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto-start-reverse"><path d="M0,0 L4,2 L0,4 Z" fill="#183231"/></marker><marker id="section" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#0c7772"/></marker><pattern id="concrete-pattern" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 5 L5 0" stroke="#aab9b7" stroke-width=".25"/></pattern><pattern id="masonry-pattern" width="12" height="6" patternUnits="userSpaceOnUse"><path d="M0 0H12M0 6H12M0 0V6M6 0V6" stroke="#b8c4c2" stroke-width=".25"/></pattern></defs>` +
    `<style>svg{background:#fff;font-family:Arial,sans-serif}.sheet-border,.title-border,.table-border{fill:none;stroke:#183231;stroke-width:.65}.thin,.extension{stroke:#183231;stroke-width:.35;fill:none}.extension{stroke-width:.2}.dimension{stroke:#183231;stroke-width:.3}.view-title{font-size:4px;font-weight:700;fill:#0d3432}.note{font-size:2.5px;fill:#667c79}.label,.callout,.level{font-size:2.8px;fill:#183231}.callout{font-size:2.55px;font-weight:700}.dimension-text,.section-text{font-size:2.7px;fill:#183231}.section-text{font-size:3.4px;font-weight:700;fill:#0c7772}.concrete{fill:#e6edeb;stroke:#183231;stroke-width:.65}.hatch{fill:url(#concrete-pattern);stroke:#183231;stroke-width:.55}.masonry{fill:url(#masonry-pattern);stroke:#183231;stroke-width:.55}.channel-fill{fill:#e6c56a;fill-opacity:.55}.block-joint{stroke:#607b78;stroke-width:.25}.water{fill:#d8f1f5;stroke:#2b91aa;stroke-width:.3}.water-line{stroke:#168aa5;stroke-width:.7}.rebar{stroke:#d28a14;stroke-width:.45}.section-line{stroke:#0c7772;stroke-width:.45;stroke-dasharray:5 2}.step-line{stroke:#9b2923;stroke-width:.7;stroke-dasharray:2 1}.step-wall{fill:#efd0c7;stroke:#9b2923;stroke-width:.5}.zone-label,.zone-section-label{font-size:2.8px;font-weight:700;fill:#0d3432}.zone-note,.tiny{font-size:2.2px;fill:#526966}.table-text{font-size:2.35px;fill:#183231}.table-header,.meta-label{font-size:2.2px;font-weight:700;fill:#526966}.brand-text{font-size:5.5px;font-weight:800;fill:#0c7772}.meta-value{font-size:3px;fill:#183231}.meta-strong{font-size:3.2px;font-weight:700;fill:#183231}.warning{font-size:3px;font-weight:700;fill:#9b2923}</style>` +
    rect(8, 8, 404, 281, "sheet-border") + planView(input, result) + sectionView(input, result) + wallElevation(input, result) + reinforcementSchedule(result) + titleBlock(project, revision) +
    text(14, 282, "PRÉ-DIMENSIONAMENTO ACADÊMICO — NÃO EXECUTAR SEM REVISÃO E RESPONSABILIDADE TÉCNICA", "warning") +
    text(14, 287, `Motor ${result.engineVersion} · Perfil ${result.profileId} v${result.profileVersion} · Status ${result.overallStatus}`, "note") + `</svg>`;
}

export function drawingFilename(project: ProjectRecord, revision: RevisionRecord): string {
  const slug = project.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "projeto";
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
