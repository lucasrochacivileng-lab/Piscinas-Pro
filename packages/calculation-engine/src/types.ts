export type PoolDepthZoneKind = "SHALLOW" | "INTERMEDIATE" | "MAIN";

export interface PoolDepthZoneInput {
  readonly id: string;
  readonly label: string;
  readonly kind: PoolDepthZoneKind;
  readonly lengthMm: number;
  readonly waterDepthMm: number;
}

export interface PoolGeometryInput {
  readonly internalLengthMm: number;
  readonly internalWidthMm: number;
  /**
   * Profundidade máxima, mantida para compatibilidade com revisões legadas.
   * Quando depthZones é informado, deve coincidir com a maior profundidade.
   */
  readonly waterDepthMm: number;
  readonly wallThicknessMm: number;
  readonly slabThicknessMm: number;
  /** Zonas sequenciais no sentido do comprimento interno da piscina. */
  readonly depthZones?: readonly PoolDepthZoneInput[];
}

export interface NormativeProfile {
  readonly id: string;
  readonly version: string;
  readonly status: "draft" | "reviewed";
  readonly waterUnitWeightKNM3: number;
  readonly references: readonly string[];
}

export interface TraceStep {
  readonly id: string;
  readonly description: string;
  readonly equation: string;
  readonly substitutions: Readonly<Record<string, number>>;
  readonly result: number;
  readonly unit: string;
}

export interface HydrostaticZoneResult {
  readonly id: string;
  readonly label: string;
  readonly kind: PoolDepthZoneKind;
  readonly lengthMm: number;
  readonly waterDepthMm: number;
  readonly volumeM3: number;
  readonly floorPressureKPa: number;
}

export interface HydrostaticResult {
  readonly waterVolumeM3: number;
  readonly approximateCapacityLitres: number;
  readonly maximumWallPressureKPa: number;
  readonly wallResultantKNPerM: number;
  readonly wallBaseMomentKNMPerM: number;
  readonly floorPressureKPa: number;
  readonly maximumWaterDepthMm: number;
  readonly zones: readonly HydrostaticZoneResult[];
  readonly trace: readonly TraceStep[];
  readonly warnings: readonly string[];
}

export interface CalculationError {
  readonly field: keyof PoolGeometryInput | `depthZones.${number}` | "profile";
  readonly code: "NOT_FINITE" | "OUT_OF_RANGE" | "INVALID_PROFILE" | "INVALID_GEOMETRY";
  readonly message: string;
}

export interface WallPanelInput {
  readonly panelLengthMm: number;
  readonly panelHeightMm: number;
  readonly wallThicknessMm: number;
  readonly saturatedSoilUnitWeightKNM3: number;
  readonly soilFrictionAngleDegrees: number;
  readonly effectiveHeightFactor: number;
  readonly ultimateLoadFactor: number;
  readonly orthogonalityCoefficient: number;
}

export interface WallPanelResult {
  readonly analysisMethod: "TWO_WAY_TABLE" | "VERTICAL_CANTILEVER";
  readonly activeEarthPressureCoefficient: number;
  readonly maximumSoilPressureKPa: number;
  readonly maximumWaterPressureKPa: number;
  readonly governingCase: "FULL_POOL_WATER" | "EMPTY_POOL_SATURATED_SOIL";
  readonly governingMaximumPressureKPa: number;
  readonly governingAveragePressureKPa: number;
  readonly effectiveHeightM: number;
  readonly slendernessRatio: number;
  readonly heightToLengthRatio: number;
  readonly momentCoefficient: number;
  readonly designMomentParallelKNMPerM: number;
  readonly designMomentPerpendicularKNMPerM: number;
  readonly trace: readonly TraceStep[];
  readonly warnings: readonly string[];
}

export interface WallPanelError {
  readonly field: keyof WallPanelInput | "profile" | "heightToLengthRatio";
  readonly code: "NOT_FINITE" | "OUT_OF_RANGE" | "INVALID_PROFILE" | "INVALID_GEOMETRY" | "UNSUPPORTED_RATIO";
  readonly message: string;
}

export type WallPanelOutcome =
  | { readonly ok: true; readonly value: WallPanelResult }
  | { readonly ok: false; readonly errors: readonly WallPanelError[] };

export type CalculationOutcome =
  | { readonly ok: true; readonly value: HydrostaticResult }
  | { readonly ok: false; readonly errors: readonly CalculationError[] };
