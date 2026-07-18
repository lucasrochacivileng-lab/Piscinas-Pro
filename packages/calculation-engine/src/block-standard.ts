export type ConcreteBlockClass = "A" | "B" | "C";

export interface ConcreteBlockStrengthRule {
  readonly blockClass: ConcreteBlockClass;
  readonly minimumMPa: number;
  readonly maximumMPa?: number;
  readonly incrementMPa: number;
  readonly belowGradePermitted: boolean;
}

export interface ConcreteBlockStrengthValidation {
  readonly valid: boolean;
  readonly rule: ConcreteBlockStrengthRule;
  readonly message: string;
}

export interface NominalBlockFamilyDimensions {
  readonly id: string;
  readonly moduleCm: number;
  readonly widthMm: number;
  readonly heightMm: number;
  readonly fullLengthMm: number;
  readonly halfLengthMm?: number;
  readonly twoThirdsLengthMm?: number;
  readonly oneThirdLengthMm?: number;
  readonly lBondLengthMm?: number;
  readonly tBondLengthMm?: number;
  readonly compensatorALengthMm?: number;
  readonly compensatorBLengthMm?: number;
  readonly channelLengthMm?: number;
  readonly halfChannelLengthMm?: number;
}

export interface BlockWebRequirement {
  readonly classGroup: "A_B" | "C";
  readonly widthMm: number;
  readonly fullLengthMm: number;
  readonly minimumLongitudinalWallMm: number;
  readonly minimumTransverseWallMm: number;
  readonly minimumEquivalentWallMm: number;
  readonly minimumVoidDimensionMm?: number;
}

export interface ClassCUseLimit {
  readonly widthMm: number;
  readonly maximumStoreys?: number;
  readonly structuralUsePermitted: boolean;
}

/** Requisitos fisicos do bloco, ensaiados conforme a ABNT NBR 6136-2. */
export interface BlockPhysicalRequirements {
  readonly maximumDryingShrinkagePercent: number;
  readonly normalAggregateAbsorptionIndividualPercent: number;
  readonly normalAggregateAbsorptionMeanPercent: number;
  readonly lightweightAggregateAbsorptionIndividualPercent: number;
  readonly lightweightAggregateAbsorptionMeanPercent: number;
  readonly initialWaterAbsorptionTestRequired: boolean;
}

const EPSILON = 1e-9;

export const NBR_6136_1_2026_STRENGTH_RULES: Readonly<Record<ConcreteBlockClass, ConcreteBlockStrengthRule>> = Object.freeze({
  A: Object.freeze({ blockClass: "A", minimumMPa: 8, incrementMPa: 2, belowGradePermitted: true }),
  B: Object.freeze({ blockClass: "B", minimumMPa: 4, maximumMPa: 6, incrementMPa: 2, belowGradePermitted: false }),
  C: Object.freeze({ blockClass: "C", minimumMPa: 3, incrementMPa: 1, belowGradePermitted: false })
});

export const NBR_6136_1_2026_DIMENSIONAL_TOLERANCES = Object.freeze({
  widthPlusMinusMm: 2,
  heightPlusMinusMm: 3,
  lengthPlusMinusMm: 3,
  wallThicknessNegativeMm: 1
});

export const NBR_6136_1_2026_PHYSICAL_REQUIREMENTS: BlockPhysicalRequirements = Object.freeze({
  maximumDryingShrinkagePercent: 0.055,
  normalAggregateAbsorptionIndividualPercent: 11,
  normalAggregateAbsorptionMeanPercent: 10,
  lightweightAggregateAbsorptionIndividualPercent: 16,
  lightweightAggregateAbsorptionMeanPercent: 13,
  initialWaterAbsorptionTestRequired: true
});

export const NBR_6136_1_2026_MINIMUM_MITER_RADIUS_MM: Readonly<Record<"A_B" | "C", number>> = Object.freeze({
  A_B: 40,
  C: 20
});

