import {
  selectBarLayout,
  validateStructuralProfile,
  type BarLayout,
  type CalculationBundle,
  type EngineeringCheck,
  type StructuralDesignProfile
} from "./engineering.js";
import type { WallPanelResult } from "./types.js";

export interface MasonryDesignInput {
  readonly panelLengthMm: number;
  readonly panelHeightMm: number;
  readonly wallThicknessMm: number;
  readonly reinforcementCoverMm: number;
  readonly barDiameterMm: number;
  readonly leverArmFactor: number;
  readonly flexuralTensileStrengthParallelMPa: number;
  readonly flexuralTensileStrengthPerpendicularMPa: number;
  readonly forceReinforcedDesign: boolean;
  readonly panelActions: WallPanelResult;
  readonly prismStrengthMPa?: number;
  readonly axialStressKPa?: number;
}

export interface MasonryDirectionResult {
  readonly designMomentKNMPerM: number;
  readonly characteristicUnreinforcedResistanceKNMPerM: number;
  readonly designUnreinforcedResistanceKNMPerM: number;
  readonly requiredSteelByMomentMm2PerM: number;
  readonly minimumSteelMm2PerM: number;
  readonly adoptedSteelMm2PerM: number;
  readonly layout: BarLayout;
}

export interface MasonryDesignResult {
  readonly effectiveDepthMm: number;
  readonly designSteelStrengthMPa: number;
  readonly prismStrengthMPa: number;
  readonly designCompressiveResistanceMPa: number;
  readonly axialStressMPa: number;
  readonly parallel: MasonryDirectionResult;
  readonly perpendicular: MasonryDirectionResult;
  readonly designShearKNPerM: number;
  readonly designShearStressMPa: number;
  readonly characteristicShearResistanceMPa: number;
  readonly designShearResistanceMPa: number;
  readonly horizontalSlendernessRatio: number;
  readonly verticalSlendernessRatio: number;
  readonly reinforcementRequired: boolean;
}

function interpolateBoundary(
  horizontalRatio: number,
  points: readonly (readonly [number, number])[]
): number | null {
  if (points.length < 2 || horizontalRatio < (points[0]?.[0] ?? 0)) return null;
  for (let index = 1; index < points.length; index += 1) {
    const lower = points[index - 1];
    const upper = points[index];
    if (lower && upper && horizontalRatio <= upper[0]) {
      const fraction = (horizontalRatio - lower[0]) / (upper[0] - lower[0]);
      return lower[1] + fraction * (upper[1] - lower[1]);
    }
  }
  return null;
}

function designDirection(
  designMomentKNMPerM: number,
  tensileStrengthMPa: number,
  thicknessMm: number,
  effectiveDepthMm: number,
  barDiameterMm: number,
  leverArmFactor: number,
  forceReinforcedDesign: boolean,
  profile: StructuralDesignProfile
): MasonryDirectionResult {
  const thicknessM = thicknessMm / 1_000;
  const sectionModulusM3PerM = thicknessM ** 2 / 6;
  const characteristicUnreinforcedResistanceKNMPerM =
    tensileStrengthMPa * 1_000 * sectionModulusM3PerM;
  const designUnreinforcedResistanceKNMPerM =
    characteristicUnreinforcedResistanceKNMPerM / profile.masonryResistanceFactor;
  const designSteelStrengthMPa = profile.steelYieldStrengthMPa / profile.steelResistanceFactor;
  const leverArmMm = leverArmFactor * effectiveDepthMm;
  const requiredSteelByMomentMm2PerM =
    (designMomentKNMPerM * 1_000_000) / (designSteelStrengthMPa * leverArmMm);
  const minimumSteelMm2PerM = profile.minimumWallSteelRatio * 1_000 * thicknessMm;
  const needsCalculatedSteel = designMomentKNMPerM > designUnreinforcedResistanceKNMPerM;
  const adoptedSteelMm2PerM = needsCalculatedSteel || forceReinforcedDesign
    ? Math.max(requiredSteelByMomentMm2PerM, minimumSteelMm2PerM)
    : minimumSteelMm2PerM;
  const maximumSpacingMm = profile.maximumWallBarSpacingThicknessFactor * thicknessMm;

  return {
    designMomentKNMPerM,
    characteristicUnreinforcedResistanceKNMPerM,
    designUnreinforcedResistanceKNMPerM,
    requiredSteelByMomentMm2PerM,
    minimumSteelMm2PerM,
    adoptedSteelMm2PerM,
    layout: selectBarLayout(adoptedSteelMm2PerM, barDiameterMm, maximumSpacingMm)
  };
}

