import {
  selectBarLayout,
  validateStructuralProfile,
  type BarLayout,
  type CalculationBundle,
  type EngineeringCheck,
  type StructuralDesignProfile
} from "./engineering.js";

export interface PlateCoefficients {
  readonly aspectRatio: number;
  readonly positiveX: number;
  readonly positiveY: number;
  readonly negativeX: number;
  readonly negativeY: number;
}

export interface SlabDesignInput {
  readonly shortSpanMm: number;
  readonly longSpanMm: number;
  readonly thicknessMm: number;
  readonly reinforcementCoverMm: number;
  readonly barDiameterMm: number;
  readonly minimumSteelRatio: number;
  readonly downwardDesignLoadKPa: number;
  readonly upliftDesignLoadKPa: number;
}

export interface ReinforcedConcreteSectionResult {
  readonly designMomentKNMPerM: number;
  readonly effectiveDepthMm: number;
  readonly designConcreteStrengthMPa: number;
  readonly designSteelStrengthMPa: number;
  readonly dimensionlessMoment: number;
  readonly neutralAxisRatio: number;
  readonly leverArmRatio: number;
  readonly requiredSteelByMomentMm2PerM: number;
  readonly minimumSteelMm2PerM: number;
  readonly adoptedSteelMm2PerM: number;
  readonly layout: BarLayout;
}

export interface SlabDesignResult {
  readonly coefficients: PlateCoefficients;
  readonly downwardMomentsKNMPerM: Readonly<Record<"positiveX" | "positiveY" | "negativeX" | "negativeY", number>>;
  readonly upliftMomentsKNMPerM: Readonly<Record<"positiveX" | "positiveY" | "negativeX" | "negativeY", number>>;
  readonly bottomX: ReinforcedConcreteSectionResult;
  readonly bottomY: ReinforcedConcreteSectionResult;
  readonly topX: ReinforcedConcreteSectionResult;
  readonly topY: ReinforcedConcreteSectionResult;
  readonly warnings: readonly string[];
}

const CLAMPED_PLATE_TABLE: readonly PlateCoefficients[] = [
  { aspectRatio: 0.5, positiveX: 40.9, positiveY: 11.8, negativeX: 82.6, negativeY: 56.0 },
  { aspectRatio: 0.55, positiveX: 39.6, positiveY: 13.2, negativeX: 80.6, negativeY: 56.1 },
  { aspectRatio: 0.6, positiveX: 38.2, positiveY: 14.9, negativeX: 78.4, negativeY: 56.2 },
  { aspectRatio: 0.65, positiveX: 36.5, positiveY: 16.5, negativeX: 75.9, negativeY: 56.5 },
  { aspectRatio: 0.7, positiveX: 34.5, positiveY: 17.8, negativeX: 73.1, negativeY: 56.8 },
  { aspectRatio: 0.75, positiveX: 32.3, positiveY: 18.8, negativeX: 69.8, negativeY: 56.4 },
  { aspectRatio: 0.8, positiveX: 30.0, positiveY: 19.7, negativeX: 66.1, negativeY: 55.8 },
  { aspectRatio: 0.85, positiveX: 27.7, positiveY: 20.5, negativeX: 62.0, negativeY: 55.0 },
  { aspectRatio: 0.9, positiveX: 25.5, positiveY: 21.1, negativeX: 58.0, negativeY: 54.0 },
  { aspectRatio: 0.95, positiveX: 23.3, positiveY: 21.3, negativeX: 54.3, negativeY: 52.7 },
  { aspectRatio: 1, positiveX: 21.1, positiveY: 21.1, negativeX: 51.1, negativeY: 51.1 }
];

