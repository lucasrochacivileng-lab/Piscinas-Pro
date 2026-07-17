import {
  normalizePoolDepthZones,
  type NormalizedDepthZone
} from "@poolstruct/calculation-engine";
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

function zonesFrom(revision: RevisionRecord): readonly NormalizedDepthZone[] {
  const modelZones = revision.result.geometryModel?.zones;
  if (Array.isArray(modelZones) && modelZones.length > 0) return modelZones;
  return normalizePoolDepthZones(revision.input.geometry);
}

export function buildTechnicalDrawingDxf(project: ProjectRecord, revision: RevisionRecord): string {
  const { internalLengthMm: length, internalWidthMm: width, wallThicknessMm: wall, slabThicknessMm: slab } = revision.input.geometry;
  const zones = zonesFrom(revision);
  const maxDepth = Math.max(...zones.map((zone) => zone.maximumWaterDepthMm));
  const outerLength = length + 2 * wall;
  const outerWidth = width + 2 * wall;
  const entities: string[] = [];

  // Planta: perímetro, espelho d'água, limites das zonas e identificação.
  entities.push(text("TEXTO", 0, outerWidth + 500, 120, "PLANTA DE FORMAS - PERFIL LONGITUDINAL"));
  entities.push(rect("PAREDE", 0, 0, outerLength, outerWidth));
  entities.push(rect("AGUA", wall, wall, length, width));
  let planCursor = wall;
  zones.forEach((zone, index) => {
    if (index > 0) entities.push(line("TRANSICAO", planCursor, wall, planCursor, wall + width));
    const zoneText = zone.floorProfile === "SLOPED"
      ? `${zone.label} - h=${zone.startWaterDepthMm.toFixed(0)}>${zone.endWaterDepthMm.toFixed(0)} mm - i=${zone.slopePercent.toFixed(2)}%`
      : `${zone.label} - h=${zone.waterDepthMm.toFixed(0)} mm`;
    entities.push(text("ZONAS", planCursor + zone.lengthMm / 2, wall + width / 2, 90, zoneText));
    planCursor += zone.lengthMm;
  });
  entities.push(text("COTAS", outerLength / 2, -180, 90, `${outerLength.toFixed(0)} mm`));
  entities.push(text("COTAS", -260, outerWidth / 2, 90, `${outerWidth.toFixed(0)} mm`));

  // Corte longitudinal A-A abaixo da planta, com fundo horizontal, escalonado ou inclinado.
  const waterLevelY = -(outerWidth + 1_500);
  const sectionBaseY = waterLevelY - maxDepth - slab;
  entities.push(text("TEXTO", 0, waterLevelY + 350, 120, revision.result.geometryModel?.hasSlopedFloor
    ? "CORTE LONGITUDINAL A-A - PRAIA INCLINADA"
    : "CORTE LONGITUDINAL A-A - PERFIL ESCALONADO"));
  entities.push(line("NIVEL", wall, waterLevelY, wall + length, waterLevelY));
  entities.push(rect("PAREDE", 0, waterLevelY - maxDepth - slab, wall, maxDepth + slab));
  entities.push(rect("PAREDE", wall + length, waterLevelY - maxDepth - slab, wall, maxDepth + slab));

  let sectionCursor = wall;
  zones.forEach((zone, index) => {
    const x1 = sectionCursor;
    const x2 = sectionCursor + zone.lengthMm;
    const startFloorY = waterLevelY - zone.startWaterDepthMm;
    const endFloorY = waterLevelY - zone.endWaterDepthMm;
    entities.push(line("LAJE", x1, startFloorY, x2, endFloorY));
    entities.push(line("LAJE", x1, startFloorY - slab, x2, endFloorY - slab));
    entities.push(line("LAJE", x1, startFloorY, x1, startFloorY - slab));
    entities.push(line("LAJE", x2, endFloorY, x2, endFloorY - slab));
    entities.push(line("AGUA", x1, waterLevelY, x2, waterLevelY));
    const zoneText = zone.floorProfile === "SLOPED"
      ? `${zone.label} - ${zone.startWaterDepthMm.toFixed(0)}>${zone.endWaterDepthMm.toFixed(0)} mm - i=${zone.slopePercent.toFixed(2)}% - Lreal=${zone.floorLengthMm.toFixed(0)} mm`
      : `${zone.label} - fundo -${(zone.waterDepthMm / 1_000).toFixed(2)} m`;
    entities.push(text("ZONAS", (x1 + x2) / 2, (startFloorY + endFloorY) / 2 + 120, 80, zoneText));
    if (index > 0) {
      const previous = zones[index - 1];
      if (previous) {
        const previousFloorY = waterLevelY - previous.endWaterDepthMm;
        const stepHeight = Math.abs(previous.endWaterDepthMm - zone.startWaterDepthMm);
        if (stepHeight > 1) {
          entities.push(rect("DEGRAU", x1 - wall / 2, Math.min(previousFloorY, startFloorY) - slab, wall, Math.abs(previousFloorY - startFloorY) + slab));
          entities.push(text("DEGRAU", x1 + 100, (previousFloorY + startFloorY) / 2, 70, `DEGRAU ${stepHeight.toFixed(0)} mm`));
        }
      }
    }
    sectionCursor = x2;
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
  entities.push(text("CARIMBO", 0, stampY - 200, 80, `Motor ${revision.result.engineVersion} - Status ${revision.result.overallStatus} - PRE-DIMENSIONAMENTO`));

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
