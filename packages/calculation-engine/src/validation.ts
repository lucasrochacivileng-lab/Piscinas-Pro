import type { CalculationError, NormativeProfile, PoolGeometryInput } from "./types.js";

const LIMITS_MM: Readonly<Record<keyof PoolGeometryInput, readonly [number, number]>> = {
  internalLengthMm: [100, 100_000],
  internalWidthMm: [100, 100_000],
  waterDepthMm: [100, 20_000],
  wallThicknessMm: [50, 5_000],
  slabThicknessMm: [50, 5_000]
};

export function validateGeometry(input: PoolGeometryInput): CalculationError[] {
  const errors: CalculationError[] = [];

  for (const field of Object.keys(LIMITS_MM) as (keyof PoolGeometryInput)[]) {
    const value = input[field];
    const [minimum, maximum] = LIMITS_MM[field];

    if (!Number.isFinite(value)) {
      errors.push({ field, code: "NOT_FINITE", message: `${field} deve ser um numero finito.` });
    } else if (value < minimum || value > maximum) {
      errors.push({
        field,
        code: "OUT_OF_RANGE",
        message: `${field} deve estar entre ${minimum} mm e ${maximum} mm.`
      });
    }
  }

  return errors;
}

export function validateProfile(profile: NormativeProfile): CalculationError[] {
  if (
    profile.id.trim() === "" ||
    profile.version.trim() === "" ||
    !Number.isFinite(profile.waterUnitWeightKNM3) ||
    profile.waterUnitWeightKNM3 <= 0
  ) {
    return [{
      field: "profile",
      code: "INVALID_PROFILE",
      message: "O perfil deve ter identificacao, versao e peso especifico da agua positivo."
    }];
  }

  return [];
}

