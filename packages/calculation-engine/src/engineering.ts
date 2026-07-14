import type { TraceStep } from "./types.js";

export type CheckStatus = "PASS" | "FAIL" | "REQUIRES_REVIEW";

export interface EngineeringCheck {
  readonly id: string;
  readonly status: CheckStatus;
  readonly governing?: boolean;
  readonly demand?: number;
  readonly resistance?: number;
  readonly unit?: string;
  readonly message: string;
}

export interface BarLayout {
  readonly diameterMm: number;
  readonly spacingMm: number;
  readonly providedAreaMm2PerM: number;
  readonly requiredAreaMm2PerM: number;
}

export interface StructuralDesignProfile {
  readonly id: string;
  readonly version: string;
  readonly status: "draft" | "reviewed";
  readonly sourceKind: "academic" | "normative";
  readonly waterUnitWeightKNM3: number;
  readonly concreteUnitWeightKNM3: number;
  readonly concreteCharacteristicStrengthMPa: number;
  readonly actionFactor: number;
  readonly masonryResistanceFactor: number;
  readonly concreteResistanceFactor: number;
  readonly steelResistanceFactor: number;
  readonly steelYieldStrengthMPa: number;
  readonly minimumWallSteelRatio: number;
  readonly maximumWallBarSpacingThicknessFactor: number;
  readonly unreinforcedSlendernessLimit: number;
  readonly reinforcedSlendernessLimit: number;
  readonly masonryShearBaseMPa: number;
  readonly masonryShearRhoFactorMPa: number;
  readonly masonryShearMaximumMPa: number;
  readonly maximumMainSlabSpacingMm: number;
  readonly maximumMainSlabSpacingThicknessFactor: number;
  readonly masonryServiceabilityBoundary: readonly (readonly [number, number])[];
  readonly references: readonly string[];
}

export interface CalculationBundle<T> {
  readonly value: T;
  readonly checks: readonly EngineeringCheck[];
  readonly trace: readonly TraceStep[];
  readonly warnings: readonly string[];
}

export const barAreaMm2 = (diameterMm: number): number =>
  (Math.PI * diameterMm ** 2) / 4;

export function selectBarLayout(
  requiredAreaMm2PerM: number,
  diameterMm: number,
  maximumSpacingMm: number,
  spacingIncrementMm = 10
): BarLayout {
  if (
    !Number.isFinite(requiredAreaMm2PerM) ||
    !Number.isFinite(diameterMm) ||
    !Number.isFinite(maximumSpacingMm) ||
    requiredAreaMm2PerM <= 0 ||
    diameterMm <= 0 ||
    maximumSpacingMm <= 0 ||
    spacingIncrementMm <= 0
  ) {
    throw new RangeError("Entradas de detalhamento devem ser positivas e finitas.");
  }

  const area = barAreaMm2(diameterMm);
  const spacingByArea = (1_000 * area) / requiredAreaMm2PerM;
  const rawSpacing = Math.min(spacingByArea, maximumSpacingMm);
  const spacingMm = Math.max(
    spacingIncrementMm,
    Math.floor(rawSpacing / spacingIncrementMm) * spacingIncrementMm
  );

  return {
    diameterMm,
    spacingMm,
    providedAreaMm2PerM: (1_000 * area) / spacingMm,
    requiredAreaMm2PerM
  };
}

export function validateStructuralProfile(profile: StructuralDesignProfile): string[] {
  const positiveFields: readonly (keyof StructuralDesignProfile)[] = [
    "waterUnitWeightKNM3",
    "concreteUnitWeightKNM3",
    "concreteCharacteristicStrengthMPa",
    "actionFactor",
    "masonryResistanceFactor",
    "concreteResistanceFactor",
    "steelResistanceFactor",
    "steelYieldStrengthMPa",
    "minimumWallSteelRatio",
    "maximumWallBarSpacingThicknessFactor",
    "unreinforcedSlendernessLimit",
    "reinforcedSlendernessLimit",
    "masonryShearBaseMPa",
    "masonryShearRhoFactorMPa",
    "masonryShearMaximumMPa",
    "maximumMainSlabSpacingMm",
    "maximumMainSlabSpacingThicknessFactor"
  ];
  const errors: string[] = [];

  if (profile.id.trim() === "" || profile.version.trim() === "") {
    errors.push("O perfil estrutural deve ter id e versao.");
  }
  for (const field of positiveFields) {
    const value = profile[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      errors.push(`${field} deve ser positivo e finito.`);
    }
  }
  if (profile.minimumWallSteelRatio >= 1) {
    errors.push("minimumWallSteelRatio deve ser informado como fracao menor que 1.");
  }
  if (profile.masonryServiceabilityBoundary.length < 2) {
    errors.push("masonryServiceabilityBoundary deve conter ao menos dois pontos.");
  } else {
    profile.masonryServiceabilityBoundary.forEach((point, index) => {
      const previous = profile.masonryServiceabilityBoundary[index - 1];
      if (!Number.isFinite(point[0]) || !Number.isFinite(point[1]) || point[0] < 0 || point[1] <= 0) {
        errors.push(`Ponto ${index} do limite de ELS e invalido.`);
      }
      if (previous && point[0] <= previous[0]) {
        errors.push("Os pontos do limite de ELS devem ter abscissas crescentes.");
      }
    });
  }
  return errors;
}
