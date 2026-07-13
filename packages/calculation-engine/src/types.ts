export interface PoolGeometryInput {
  readonly internalLengthMm: number;
  readonly internalWidthMm: number;
  readonly waterDepthMm: number;
  readonly wallThicknessMm: number;
  readonly slabThicknessMm: number;
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

export interface HydrostaticResult {
  readonly waterVolumeM3: number;
  readonly approximateCapacityLitres: number;
  readonly maximumWallPressureKPa: number;
  readonly wallResultantKNPerM: number;
  readonly wallBaseMomentKNMPerM: number;
  readonly floorPressureKPa: number;
  readonly trace: readonly TraceStep[];
  readonly warnings: readonly string[];
}

export interface CalculationError {
  readonly field: keyof PoolGeometryInput | "profile";
  readonly code: "NOT_FINITE" | "OUT_OF_RANGE" | "INVALID_PROFILE";
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
  readonly code: "NOT_FINITE" | "OUT_OF_RANGE" | "INVALID_PROFILE" | "UNSUPPORTED_RATIO";
  readonly message: string;
}

export type WallPanelOutcome =
  | { readonly ok: true; readonly value: WallPanelResult }
  | { readonly ok: false; readonly errors: readonly WallPanelError[] };

export type CalculationOutcome =
  | { readonly ok: true; readonly value: HydrostaticResult }
  | { readonly ok: false; readonly errors: readonly CalculationError[] };