export function clampedPlateCoefficients(aspectRatio: number): PlateCoefficients | null {
  if (!Number.isFinite(aspectRatio) || aspectRatio < 0.5 || aspectRatio > 1) return null;
  for (let index = 1; index < CLAMPED_PLATE_TABLE.length; index += 1) {
    const lower = CLAMPED_PLATE_TABLE[index - 1];
    const upper = CLAMPED_PLATE_TABLE[index];
    if (lower && upper && aspectRatio <= upper.aspectRatio) {
      const fraction = (aspectRatio - lower.aspectRatio) / (upper.aspectRatio - lower.aspectRatio);
      const interpolate = (low: number, high: number) => low + fraction * (high - low);
      return {
        aspectRatio,
        positiveX: interpolate(lower.positiveX, upper.positiveX),
        positiveY: interpolate(lower.positiveY, upper.positiveY),
        negativeX: interpolate(lower.negativeX, upper.negativeX),
        negativeY: interpolate(lower.negativeY, upper.negativeY)
      };
    }
  }
  return CLAMPED_PLATE_TABLE.at(-1) ?? null;
}

function designSection(
  designMomentKNMPerM: number,
  input: SlabDesignInput,
  profile: StructuralDesignProfile
): ReinforcedConcreteSectionResult {
  const effectiveDepthMm = input.thicknessMm - input.reinforcementCoverMm - input.barDiameterMm / 2;
  if (effectiveDepthMm <= 0) throw new RangeError("Altura util da laje deve ser positiva.");
  const designConcreteStrengthMPa =
    profile.concreteCharacteristicStrengthMPa / profile.concreteResistanceFactor;
  const designSteelStrengthMPa = profile.steelYieldStrengthMPa / profile.steelResistanceFactor;
  const dimensionlessMoment =
    (designMomentKNMPerM * 1_000_000) /
    (1_000 * effectiveDepthMm ** 2 * designConcreteStrengthMPa);
  const discriminant = 0.68 ** 2 - 4 * 0.272 * dimensionlessMoment;
  if (discriminant < 0) {
    throw new RangeError("Momento fora do dominio da secao retangular simples; aumente a laje ou revise o modelo.");
  }
  const neutralAxisRatio = (0.68 - Math.sqrt(discriminant)) / (2 * 0.272);
  const leverArmRatio = 1 - 0.4 * neutralAxisRatio;
  const requiredSteelByMomentMm2PerM = designMomentKNMPerM === 0
    ? 0
    : (designMomentKNMPerM * 1_000_000) /
      (designSteelStrengthMPa * leverArmRatio * effectiveDepthMm);
  const minimumSteelMm2PerM = input.minimumSteelRatio * 1_000 * input.thicknessMm;
  const adoptedSteelMm2PerM = Math.max(requiredSteelByMomentMm2PerM, minimumSteelMm2PerM);
  const maximumSpacingMm = Math.min(
    profile.maximumMainSlabSpacingMm,
    profile.maximumMainSlabSpacingThicknessFactor * input.thicknessMm
  );

  return {
    designMomentKNMPerM,
    effectiveDepthMm,
    designConcreteStrengthMPa,
    designSteelStrengthMPa,
    dimensionlessMoment,
    neutralAxisRatio,
    leverArmRatio,
    requiredSteelByMomentMm2PerM,
    minimumSteelMm2PerM,
    adoptedSteelMm2PerM,
    layout: selectBarLayout(adoptedSteelMm2PerM, input.barDiameterMm, maximumSpacingMm)
  };
}

