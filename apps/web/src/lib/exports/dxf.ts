import type { PoolDepthZoneInput } from "@poolstruct/calculation-engine";
import type { ProjectRecord, RevisionRecord } from "../models";

// Exportação DXF R12 ASCII em milímetros reais, sem dependência de AutoCAD.
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

function zonesFrom(revision: RevisionRecord): readonly PoolDepthZoneInput[] {
  const modelZones = revision.result.geometryModel?.zones;
  if (Array.isArray(modelZones) && modelZones.length > 0) return modelZones;
  const inputZones = revision.input.geometry.depthZones;
  if (inputZones && inputZones.length > 0) return inputZones;
  return [{
    id: "main",
    label: "Fundo principal",
    kind: "MAIN",
    lengthMm: revision.input.geometry.internalLengthMm,
    waterDepthMm: revision.input.geometry.waterDepthMm
  }];
}

export function buildTechnicalDrawingDxf(project: ProjectRecord, revision: RevisionRecord): string {
  const { internalLengthMm: length, internalWidthMm: width, wallThicknessMm: wall, slabThicknessMm: slab } = revision.input.geometry;
  const zones = zonesFrom(revision);
  const maxDepth = Math.max(...zones.map((zone) => zone.waterDepthMm));
  const outerLength = length + 2 * wall;
  const outerWidth = width + 2 * wall;
  const entities: string[] = [];

  // Planta: perímetro, espelho d'água, limites das zonas e identificação.
  entities.push(text("TEXTO", 0, outerWidth + 500, 120, "PLANTA DE FORMAS - ZONAS DE PROFUNDIDADE"));
  entities.push(rect("PAREDE", 0, 0, outerLength, outerWidth));
  entities.push(rect("AGUA", wall, wall, length, width));
  let planCursor = wall;
  zones.forEach((zone, index) => {
    if (index > 0) entities.push(line("DEGRAU", planCursor, wall, planCursor, wall + width));
    entities.push(text("ZONAS", planCursor + zone.lengthMm / 2, wall + width / 2, 90, `${zone.label} - h=${zone.waterDepthMm.toFixed(0)} mm`));
    planCursor += zone.lengthMm;
  });
  entities.push(text("COTAS", outerLength / 2, -180, 90, `${outerLength.toFixed(0)} mm`));
  entities.push(text("COTAS", -260, outerWidth / 2, 90, `${outerWidth.toFixed(0)} mm`));

  // Corte longitudinal A-A abaixo da planta. N.A. comum e fundo escalonado.
  const waterLevelY = -(outerWidth + 1_500);
  const sectionBaseY = waterLevelY - maxDepth - slab;
  entities.push(text("TEXTO", 0, waterLevelY + 350, 120, "CORTE LONGITUDINAL A-A - PERFIL ESCALONADO"));
  entities.push(line("NIVEL", wall, waterLevelY, wall + length, waterLevelY));
  entities.push(rect("PAREDE", 0, waterLevelY - maxDepth - slab, wall, maxDepth + slab));
  entities.push(rect("PAREDE", wall + length, waterLevelY - maxDepth - slab, wall, maxDepth + slab));

  let sectionCursor = wall;
  zones.forEach((zone, index) => {
    const floorTopY = waterLevelY - zone.waterDepthMm;
    entities.push(rect("LAJE", sectionCursor, floorTopY - slab, zone.lengthMm, slab));
    entities.push(line("AGUA", sectionCursor, waterLevelY, sectionCursor + zone.lengthMm, waterLevelY));
    entities.push(text("ZONAS", sectionCursor + zone.lengthMm / 2, floorTopY + 120, 80, `${zone.label} - fundo -${(zone.waterDepthMm / 1_000).toFixed(2)} m`));
    if (index > 0) {
      const previous = zones[index - 1];
      if (previous) {
        const previousFloorY = waterLevelY - previous.waterDepthMm;
        entities.push(rect("DEGRAU", sectionCursor - wall / 2, Math.min(previousFloorY, floorTopY) - slab, wall, Math.abs(previousFloorY - floorTopY) + slab));
        entities.push(text("DEGRAU", sectionCursor + 100, (previousFloorY + floorTopY) / 2, 70, `DEGRAU ${Math.abs(zone.waterDepthMm - previous.waterDepthMm).toFixed(0)} mm`));
      }
    }
    sectionCursor += zone.lengthMm;
  });
  entities.push(text("NIVEL", outerLength + 200, waterLevelY, 90, "N.A. +-0,00"));
  entities.push(text("NIVEL", outerLength + 200, waterLevelY - maxDepth, 90, `FUNDO MAX -${(maxDepth / 1_000).toFixed(2)}`));
  entities.push(text("COTAS", outerLength / 2, sectionBaseY - 200, 90, `${length.toFixed(0)} mm`));

  // Relação de painéis individualizados.
  const wallPanels = revision.result.wallPanels ?? [];
  const scheduleX = outerLength + 1_400;
  let scheduleY = waterLevelY;
  entities.push(text("TEXTO", scheduleX, scheduleY + 350, 110, "PAINEIS INDIVIDUALIZADOS"));
  wallPanels.forEach((panel, index) => {
    const horizontal = panel.design.parallel.layout;
    const vertical = panel.design.perpendicular.layout;
    entities.push(text("ARMADURA", scheduleX, scheduleY - index * 180, 70, `${panel.id}: ${panel.lengthMm.toFixed(0)}x${panel.heightMm.toFixed(0)} - H D${horizontal.diameterMm} c/${horizontal.spacingMm} - V D${vertical.diameterMm} c/${vertical.spacingMm}`));
  });

  const stampY = sectionBaseY - 900;
  entities.push(text("CARIMBO", 0, stampY + 200, 110, `POOLSTRUCT - ${project.name}`));
  entities.push(text("CARIMBO", 0, stampY, 90, `Revisao R${revision.revisionNumber} - ${project.location || "Local nao informado"}`));
  entities.push(text("CARIMBO", 0, stampY - 200, 80, `Motor ${revision.result.engineVersion} - Status ${revision.result.overallStatus} - PRE-DIMENSIONAMENTO ACADEMICO`));

  return [
    "0", "SECTION", "2", "HEADER",
    "9", "$INSUNITS", "70", "4",
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
