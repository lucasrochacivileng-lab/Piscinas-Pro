import type {
  PoolDepthZoneInput,
  PoolDepthZoneKind,
  PoolGeometryInput
} from "./types.js";

export interface NormalizedDepthZone extends PoolDepthZoneInput {
  readonly startMm: number;
  readonly endMm: number;
  readonly index: number;
}

export type GeometricWallKind = "PERIMETER_LONG" | "PERIMETER_END" | "STEP";
export type GeometricWallSide = "NORTH" | "SOUTH" | "WEST" | "EAST" | "INTERNAL";

export interface GeometricWallPanel {
  readonly id: string;
  readonly label: string;
  readonly kind: GeometricWallKind;
  readonly side: GeometricWallSide;
  readonly lengthMm: number;
  readonly heightMm: number;
  readonly zoneId?: string;
  readonly fromZoneId?: string;
  readonly toZoneId?: string;
  readonly startMm?: number;
  readonly endMm?: number;
  readonly fromDepthMm?: number;
  readonly toDepthMm?: number;
}

export interface PoolStepTransition {
  readonly id: string;
  readonly positionMm: number;
  readonly fromZoneId: string;
  readonly toZoneId: string;
  readonly fromDepthMm: number;
  readonly toDepthMm: number;
  readonly heightMm: number;
}

export interface PoolGeometryModel {
  readonly internalLengthMm: number;
  readonly internalWidthMm: number;
  readonly zones: readonly NormalizedDepthZone[];
  readonly transitions: readonly PoolStepTransition[];
  readonly wallPanels: readonly GeometricWallPanel[];
  readonly maximumWaterDepthMm: number;
  readonly minimumWaterDepthMm: number;
  readonly hasMultipleDepths: boolean;
}

const legacyZone = (geometry: PoolGeometryInput): PoolDepthZoneInput => ({
  id: "main",
  label: "Fundo principal",
  kind: "MAIN",
  lengthMm: geometry.internalLengthMm,
  waterDepthMm: geometry.waterDepthMm
});

export function normalizePoolDepthZones(
  geometry: PoolGeometryInput
): readonly NormalizedDepthZone[] {
  const source = geometry.depthZones && geometry.depthZones.length > 0
    ? geometry.depthZones
    : [legacyZone(geometry)];
  let cursor = 0;
  return source.map((zone, index) => {
    const startMm = cursor;
    const endMm = startMm + zone.lengthMm;
    cursor = endMm;
    return { ...zone, startMm, endMm, index };
  });
}

export function maximumPoolDepthMm(geometry: PoolGeometryInput): number {
  return Math.max(...normalizePoolDepthZones(geometry).map((zone) => zone.waterDepthMm));
}

export function poolWaterVolumeM3(geometry: PoolGeometryInput): number {
  const widthM = geometry.internalWidthMm / 1_000;
  return normalizePoolDepthZones(geometry).reduce(
    (total, zone) => total + (zone.lengthMm / 1_000) * widthM * (zone.waterDepthMm / 1_000),
    0
  );
}

export function groundwaterHeadAboveZoneSlabBottomMm(
  geometry: PoolGeometryInput,
  groundwaterHeadAboveDeepestSlabBottomMm: number,
  zoneDepthMm: number
): number {
  const deepestBottomDepthMm = maximumPoolDepthMm(geometry) + geometry.slabThicknessMm;
  const groundwaterElevationDepthMm = deepestBottomDepthMm - groundwaterHeadAboveDeepestSlabBottomMm;
  const zoneBottomDepthMm = zoneDepthMm + geometry.slabThicknessMm;
  return Math.max(0, zoneBottomDepthMm - groundwaterElevationDepthMm);
}

export function buildPoolGeometryModel(geometry: PoolGeometryInput): PoolGeometryModel {
  const zones = normalizePoolDepthZones(geometry);
  const transitions: PoolStepTransition[] = [];
  const wallPanels: GeometricWallPanel[] = [];

  zones.forEach((zone, index) => {
    const first = index === 0;
    const last = index === zones.length - 1;
    const panelLengthMm = zone.lengthMm +
      (first ? geometry.wallThicknessMm : 0) +
      (last ? geometry.wallThicknessMm : 0);
    for (const side of ["NORTH", "SOUTH"] as const) {
      wallPanels.push({
        id: `${side.toLowerCase()}-${zone.id}`,
        label: `${side === "NORTH" ? "Parede norte" : "Parede sul"} — ${zone.label}`,
        kind: "PERIMETER_LONG",
        side,
        zoneId: zone.id,
        lengthMm: panelLengthMm,
        heightMm: zone.waterDepthMm,
        startMm: zone.startMm,
        endMm: zone.endMm
      });
    }
  });

  const firstZone = zones[0];
  const lastZone = zones.at(-1);
  if (firstZone && lastZone) {
    const endWallLengthMm = geometry.internalWidthMm + 2 * geometry.wallThicknessMm;
    wallPanels.push({
      id: "west-end",
      label: `Parede oeste — ${firstZone.label}`,
      kind: "PERIMETER_END",
      side: "WEST",
      zoneId: firstZone.id,
      lengthMm: endWallLengthMm,
      heightMm: firstZone.waterDepthMm
    });
    wallPanels.push({
      id: "east-end",
      label: `Parede leste — ${lastZone.label}`,
      kind: "PERIMETER_END",
      side: "EAST",
      zoneId: lastZone.id,
      lengthMm: endWallLengthMm,
      heightMm: lastZone.waterDepthMm
    });
  }

  for (let index = 1; index < zones.length; index += 1) {
    const from = zones[index - 1];
    const to = zones[index];
    if (!from || !to || from.waterDepthMm === to.waterDepthMm) continue;
    const transition: PoolStepTransition = {
      id: `step-${from.id}-${to.id}`,
      positionMm: to.startMm,
      fromZoneId: from.id,
      toZoneId: to.id,
      fromDepthMm: from.waterDepthMm,
      toDepthMm: to.waterDepthMm,
      heightMm: Math.abs(to.waterDepthMm - from.waterDepthMm)
    };
    transitions.push(transition);
    wallPanels.push({
      id: transition.id,
      label: `Degrau ${from.label} → ${to.label}`,
      kind: "STEP",
      side: "INTERNAL",
      lengthMm: geometry.internalWidthMm,
      heightMm: transition.heightMm,
      fromZoneId: from.id,
      toZoneId: to.id,
      startMm: transition.positionMm,
      endMm: transition.positionMm,
      fromDepthMm: transition.fromDepthMm,
      toDepthMm: transition.toDepthMm
    });
  }

  const depths = zones.map((zone) => zone.waterDepthMm);
  const maximumWaterDepthMm = Math.max(...depths);
  const minimumWaterDepthMm = Math.min(...depths);
  return {
    internalLengthMm: geometry.internalLengthMm,
    internalWidthMm: geometry.internalWidthMm,
    zones,
    transitions,
    wallPanels,
    maximumWaterDepthMm,
    minimumWaterDepthMm,
    hasMultipleDepths: zones.length > 1 || maximumWaterDepthMm !== minimumWaterDepthMm
  };
}

export function nextDepthZoneKind(index: number, total: number): PoolDepthZoneKind {
  if (index === 0 && total > 1) return "SHALLOW";
  if (index === total - 1) return "MAIN";
  return "INTERMEDIATE";
}
