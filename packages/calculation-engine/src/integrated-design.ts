import type { EngineeringCheck, StructuralDesignProfile } from "./engineering.js";
import { calculateGlobalFlotation, type GlobalFlotationResult } from "./flotation.js";
import { designMasonryPanel } from "./masonry-design.js";
import {
  DEFAULT_MASONRY_SPECIFICATION,
  runPhase1Design,
  type MasonrySpecificationInput,
  type Phase1DesignInput,
  type Phase1DesignResult,
  type Phase1MasonryResult,
  type Phase1WallPanelResult,
  type Phase1WallResult
} from "./phase1.js";
import {
  analyzeSoilProfile,
  legacyGeotechnicalInput,
  type GeotechnicalInput,
  type SoilProfileResult
} from "./soil.js";

export interface IntegratedMasonrySpecificationInput extends MasonrySpecificationInput {
  readonly mortarStrengthMPa?: number;
  readonly groutStrengthMPa?: number;
  readonly prismStrengthMPa?: number;
}

export interface IntegratedDesignInput extends Omit<Phase1DesignInput, "masonry"> {
  readonly normativeProfileId?: string;
  readonly geotechnical?: GeotechnicalInput;
  readonly masonry?: IntegratedMasonrySpecificationInput;
}

export interface IntegratedMasonryResult extends Phase1MasonryResult {
  readonly mortarStrengthMPa: number;
  readonly groutStrengthMPa: number;
  readonly prismStrengthMPa: number;
  readonly prismToBlockEfficiency: number;
}

export interface IntegratedDesignResult extends Omit<Phase1DesignResult, "masonry"> {
  readonly integrationVersion: "geotechnical-normative-1.0.0";
  readonly profileLabel: string;
  readonly profileStatus: "draft" | "reviewed";
  readonly profileSourceKind: "academic" | "normative";
  readonly geotechnical: SoilProfileResult;
  readonly flotation: GlobalFlotationResult;
  readonly masonry?: IntegratedMasonryResult;
}

const wallDemand = (wall: Phase1WallResult): number => Math.max(
  wall.actions.designMomentParallelKNMPerM,
  wall.actions.designMomentPerpendicularKNMPerM
);

const constituentChecks = (
  masonry: Required<Pick<IntegratedMasonrySpecificationInput, "mortarStrengthMPa" | "groutStrengthMPa" | "prismStrengthMPa">> & { blockStrengthMPa: number },
  profile: StructuralDesignProfile
): EngineeringCheck[] => {
  const efficiency = masonry.prismStrengthMPa / masonry.blockStrengthMPa;
  return [
    {
      id: "masonry-mortar-strength",
      status: masonry.mortarStrengthMPa >= profile.minimumMortarStrengthMPa ? "PASS" : "FAIL",
      demand: profile.minimumMortarStrengthMPa,
      resistance: masonry.mortarStrengthMPa,
      unit: "MPa",
      message: "Resistência especificada da argamassa comparada ao mínimo do perfil selecionado."
    },
    {
      id: "masonry-grout-strength",
      status: masonry.groutStrengthMPa >= profile.minimumGroutStrengthMPa ? "PASS" : "FAIL",
      demand: profile.minimumGroutStrengthMPa,
      resistance: masonry.groutStrengthMPa,
      unit: "MPa",
      message: "Resistência especificada do graute comparada ao mínimo do perfil selecionado."
    },
    {
      id: "masonry-prism-efficiency-minimum",
      status: efficiency >= profile.minimumPrismToBlockEfficiency ? "PASS" : "FAIL",
      demand: profile.minimumPrismToBlockEfficiency,
      resistance: efficiency,
      unit: "ratio",
      message: "Eficiência prisma/bloco atende o limite inferior do perfil."
    },
    {
      id: "masonry-prism-efficiency-maximum",
      status: efficiency <= profile.maximumPrismToBlockEfficiency ? "PASS" : "REQUIRES_REVIEW",
      demand: efficiency,
      resistance: profile.maximumPrismToBlockEfficiency,
      unit: "ratio",
      message: efficiency <= profile.maximumPrismToBlockEfficiency
        ? "Eficiência prisma/bloco está dentro da faixa cadastrada."
        : "Eficiência prisma/bloco acima da faixa usual do perfil; conferir ensaio, unidade e condição grauteada."
    },
    {
      id: "masonry-system-testing",
      status: "REQUIRES_REVIEW",
      demand: masonry.prismStrengthMPa,
      resistance: masonry.blockStrengthMPa,
      unit: "MPa",
      message: "Confirmar que bloco, argamassa, graute e prisma pertencem ao mesmo sistema e lote de controle tecnológico."
    }
  ];
};

