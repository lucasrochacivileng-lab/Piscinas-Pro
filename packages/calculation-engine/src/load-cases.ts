import {
  validateStructuralProfile,
  type CalculationBundle,
  type StructuralDesignProfile
} from "./engineering.js";

export interface PoolLoadCasesInput {
  readonly internalLengthMm: number;
  readonly internalWidthMm: number;
  readonly wallHeightMm: number;
  readonly wallThicknessMm: number;
  readonly slabThicknessMm: number;
  readonly waterDepthMm: number;
  readonly groundwaterHeadAboveSlabBottomMm: number;
  readonly imposedFloorLoadKPa: number;
  readonly masonryUnitWeightKNM3: number;
}

export interface PoolLoadCasesResult {
  readonly planAreaM2: number;
  readonly slabSelfWeightKPa: number;
  readonly wallSelfWeightKNPerM: number;
  readonly wallBaseAxialStressKPa: number;
  readonly containedWaterLoadKPa: number;
  readonly fullPoolDownwardCharacteristicKPa: number;
  readonly groundwaterUpliftCharacteristicKPa: number;
  readonly emptyPoolNetUpliftCharacteristicKPa: number;
  readonly fullPoolDownwardDesignKPa: number;
  readonly emptyPoolNetUpliftDesignKPa: number;
  readonly governingFloorCase: "FULL_POOL_DOWNWARD" | "EMPTY_POOL_UPLIFT";
}

function validate(input: PoolLoadCasesInput): void {
  for (const [field, value] of Object.entries(input)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${field} deve ser finito e nao negativo.`);
    }
  }
  for (const field of [
    "internalLengthMm",
    "internalWidthMm",
    "wallHeightMm",
    "wallThicknessMm",
    "slabThicknessMm"
  ] as const) {
    if (input[field] === 0) throw new RangeError(`${field} deve ser positivo.`);
  }
}

export function calculatePoolLoadCases(
  input: PoolLoadCasesInput,
  profile: StructuralDesignProfile
): CalculationBundle<PoolLoadCasesResult> {
  validate(input);
  const profileErrors = validateStructuralProfile(profile);
  if (profileErrors.length > 0) throw new RangeError(profileErrors.join(" "));
  const lengthM = input.internalLengthMm / 1_000;
  const widthM = input.internalWidthMm / 1_000;
  const wallHeightM = input.wallHeightMm / 1_000;
  const wallThicknessM = input.wallThicknessMm / 1_000;
  const slabThicknessM = input.slabThicknessMm / 1_000;
  const waterDepthM = input.waterDepthMm / 1_000;
  const groundwaterHeadM = input.groundwaterHeadAboveSlabBottomMm / 1_000;

  const planAreaM2 = lengthM * widthM;
  const slabSelfWeightKPa = profile.concreteUnitWeightKNM3 * slabThicknessM;
  const wallSelfWeightKNPerM = input.masonryUnitWeightKNM3 * wallThicknessM * wallHeightM;
  const wallBaseAxialStressKPa = wallSelfWeightKNPerM / wallThicknessM;
  const containedWaterLoadKPa = profile.waterUnitWeightKNM3 * waterDepthM;
  const fullPoolDownwardCharacteristicKPa =
    slabSelfWeightKPa + containedWaterLoadKPa + input.imposedFloorLoadKPa;
  const groundwaterUpliftCharacteristicKPa = profile.waterUnitWeightKNM3 * groundwaterHeadM;
  const emptyPoolNetUpliftCharacteristicKPa = Math.max(
    0,
    groundwaterUpliftCharacteristicKPa - slabSelfWeightKPa
  );
  const fullPoolDownwardDesignKPa =
    profile.actionFactor * fullPoolDownwardCharacteristicKPa;
  const emptyPoolNetUpliftDesignKPa =
    profile.actionFactor * emptyPoolNetUpliftCharacteristicKPa;
  const upliftGoverns = emptyPoolNetUpliftDesignKPa > fullPoolDownwardDesignKPa;

  return {
    value: {
      planAreaM2,
      slabSelfWeightKPa,
      wallSelfWeightKNPerM,
      wallBaseAxialStressKPa,
      containedWaterLoadKPa,
      fullPoolDownwardCharacteristicKPa,
      groundwaterUpliftCharacteristicKPa,
      emptyPoolNetUpliftCharacteristicKPa,
      fullPoolDownwardDesignKPa,
      emptyPoolNetUpliftDesignKPa,
      governingFloorCase: upliftGoverns ? "EMPTY_POOL_UPLIFT" : "FULL_POOL_DOWNWARD"
    },
    checks: [{
      id: "uplift-equilibrium-scope",
      status: "REQUIRES_REVIEW",
      message: "A subpressao liquida desconta apenas o peso proprio da laje; paredes, solo e ancoragem exigem verificacao global."
    }],
    trace: [
      {
        id: "slab-self-weight",
        description: "Peso proprio da laje por area",
        equation: "g_slab = gamma_concrete * t_slab",
        substitutions: {
          gamma_concrete: profile.concreteUnitWeightKNM3,
          t_slab: slabThicknessM
        },
        result: slabSelfWeightKPa,
        unit: "kPa"
      },
      {
        id: "groundwater-uplift",
        description: "Subpressao bruta do lencol freatico",
        equation: "u = gamma_water * h_groundwater",
        substitutions: {
          gamma_water: profile.waterUnitWeightKNM3,
          h_groundwater: groundwaterHeadM
        },
        result: groundwaterUpliftCharacteristicKPa,
        unit: "kPa"
      },
      {
        id: "empty-pool-net-uplift",
        description: "Subpressao liquida simplificada com piscina vazia",
        equation: "u_net = max(0, u - g_slab)",
        substitutions: { u: groundwaterUpliftCharacteristicKPa, g_slab: slabSelfWeightKPa },
        result: emptyPoolNetUpliftCharacteristicKPa,
        unit: "kPa"
      }
    ],
    warnings: [
      "As combinacoes usam um unico fator academico para esta fase.",
      ...(profile.status === "draft" ? ["Perfil estrutural academico ainda nao revisado."] : [])
    ]
  };
}