export function designClampedPoolSlab(
  input: SlabDesignInput,
  profile: StructuralDesignProfile
): CalculationBundle<SlabDesignResult> {
  const profileErrors = validateStructuralProfile(profile);
  if (profileErrors.length > 0) throw new RangeError(profileErrors.join(" "));
  for (const [field, value] of Object.entries(input)) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError(`${field} deve ser finito e nao negativo.`);
  }
  if (
    input.shortSpanMm <= 0 ||
    input.longSpanMm <= 0 ||
    input.thicknessMm <= 0 ||
    input.barDiameterMm <= 0 ||
    input.minimumSteelRatio <= 0 ||
    input.minimumSteelRatio >= 1
  ) {
    throw new RangeError("Geometria, bitola e taxa minima da laje devem ser validas.");
  }
  if (input.shortSpanMm > input.longSpanMm) {
    throw new RangeError("shortSpanMm nao pode ser maior que longSpanMm.");
  }

  const aspectRatio = input.shortSpanMm / input.longSpanMm;
  const coefficients = clampedPlateCoefficients(aspectRatio);
  if (!coefficients) {
    throw new RangeError("A tabela academica de laje cobre apenas 0,5 <= lx/ly <= 1,0.");
  }
  const shortSpanM = input.shortSpanMm / 1_000;
  const momentsFor = (loadKPa: number) => ({
    positiveX: 0.001 * coefficients.positiveX * loadKPa * shortSpanM ** 2,
    positiveY: 0.001 * coefficients.positiveY * loadKPa * shortSpanM ** 2,
    negativeX: 0.001 * coefficients.negativeX * loadKPa * shortSpanM ** 2,
    negativeY: 0.001 * coefficients.negativeY * loadKPa * shortSpanM ** 2
  });
  const downwardMomentsKNMPerM = momentsFor(input.downwardDesignLoadKPa);
  const upliftMomentsKNMPerM = momentsFor(input.upliftDesignLoadKPa);

  const bottomX = designSection(
    Math.max(downwardMomentsKNMPerM.positiveX, upliftMomentsKNMPerM.negativeX),
    input,
    profile
  );
  const bottomY = designSection(
    Math.max(downwardMomentsKNMPerM.positiveY, upliftMomentsKNMPerM.negativeY),
    input,
    profile
  );
  const topX = designSection(
    Math.max(downwardMomentsKNMPerM.negativeX, upliftMomentsKNMPerM.positiveX),
    input,
    profile
  );
  const topY = designSection(
    Math.max(downwardMomentsKNMPerM.negativeY, upliftMomentsKNMPerM.positiveY),
    input,
    profile
  );
  const sections = { bottomX, bottomY, topX, topY };
  const checks: EngineeringCheck[] = Object.entries(sections).map(([id, section]) => ({
    id: `slab-reinforcement-${id}`,
    status: section.layout.providedAreaMm2PerM >= section.adoptedSteelMm2PerM ? "PASS" : "FAIL",
    demand: section.adoptedSteelMm2PerM,
    resistance: section.layout.providedAreaMm2PerM,
    unit: "mm2/m",
    message: `Armadura calculada para ${id}.`
  }));
  checks.push({
    id: "slab-serviceability",
    status: "REQUIRES_REVIEW",
    message: "Flechas e fissuracao da laje dependem de combinacoes e limites normativos ainda nao licenciados."
  });
  const warnings = [
    "Coeficientes de placa digitalizados da Figura 4 do PDF e interpolados linearmente.",
    "A expressao KZ = 1 - 0,4*KX corrige por inferencia a inconsistencia tipografica da Equacao 27.",
    "A taxa minima de aco deve ser fornecida por perfil ou responsavel tecnico.",
    ...(profile.status === "draft" ? ["Perfil estrutural academico ainda nao revisado."] : [])
  ];

  return {
    value: {
      coefficients,
      downwardMomentsKNMPerM,
      upliftMomentsKNMPerM,
      bottomX,
      bottomY,
      topX,
      topY,
      warnings
    },
    checks,
    trace: [{
      id: "slab-positive-x-moment",
      description: "Momento positivo X da laje engastada sob carga descendente",
      equation: "Mx = 0.001 * mx * p * lx^2",
      substitutions: {
        mx: coefficients.positiveX,
        p: input.downwardDesignLoadKPa,
        lx: shortSpanM
      },
      result: downwardMomentsKNMPerM.positiveX,
      unit: "kN.m/m"
    }],
    warnings
  };
}