export const NBR_6136_1_2026_NOMINAL_FAMILIES: readonly NominalBlockFamilyDimensions[] = Object.freeze([
  Object.freeze({ id: "20 x 40", moduleCm: 20, widthMm: 190, heightMm: 190, fullLengthMm: 390, halfLengthMm: 190, compensatorALengthMm: 90, compensatorBLengthMm: 40, channelLengthMm: 390, halfChannelLengthMm: 190 }),
  Object.freeze({ id: "15 x 40", moduleCm: 20, widthMm: 140, heightMm: 190, fullLengthMm: 390, halfLengthMm: 190, lBondLengthMm: 340, tBondLengthMm: 540, compensatorALengthMm: 90, compensatorBLengthMm: 40, channelLengthMm: 390, halfChannelLengthMm: 190 }),
  Object.freeze({ id: "15 x 30", moduleCm: 15, widthMm: 140, heightMm: 190, fullLengthMm: 290, halfLengthMm: 140, tBondLengthMm: 440, channelLengthMm: 290, halfChannelLengthMm: 140 }),
  Object.freeze({ id: "12,5 x 40", moduleCm: 12.5, widthMm: 115, heightMm: 190, fullLengthMm: 390, halfLengthMm: 190, compensatorALengthMm: 90, compensatorBLengthMm: 40, channelLengthMm: 390, halfChannelLengthMm: 190 }),
  Object.freeze({ id: "12,5 x 25", moduleCm: 12.5, widthMm: 115, heightMm: 190, fullLengthMm: 240, halfLengthMm: 115, tBondLengthMm: 365, channelLengthMm: 240, halfChannelLengthMm: 115 }),
  Object.freeze({ id: "12,5 x 37,5", moduleCm: 12.5, widthMm: 115, heightMm: 190, fullLengthMm: 365, twoThirdsLengthMm: 240, oneThirdLengthMm: 115, channelLengthMm: 365 }),
  Object.freeze({ id: "10 x 40", moduleCm: 10, widthMm: 90, heightMm: 190, fullLengthMm: 390, halfLengthMm: 190, compensatorALengthMm: 90, compensatorBLengthMm: 40, channelLengthMm: 390, halfChannelLengthMm: 190 }),
  Object.freeze({ id: "10 x 30", moduleCm: 10, widthMm: 90, heightMm: 190, fullLengthMm: 290, halfLengthMm: 140, twoThirdsLengthMm: 190, oneThirdLengthMm: 90, tBondLengthMm: 290, channelLengthMm: 290, halfChannelLengthMm: 140 }),
  Object.freeze({ id: "7,5 x 40", moduleCm: 7.5, widthMm: 65, heightMm: 190, fullLengthMm: 390, halfLengthMm: 190, compensatorALengthMm: 90, compensatorBLengthMm: 40, channelLengthMm: 390 })
]);

export const NBR_6136_1_2026_WEB_REQUIREMENTS: readonly BlockWebRequirement[] = Object.freeze([
  Object.freeze({ classGroup: "A_B", widthMm: 190, fullLengthMm: 390, minimumLongitudinalWallMm: 32, minimumTransverseWallMm: 25, minimumEquivalentWallMm: 74, minimumVoidDimensionMm: 110 }),
  Object.freeze({ classGroup: "A_B", widthMm: 140, fullLengthMm: 390, minimumLongitudinalWallMm: 25, minimumTransverseWallMm: 25, minimumEquivalentWallMm: 65, minimumVoidDimensionMm: 70 }),
  Object.freeze({ classGroup: "C", widthMm: 190, fullLengthMm: 390, minimumLongitudinalWallMm: 18, minimumTransverseWallMm: 18, minimumEquivalentWallMm: 54 }),
  Object.freeze({ classGroup: "C", widthMm: 140, fullLengthMm: 390, minimumLongitudinalWallMm: 18, minimumTransverseWallMm: 18, minimumEquivalentWallMm: 48 }),
  Object.freeze({ classGroup: "C", widthMm: 140, fullLengthMm: 290, minimumLongitudinalWallMm: 18, minimumTransverseWallMm: 18, minimumEquivalentWallMm: 53 }),
  Object.freeze({ classGroup: "C", widthMm: 115, fullLengthMm: 290, minimumLongitudinalWallMm: 18, minimumTransverseWallMm: 18, minimumEquivalentWallMm: 45 }),
  Object.freeze({ classGroup: "C", widthMm: 115, fullLengthMm: 240, minimumLongitudinalWallMm: 18, minimumTransverseWallMm: 18, minimumEquivalentWallMm: 51 }),
  Object.freeze({ classGroup: "C", widthMm: 115, fullLengthMm: 365, minimumLongitudinalWallMm: 18, minimumTransverseWallMm: 18, minimumEquivalentWallMm: 45 }),
  Object.freeze({ classGroup: "C", widthMm: 90, fullLengthMm: 390, minimumLongitudinalWallMm: 18, minimumTransverseWallMm: 18, minimumEquivalentWallMm: 41 }),
  Object.freeze({ classGroup: "C", widthMm: 90, fullLengthMm: 290, minimumLongitudinalWallMm: 18, minimumTransverseWallMm: 18, minimumEquivalentWallMm: 44 }),
  Object.freeze({ classGroup: "C", widthMm: 65, fullLengthMm: 390, minimumLongitudinalWallMm: 15, minimumTransverseWallMm: 15, minimumEquivalentWallMm: 32 })
]);

