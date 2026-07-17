import type { CalculationError, NormativeProfile, PoolGeometryInput } from "./types.js";

const LIMITS_MM = {
  internalLengthMm: [100, 100_000],
  internalWidthMm: [100, 100_000],
  waterDepthMm: [100, 20_000],
  wallThicknessMm: [50, 5_000],
  slabThicknessMm: [50, 5_000]
} as const;

type ScalarGeometryField = keyof typeof LIMITS_MM;

export function validateGeometry(input: PoolGeometryInput): CalculationError[] {
  const errors: CalculationError[] = [];

  for (const field of Object.keys(LIMITS_MM) as ScalarGeometryField[]) {
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

  const zones = input.depthZones;
  if (!zones || zones.length === 0) return errors;
  if (zones.length > 12) {
    errors.push({
      field: "depthZones",
      code: "INVALID_GEOMETRY",
      message: "A geometria admite no máximo 12 zonas de profundidade."
    });
    return errors;
  }

  const ids = new Set<string>();
  let totalLengthMm = 0;
  let maximumDepthMm = 0;
  zones.forEach((zone, index) => {
    const field = `depthZones.${index}` as const;
    if (zone.id.trim() === "" || zone.label.trim() === "") {
      errors.push({ field, code: "INVALID_GEOMETRY", message: `Zona ${index + 1} deve ter id e nome.` });
    }
    if (ids.has(zone.id)) {
      errors.push({ field, code: "INVALID_GEOMETRY", message: `Id de zona repetido: ${zone.id}.` });
    }
    ids.add(zone.id);
    if (!Number.isFinite(zone.lengthMm) || zone.lengthMm < 100 || zone.lengthMm > input.internalLengthMm) {
      errors.push({ field, code: "OUT_OF_RANGE", message: `Comprimento da zona ${zone.label || index + 1} deve ser válido e positivo.` });
    }
    if (!Number.isFinite(zone.waterDepthMm) || zone.waterDepthMm < 100 || zone.waterDepthMm > 20_000) {
      errors.push({ field, code: "OUT_OF_RANGE", message: `Profundidade da zona ${zone.label || index + 1} deve estar entre 100 e 20.000 mm.` });
    }
    totalLengthMm += zone.lengthMm;
    maximumDepthMm = Math.max(maximumDepthMm, zone.waterDepthMm);
  });

  if (Math.abs(totalLengthMm - input.internalLengthMm) > 1) {
    errors.push({
      field: "depthZones",
      code: "INVALID_GEOMETRY",
      message: `A soma dos comprimentos das zonas (${totalLengthMm} mm) deve coincidir com o comprimento interno (${input.internalLengthMm} mm).`
    });
  }
  if (Math.abs(maximumDepthMm - input.waterDepthMm) > 1) {
    errors.push({
      field: "waterDepthMm",
      code: "INVALID_GEOMETRY",
      message: `A profundidade máxima (${maximumDepthMm} mm) deve coincidir com waterDepthMm (${input.waterDepthMm} mm).`
    });
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
