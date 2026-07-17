import type {
  PoolDepthZoneInput,
  PoolDepthZoneKind,
  PoolFloorProfile,
  PoolGeometryInput
} from "./types.js";

export interface NormalizedDepthZone extends PoolDepthZoneInput {
  readonly floorProfile: PoolFloorProfile;
  readonly startWaterDepthMm: number;
  readonly endWaterDepthMm: number;
  readonly averageWaterDepthMm: number;
  readonly maximumWaterDepthMm: number;
  readonly minimumWaterDepthMm: number;
  readonly verticalDropMm: number;
  readonly floorLengthMm: number;
  readonly slopePercent: number;
  readonly slopeAngleDegrees: number;
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
  /** Comprimento usado na análise estrutural. */
  readonly lengthMm: number;
  /** Altura máxima usada conservadoramente na análise. */
  readonly heightMm: number;
  /** Altura média usada no levantamento de área e materiais. */
  readonly quantityHeightMm?: number;
  readonly startHeightMm?: number;
  readonly endHeightMm?: number;
  readonly isSlopedSegment?: boolean;
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
  readonly hasSlopedFloor: boolean;
}

const MAX_SLOPED_WALL_SEGMENT_MM = 1_000;
const MIN_STRUCTURAL_WALL_HEIGHT_MM = 100;

const legacyZone = (geometry: PoolGeometryInput): PoolDepthZoneInput => ({
  id: "main",
  label: "Fundo principal",
  kind: "MAIN",
  lengthMm: geometry.internalLengthMm,
  waterDepthMm: geometry.waterDepthMm,
  floorProfile: "HORIZONTAL",
  startWaterDepthMm: geometry.waterDepthMm,
  endWaterDepthMm: geometry.waterDepthMm
});