export function designMasonryPanel(
  input: MasonryDesignInput,
  profile: StructuralDesignProfile
): CalculationBundle<MasonryDesignResult> {
  const profileErrors = validateStructuralProfile(profile);
  if (profileErrors.length > 0) throw new RangeError(profileErrors.join(" "));
  const prismStrengthMPa = input.prismStrengthMPa ?? 4;
  const axialStressKPa = input.axialStressKPa ?? 0;
  const numericInputs = {
    panelLengthMm: input.panelLengthMm,
    panelHeightMm: input.panelHeightMm,
    wallThicknessMm: input.wallThicknessMm,
    reinforcementCoverMm: input.reinforcementCoverMm,
    barDiameterMm: input.barDiameterMm,
    leverArmFactor: input.leverArmFactor,
    flexuralTensileStrengthParallelMPa: input.flexuralTensileStrengthParallelMPa,
    flexuralTensileStrengthPerpendicularMPa: input.flexuralTensileStrengthPerpendicularMPa,
    prismStrengthMPa
  };
  for (const [field, value] of Object.entries(numericInputs)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${field} deve ser positivo e finito.`);
    }
  }
  if (!Number.isFinite(axialStressKPa) || axialStressKPa < 0) {
    throw new RangeError("axialStressKPa deve ser finito e nao negativo.");
  }
  const effectiveDepthMm = input.wallThicknessMm - input.reinforcementCoverMm;
  if (effectiveDepthMm <= 0) {
    throw new RangeError("O cobrimento deve ser menor que a espessura da parede.");
  }
  if (input.leverArmFactor > 1) {
    throw new RangeError("leverArmFactor nao pode ser maior que 1.");
  }

  const parallel = designDirection(
    input.panelActions.designMomentParallelKNMPerM,
    input.flexuralTensileStrengthParallelMPa,
    input.wallThicknessMm,
    effectiveDepthMm,
    input.barDiameterMm,
    input.leverArmFactor,
    input.forceReinforcedDesign,
    profile
  );
  const perpendicular = designDirection(
    input.panelActions.designMomentPerpendicularKNMPerM,
    input.flexuralTensileStrengthPerpendicularMPa,
    input.wallThicknessMm,
    effectiveDepthMm,
    input.barDiameterMm,
    input.leverArmFactor,
    input.forceReinforcedDesign,
    profile
  );
  const reinforcementRequired =
    parallel.designMomentKNMPerM > parallel.designUnreinforcedResistanceKNMPerM ||
    perpendicular.designMomentKNMPerM > perpendicular.designUnreinforcedResistanceKNMPerM;
  const heightM = input.panelHeightMm / 1_000;
  const designShearKNPerM =
    profile.actionFactor * input.panelActions.governingMaximumPressureKPa * heightM / 2;
  const designShearStressMPa =
    (designShearKNPerM * 1_000) / (1_000 * effectiveDepthMm);
  const governingProvidedSteel = Math.max(
    parallel.layout.providedAreaMm2PerM,
    perpendicular.layout.providedAreaMm2PerM
  );
  const reinforcementRatio = governingProvidedSteel / (1_000 * effectiveDepthMm);
  const characteristicShearResistanceMPa = Math.min(
    profile.masonryShearBaseMPa + profile.masonryShearRhoFactorMPa * reinforcementRatio,
    profile.masonryShearMaximumMPa
  );
  const designShearResistanceMPa =
    characteristicShearResistanceMPa / profile.masonryResistanceFactor;
  const horizontalSlendernessRatio = input.panelLengthMm / input.wallThicknessMm;
  const verticalSlendernessRatio = input.panelHeightMm / input.wallThicknessMm;
  const stabilityLimit = reinforcementRequired || input.forceReinforcedDesign
    ? profile.reinforcedSlendernessLimit
    : profile.unreinforcedSlendernessLimit;
  const serviceabilityVerticalLimit = interpolateBoundary(
    horizontalSlendernessRatio,
    profile.masonryServiceabilityBoundary
  );
  const axialStressMPa = axialStressKPa / 1_000;
  const designCompressiveResistanceMPa = prismStrengthMPa / profile.masonryResistanceFactor;

  const checks: EngineeringCheck[] = [
    {
      id: "unreinforced-flexure-parallel",
      governing: false,
      status: parallel.designMomentKNMPerM <= parallel.designUnreinforcedResistanceKNMPerM ? "PASS" : "FAIL",
      demand: parallel.designMomentKNMPerM,
      resistance: parallel.designUnreinforcedResistanceKNMPerM,
      unit: "kN.m/m",
      message: "Flexao com tracao paralela as fiadas em alvenaria nao armada."
    },
    {
      id: "unreinforced-flexure-perpendicular",
      governing: false,
      status: perpendicular.designMomentKNMPerM <= perpendicular.designUnreinforcedResistanceKNMPerM ? "PASS" : "FAIL",
      demand: perpendicular.designMomentKNMPerM,
      resistance: perpendicular.designUnreinforcedResistanceKNMPerM,
      unit: "kN.m/m",
      message: "Flexao com tracao perpendicular as fiadas em alvenaria nao armada."
    },
    {
      id: "reinforced-flexure-parallel",
      status: parallel.layout.providedAreaMm2PerM >= parallel.adoptedSteelMm2PerM ? "PASS" : "FAIL",
      demand: parallel.adoptedSteelMm2PerM,
      resistance: parallel.layout.providedAreaMm2PerM,
      unit: "mm2/m",
      message: "Area de armadura paralela adotada."
    },
    {
      id: "reinforced-flexure-perpendicular",
      status: perpendicular.layout.providedAreaMm2PerM >= perpendicular.adoptedSteelMm2PerM ? "PASS" : "FAIL",
      demand: perpendicular.adoptedSteelMm2PerM,
      resistance: perpendicular.layout.providedAreaMm2PerM,
      unit: "mm2/m",
      message: "Area de armadura perpendicular adotada."
    },
    {
      id: "masonry-prism-compression",
      status: axialStressMPa <= designCompressiveResistanceMPa ? "PASS" : "FAIL",
      demand: axialStressMPa,
      resistance: designCompressiveResistanceMPa,
      unit: "MPa",
      message: "Compressão axial na base verificada contra a resistência de cálculo do prisma."
    },
    {
      id: "masonry-shear",
      status: designShearStressMPa <= designShearResistanceMPa ? "PASS" : "FAIL",
      demand: designShearStressMPa,
      resistance: designShearResistanceMPa,
      unit: "MPa",
      message: "Cisalhamento direto da faixa de parede."
    },
    {
      id: "wall-stability-slenderness",
      status: input.panelActions.slendernessRatio <= stabilityLimit ? "PASS" : "FAIL",
      demand: input.panelActions.slendernessRatio,
      resistance: stabilityLimit,
      unit: "dimensionless",
      message: "Limite academico de esbeltez conforme classificacao armada ou nao armada."
    },
    {
      id: "masonry-serviceability-domain",
      status: serviceabilityVerticalLimit === null
        ? "REQUIRES_REVIEW"
        : verticalSlendernessRatio <= serviceabilityVerticalLimit ? "PASS" : "REQUIRES_REVIEW",
      demand: verticalSlendernessRatio,
      ...(serviceabilityVerticalLimit === null ? {} : { resistance: serviceabilityVerticalLimit }),
      unit: "dimensionless",
      message: "Triagem de ELS por limite h/t versus l/t digitalizado da figura academica; fora do dominio exige deslocamento detalhado."
    }
  ];

  return {
    value: {
      effectiveDepthMm,
      designSteelStrengthMPa: profile.steelYieldStrengthMPa / profile.steelResistanceFactor,
      prismStrengthMPa,
      designCompressiveResistanceMPa,
      axialStressMPa,
      parallel,
      perpendicular,
      designShearKNPerM,
      designShearStressMPa,
      characteristicShearResistanceMPa,
      designShearResistanceMPa,
      horizontalSlendernessRatio,
      verticalSlendernessRatio,
      reinforcementRequired
    },
    checks,
    trace: [
      {
        id: "wall-minimum-steel",
        description: "Armadura minima por metro de parede",
        equation: "As_min = rho_min * 1000 * t",
        substitutions: { rho_min: profile.minimumWallSteelRatio, t: input.wallThicknessMm },
        result: parallel.minimumSteelMm2PerM,
        unit: "mm2/m"
      },
      {
        id: "wall-prism-compression",
        description: "Resistência de cálculo à compressão baseada no prisma",
        equation: "f_pd = f_pk / gamma_m",
        substitutions: { f_pk: prismStrengthMPa, gamma_m: profile.masonryResistanceFactor },
        result: designCompressiveResistanceMPa,
        unit: "MPa"
      },
      {
        id: "wall-shear-resistance",
        description: "Resistencia caracteristica ao cisalhamento limitada",
        equation: "fvk = min(fv0 + k_rho * rho, fv_max)",
        substitutions: {
          fv0: profile.masonryShearBaseMPa,
          k_rho: profile.masonryShearRhoFactorMPa,
          rho: reinforcementRatio,
          fv_max: profile.masonryShearMaximumMPa
        },
        result: characteristicShearResistanceMPa,
        unit: "MPa"
      }
    ],
    warnings: [
      "O limite de ELS foi digitalizado de figura de baixa resolucao e serve apenas para triagem.",
      "Barras calculadas devem ser envolvidas por graute e detalhadas por responsavel tecnico.",
      "A resistência do prisma deve corresponder ao sistema de bloco, argamassa e graute efetivamente especificado.",
      ...(profile.status === "draft" ? ["Perfil estrutural ainda nao revisado para emissão executiva."] : [])
    ]
  };
}