export function runIntegratedDesign(
  input: IntegratedDesignInput,
  profile: StructuralDesignProfile
): IntegratedDesignResult {
  const geotechnicalInput = input.geotechnical ?? legacyGeotechnicalInput(
    input.geometry,
    input.saturatedSoilUnitWeightKNM3,
    input.soilFrictionAngleDegrees,
    input.groundwaterHeadAboveSlabBottomMm
  );
  const geotechnical = analyzeSoilProfile(geotechnicalInput, input.geometry);
  const resolvedInput: Phase1DesignInput = {
    ...input,
    saturatedSoilUnitWeightKNM3: geotechnical.representativeSaturatedUnitWeightKNM3,
    soilFrictionAngleDegrees: geotechnical.representativeFrictionAngleDegrees,
    groundwaterHeadAboveSlabBottomMm: geotechnical.groundwaterHeadAboveDeepestSlabBottomMm,
    ...(input.masonry ? { masonry: input.masonry } : {})
  };
  const base = runPhase1Design(resolvedInput, profile);
  const masonryInput: IntegratedMasonrySpecificationInput = input.masonry ?? DEFAULT_MASONRY_SPECIFICATION;
  const mortarStrengthMPa = masonryInput.mortarStrengthMPa ?? 4;
  const groutStrengthMPa = masonryInput.groutStrengthMPa ?? 15;
  const prismStrengthMPa = masonryInput.prismStrengthMPa ?? Math.max(4, masonryInput.blockStrengthMPa * 0.5);

  const rebuildWall = (wall: Phase1WallPanelResult): Phase1WallPanelResult => {
    const bundle = designMasonryPanel({
      panelLengthMm: wall.lengthMm,
      panelHeightMm: wall.heightMm,
      wallThicknessMm: input.geometry.wallThicknessMm,
      reinforcementCoverMm: input.reinforcementCoverMm,
      barDiameterMm: input.wallBarDiameterMm,
      leverArmFactor: input.wallLeverArmFactor,
      flexuralTensileStrengthParallelMPa: input.flexuralTensileStrengthParallelMPa,
      flexuralTensileStrengthPerpendicularMPa: input.flexuralTensileStrengthPerpendicularMPa,
      forceReinforcedDesign: true,
      panelActions: wall.actions,
      prismStrengthMPa,
      axialStressKPa: base.loadCases.wallBaseAxialStressKPa
    }, profile);
    const supportChecks = wall.checks.filter((check) => check.id.endsWith("-support-model"));
    return {
      ...wall,
      design: bundle.value,
      checks: [
        ...bundle.checks.map((check) => ({
          ...check,
          id: `${wall.id}-${check.id}`,
          message: `${wall.label}: ${check.message}`
        })),
        ...supportChecks
      ]
    };
  };

  const wallPanels = base.wallPanels.map(rebuildWall);
  const longCandidates = wallPanels.filter((wall) => wall.kind === "PERIMETER_LONG");
  const endCandidates = wallPanels.filter((wall) => wall.kind === "PERIMETER_END");
  const longWall = longCandidates.reduce((governing, wall) =>
    wallDemand(wall) > wallDemand(governing) ? wall : governing
  );
  const shortWall = endCandidates.reduce((governing, wall) =>
    wallDemand(wall) > wallDemand(governing) ? wall : governing
  );

  const flotation = calculateGlobalFlotation({
    geometry: input.geometry,
    groundwaterHeadAboveDeepestSlabBottomMm: geotechnical.groundwaterHeadAboveDeepestSlabBottomMm,
    masonryUnitWeightKNM3: input.masonryUnitWeightKNM3,
    additionalPermanentResistanceKN: geotechnicalInput.additionalPermanentResistanceKN
  }, profile);

  const bearingCheck: EngineeringCheck = {
    id: "soil-bearing-screening",
    status: base.loadCases.fullPoolDownwardCharacteristicKPa <= geotechnical.foundationAllowableBearingKPa
      ? "REQUIRES_REVIEW"
      : "FAIL",
    demand: base.loadCases.fullPoolDownwardCharacteristicKPa,
    resistance: geotechnical.foundationAllowableBearingKPa,
    unit: "kPa",
    message: base.loadCases.fullPoolDownwardCharacteristicKPa <= geotechnical.foundationAllowableBearingKPa
      ? "Pressão média está abaixo da tensão admissível correlacionada ao NSPT; confirmar recalques e modelo de fundação."
      : "Pressão média excede a tensão admissível preliminar correlacionada ao NSPT."
  };
  const profileCheck: EngineeringCheck = {
    id: "selected-normative-profile",
    status: profile.status === "reviewed" ? "PASS" : "REQUIRES_REVIEW",
    demand: profile.sourceKind === "normative" ? 1 : 0,
    resistance: 1,
    unit: "profile",
    message: profile.status === "reviewed"
      ? `Perfil ${profile.label} revisado.`
      : `Perfil ${profile.label} é versionado, porém permanece preliminar e exige conferência das edições licenciadas.`
  };
  const masonrySystem = {
    blockStrengthMPa: masonryInput.blockStrengthMPa,
    mortarStrengthMPa,
    groutStrengthMPa,
    prismStrengthMPa
  };
  const materialChecks = constituentChecks(masonrySystem, profile);
  const masonryChecks = base.masonry ? [...base.masonry.checks, ...materialChecks] : materialChecks;
  const oldWallCheckIds = new Set(base.wallPanels.flatMap((wall) => wall.checks.map((check) => check.id)));
  const oldMasonryCheckIds = new Set(base.masonry?.checks.map((check) => check.id) ?? []);
  const retainedBaseChecks = base.checks.filter((check) =>
    !oldWallCheckIds.has(check.id) && !oldMasonryCheckIds.has(check.id)
  );
  const checks = [
    ...retainedBaseChecks,
    ...geotechnical.checks,
    bearingCheck,
    ...flotation.checks,
    profileCheck,
    ...wallPanels.flatMap((wall) => wall.checks),
    ...masonryChecks
  ];
  const overallStatus = checks.some((check) => check.governing !== false && check.status === "FAIL")
    ? "FAIL"
    : checks.some((check) => check.governing !== false && check.status === "REQUIRES_REVIEW")
      ? "REQUIRES_REVIEW"
      : "PASS";

  const integratedMasonry: IntegratedMasonryResult | null = base.masonry ? {
    ...base.masonry,
    mortarStrengthMPa,
    groutStrengthMPa,
    prismStrengthMPa,
    prismToBlockEfficiency: prismStrengthMPa / masonryInput.blockStrengthMPa,
    checks: masonryChecks,
    warnings: [
      ...base.masonry.warnings,
      "Argamassa, graute e prisma devem ser vinculados ao plano de controle tecnológico da obra."
    ]
  } : null;

  return {
    ...base,
    integrationVersion: "geotechnical-normative-1.0.0",
    profileLabel: profile.label,
    profileStatus: profile.status,
    profileSourceKind: profile.sourceKind,
    geotechnical,
    flotation,
    longWall,
    shortWall,
    wallPanels,
    ...(integratedMasonry ? { masonry: integratedMasonry } : {}),
    checks,
    overallStatus,
    warnings: [
      ...base.warnings,
      ...geotechnical.warnings,
      ...flotation.warnings,
      ...profile.references.map((reference) => `Perfil: ${reference}`)
    ]
  };
}