const finiteDepth = (value: number | undefined, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const depthAt = (zone: NormalizedDepthZone, ratio: number): number =>
  zone.startWaterDepthMm + (zone.endWaterDepthMm - zone.startWaterDepthMm) * ratio;

export function normalizePoolDepthZones(
  geometry: PoolGeometryInput
): readonly NormalizedDepthZone[] {
  const source = geometry.depthZones && geometry.depthZones.length > 0
    ? geometry.depthZones
    : [legacyZone(geometry)];
  let cursor = 0;
  return source.map((zone, index) => {
    const floorProfile = zone.floorProfile ?? "HORIZONTAL";
    const legacyDepth = zone.waterDepthMm;
    const startWaterDepthMm = finiteDepth(zone.startWaterDepthMm, legacyDepth);
    const endWaterDepthMm = finiteDepth(zone.endWaterDepthMm, legacyDepth);
    const maximumWaterDepthMm = Math.max(startWaterDepthMm, endWaterDepthMm);
    const minimumWaterDepthMm = Math.min(startWaterDepthMm, endWaterDepthMm);
    const averageWaterDepthMm = (startWaterDepthMm + endWaterDepthMm) / 2;
    const verticalDropMm = endWaterDepthMm - startWaterDepthMm;
    const floorLengthMm = Math.hypot(zone.lengthMm, verticalDropMm);
    const slopePercent = zone.lengthMm > 0 ? Math.abs(verticalDropMm) / zone.lengthMm * 100 : 0;
    const slopeAngleDegrees = Math.atan2(Math.abs(verticalDropMm), zone.lengthMm) * 180 / Math.PI;
    const startMm = cursor;
    const endMm = startMm + zone.lengthMm;
    cursor = endMm;
    return {
      ...zone,
      floorProfile,
      waterDepthMm: maximumWaterDepthMm,
      startWaterDepthMm,
      endWaterDepthMm,
      averageWaterDepthMm,
      maximumWaterDepthMm,
      minimumWaterDepthMm,
      verticalDropMm,
      floorLengthMm,
      slopePercent,
      slopeAngleDegrees,
      startMm,
      endMm,
      index
    };
  });
}

export function maximumPoolDepthMm(geometry: PoolGeometryInput): number {
  return Math.max(...normalizePoolDepthZones(geometry).map((zone) => zone.maximumWaterDepthMm));
}

export function poolWaterVolumeM3(geometry: PoolGeometryInput): number {
  const widthM = geometry.internalWidthMm / 1_000;
  return normalizePoolDepthZones(geometry).reduce(
    (total, zone) => total + (zone.lengthMm / 1_000) * widthM * (zone.averageWaterDepthMm / 1_000),
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

function addLongWallPanels(
  geometry: PoolGeometryInput,
  zones: readonly NormalizedDepthZone[],
  wallPanels: GeometricWallPanel[]
): void {
  zones.forEach((zone, zoneIndex) => {
    const firstZone = zoneIndex === 0;
    const lastZone = zoneIndex === zones.length - 1;
    const sloped = zone.floorProfile === "SLOPED" && Math.abs(zone.verticalDropMm) > 1;
    const segmentCount = sloped ? Math.max(1, Math.ceil(zone.lengthMm / MAX_SLOPED_WALL_SEGMENT_MM)) : 1;

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const startRatio = segmentIndex / segmentCount;
      const endRatio = (segmentIndex + 1) / segmentCount;
      const startHeightMm = depthAt(zone, startRatio);
      const endHeightMm = depthAt(zone, endRatio);
      const segmentStartMm = zone.startMm + zone.lengthMm * startRatio;
      const segmentEndMm = zone.startMm + zone.lengthMm * endRatio;
      const segmentPlanLengthMm = segmentEndMm - segmentStartMm;
      const includeWestWall = firstZone && segmentIndex === 0;
      const includeEastWall = lastZone && segmentIndex === segmentCount - 1;
      const panelLengthMm = segmentPlanLengthMm +
        (includeWestWall ? geometry.wallThicknessMm : 0) +
        (includeEastWall ? geometry.wallThicknessMm : 0);
      const suffix = segmentCount > 1 ? ` — trecho ${segmentIndex + 1}/${segmentCount}` : "";

      for (const side of ["NORTH", "SOUTH"] as const) {
        wallPanels.push({
          id: `${side.toLowerCase()}-${zone.id}-${segmentIndex + 1}`,
          label: `${side === "NORTH" ? "Parede norte" : "Parede sul"} — ${zone.label}${suffix}`,
          kind: "PERIMETER_LONG",
          side,
          zoneId: zone.id,
          lengthMm: panelLengthMm,
          heightMm: Math.max(startHeightMm, endHeightMm),
          quantityHeightMm: (startHeightMm + endHeightMm) / 2,
          startHeightMm,
          endHeightMm,
          isSlopedSegment: sloped,
          startMm: segmentStartMm,
          endMm: segmentEndMm
        });
      }
    }
  });
}

export function buildPoolGeometryModel(geometry: PoolGeometryInput): PoolGeometryModel {
  const zones = normalizePoolDepthZones(geometry);
  const transitions: PoolStepTransition[] = [];
  const wallPanels: GeometricWallPanel[] = [];

  addLongWallPanels(geometry, zones, wallPanels);

  const firstZone = zones[0];
  const lastZone = zones.at(-1);
  if (firstZone && lastZone) {
    const endWallLengthMm = geometry.internalWidthMm + 2 * geometry.wallThicknessMm;
    if (firstZone.startWaterDepthMm >= MIN_STRUCTURAL_WALL_HEIGHT_MM) {
      wallPanels.push({
        id: "west-end",
        label: `Parede oeste — ${firstZone.label}`,
        kind: "PERIMETER_END",
        side: "WEST",
        zoneId: firstZone.id,
        lengthMm: endWallLengthMm,
        heightMm: firstZone.startWaterDepthMm,
        quantityHeightMm: firstZone.startWaterDepthMm
      });
    }
    if (lastZone.endWaterDepthMm >= MIN_STRUCTURAL_WALL_HEIGHT_MM) {
      wallPanels.push({
        id: "east-end",
        label: `Parede leste — ${lastZone.label}`,
        kind: "PERIMETER_END",
        side: "EAST",
        zoneId: lastZone.id,
        lengthMm: endWallLengthMm,
        heightMm: lastZone.endWaterDepthMm,
        quantityHeightMm: lastZone.endWaterDepthMm
      });
    }
  }

  for (let index = 1; index < zones.length; index += 1) {
    const from = zones[index - 1];
    const to = zones[index];
    if (!from || !to) continue;
    const fromDepthMm = from.endWaterDepthMm;
    const toDepthMm = to.startWaterDepthMm;
    if (Math.abs(fromDepthMm - toDepthMm) <= 1) continue;
    const transition: PoolStepTransition = {
      id: `step-${from.id}-${to.id}`,
      positionMm: to.startMm,
      fromZoneId: from.id,
      toZoneId: to.id,
      fromDepthMm,
      toDepthMm,
      heightMm: Math.abs(toDepthMm - fromDepthMm)
    };
    transitions.push(transition);
    wallPanels.push({
      id: transition.id,
      label: `Degrau ${from.label} → ${to.label}`,
      kind: "STEP",
      side: "INTERNAL",
      lengthMm: geometry.internalWidthMm,
      heightMm: transition.heightMm,
      quantityHeightMm: transition.heightMm,
      fromZoneId: from.id,
      toZoneId: to.id,
      startMm: transition.positionMm,
      endMm: transition.positionMm,
      fromDepthMm: transition.fromDepthMm,
      toDepthMm: transition.toDepthMm
    });
  }

  const maximumWaterDepthMm = Math.max(...zones.map((zone) => zone.maximumWaterDepthMm));
  const minimumWaterDepthMm = Math.min(...zones.map((zone) => zone.minimumWaterDepthMm));
  const hasSlopedFloor = zones.some((zone) => zone.floorProfile === "SLOPED" && Math.abs(zone.verticalDropMm) > 1);
  return {
    internalLengthMm: geometry.internalLengthMm,
    internalWidthMm: geometry.internalWidthMm,
    zones,
    transitions,
    wallPanels,
    maximumWaterDepthMm,
    minimumWaterDepthMm,
    hasMultipleDepths: zones.length > 1 || maximumWaterDepthMm !== minimumWaterDepthMm,
    hasSlopedFloor
  };
}

export function nextDepthZoneKind(index: number, total: number): PoolDepthZoneKind {
  if (index === 0 && total > 1) return "SHALLOW";
  if (index === total - 1) return "MAIN";
  return "INTERMEDIATE";
}