export const NBR_6136_1_2026_CLASS_C_USE_LIMITS: readonly ClassCUseLimit[] = Object.freeze([
  Object.freeze({ widthMm: 190, maximumStoreys: 5, structuralUsePermitted: true }),
  Object.freeze({ widthMm: 140, maximumStoreys: 2, structuralUsePermitted: true }),
  Object.freeze({ widthMm: 115, maximumStoreys: 2, structuralUsePermitted: true }),
  Object.freeze({ widthMm: 90, maximumStoreys: 1, structuralUsePermitted: true }),
  Object.freeze({ widthMm: 65, structuralUsePermitted: false })
]);

function isIncrementCompatible(value: number, increment: number): boolean {
  return Math.abs(value / increment - Math.round(value / increment)) <= EPSILON;
}

export function validateConcreteBlockStrength(
  blockClass: ConcreteBlockClass,
  strengthMPa: number
): ConcreteBlockStrengthValidation {
  const rule = NBR_6136_1_2026_STRENGTH_RULES[blockClass];
  if (!Number.isFinite(strengthMPa)) {
    return { valid: false, rule, message: "fbk deve ser finito." };
  }
  const aboveMinimum = strengthMPa >= rule.minimumMPa;
  const belowMaximum = rule.maximumMPa === undefined || strengthMPa <= rule.maximumMPa;
  const compatibleIncrement = isIncrementCompatible(strengthMPa, rule.incrementMPa);
  const valid = aboveMinimum && belowMaximum && compatibleIncrement;
  const range = rule.maximumMPa === undefined
    ? `fbk ≥ ${rule.minimumMPa} MPa`
    : `${rule.minimumMPa} MPa ≤ fbk ≤ ${rule.maximumMPa} MPa`;
  return {
    valid,
    rule,
    message: valid
      ? `Classe ${blockClass}: ${range}, em incrementos de ${rule.incrementMPa} MPa.`
      : `Classe ${blockClass} exige ${range}, em incrementos de ${rule.incrementMPa} MPa.`
  };
}

/** Compatibilidade com revisões salvas antes da seleção explícita de classe. */
export function inferLegacyConcreteBlockClass(strengthMPa: number): ConcreteBlockClass {
  if (strengthMPa >= 8 && isIncrementCompatible(strengthMPa, 2)) return "A";
  if (strengthMPa >= 4 && strengthMPa <= 6 && isIncrementCompatible(strengthMPa, 2)) return "B";
  return "C";
}

export function findNominalBlockFamily(id: string): NominalBlockFamilyDimensions | undefined {
  const normalized = id.replaceAll(".", ",").replace(/\s+/g, " ").trim();
  return NBR_6136_1_2026_NOMINAL_FAMILIES.find((family) => family.id === normalized);
}

export function findBlockWebRequirement(
  blockClass: ConcreteBlockClass,
  widthMm: number,
  fullLengthMm: number
): BlockWebRequirement | undefined {
  const classGroup = blockClass === "C" ? "C" : "A_B";
  return NBR_6136_1_2026_WEB_REQUIREMENTS.find(
    (requirement) => requirement.classGroup === classGroup &&
      requirement.widthMm === widthMm && requirement.fullLengthMm === fullLengthMm
  );
}

export function minimumMiterRadiusMm(blockClass: ConcreteBlockClass): number {
  return NBR_6136_1_2026_MINIMUM_MITER_RADIUS_MM[blockClass === "C" ? "C" : "A_B"];
}

export function findClassCUseLimit(widthMm: number): ClassCUseLimit | undefined {
  return NBR_6136_1_2026_CLASS_C_USE_LIMITS.find((limit) => limit.widthMm === widthMm);
}

export type BlockAggregate = "normal" | "lightweight";

/** Limites de absorcao por tipo de agregado, em porcentagem. */
export function absorptionLimitsPercent(
  aggregate: BlockAggregate
): { readonly individual: number; readonly mean: number } {
  const requirements = NBR_6136_1_2026_PHYSICAL_REQUIREMENTS;
  return aggregate === "lightweight"
    ? {
      individual: requirements.lightweightAggregateAbsorptionIndividualPercent,
      mean: requirements.lightweightAggregateAbsorptionMeanPercent
    }
    : {
      individual: requirements.normalAggregateAbsorptionIndividualPercent,
      mean: requirements.normalAggregateAbsorptionMeanPercent
    };
}
