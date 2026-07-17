import type {
  EngineeringCheck,
  StructuralDesignProfile
} from "./engineering.js";
import { validateStructuralProfile } from "./engineering.js";
import { calculateHydrostaticAction } from "./hydrostatic.js";
import { calculatePoolLoadCases, type PoolLoadCasesResult } from "./load-cases.js";
import { designMasonryPanel, type MasonryDesignResult } from "./masonry-design.js";
import {
  DEFAULT_BLOCK_FAMILIES,
  modulatePoolPerimeter,
  type BlockFamily,
  type PoolModulationResult
} from "./modulation.js";
import { designClampedPoolSlab, type SlabDesignResult } from "./slab-design.js";
import type {
  HydrostaticResult,
  NormativeProfile,
  PoolGeometryInput,
  WallPanelResult
} from "./types.js";
import { calculateWallPanelActions } from "./wall-panel.js";

export interface Phase1DesignInput {
  readonly geometry: PoolGeometryInput;
  readonly saturatedSoilUnitWeightKNM3: number;
  readonly soilFrictionAngleDegrees: number;
  readonly groundwaterHeadAboveSlabBottomMm: number;
  readonly imposedFloorLoadKPa: number;
  readonly masonryUnitWeightKNM3: number;
  readonly effectiveWallHeightFactor: number;
  readonly orthogonalityCoefficient: number;
  readonly reinforcementCoverMm: number;
  readonly wallBarDiameterMm: number;
  readonly wallLeverArmFactor: number;
  readonly flexuralTensileStrengthParallelMPa: number;
  readonly flexuralTensileStrengthPerpendicularMPa: number;
  readonly slabReinforcementCoverMm: number;
  readonly slabBarDiameterMm: number;
  readonly minimumSlabSteelRatio: number;
  readonly masonry?: MasonrySpecificationInput;
}

export interface MasonrySpecificationInput {
  readonly blockFamilyId: string;
  /** fbk especificado para o lote, referido à área bruta. */
  readonly blockStrengthMPa: number;
  readonly verticalGroutSpacingMm: number;
  readonly bondBeamCourseSpacing: number;
}

export const DEFAULT_MASONRY_SPECIFICATION: MasonrySpecificationInput = Object.freeze({
  blockFamilyId: "jb-blocks-20x40",
  blockStrengthMPa: 8,
  verticalGroutSpacingMm: 200,
  bondBeamCourseSpacing: 4
});

export interface Phase1MasonryResult {
  readonly family: BlockFamily;
  readonly blockStrengthMPa: number;
  readonly blockClass: "A" | "B" | "C";
  readonly modulation: PoolModulationResult;
  readonly checks: readonly EngineeringCheck[];
  readonly trace: ReturnType<typeof modulatePoolPerimeter>["trace"];
  readonly warnings: readonly string[];
}

export interface Phase1WallResult {
  readonly actions: WallPanelResult;
  readonly design: MasonryDesignResult;
  readonly checks: readonly EngineeringCheck[];
}

export interface Phase1DesignResult {
  readonly engineVersion: "phase1-1.2.0";
  readonly profileId: string;
  readonly profileVersion: string;
  readonly hydrostatic: HydrostaticResult;
  readonly loadCases: PoolLoadCasesResult;
  readonly longWall: Phase1WallResult;
  readonly shortWall: Phase1WallResult;
  readonly slab: SlabDesignResult;
  readonly masonry?: Phase1MasonryResult;
  readonly checks: readonly EngineeringCheck[];
  readonly overallStatus: "PASS" | "FAIL" | "REQUIRES_REVIEW";
  readonly warnings: readonly string[];
}

export function runPhase1Design(
  input: Phase1DesignInput,
  profile: StructuralDesignProfile
): Phase1DesignResult {
  const profileErrors = validateStructuralProfile(profile);
  if (profileErrors.length > 0) {
    throw new RangeError(`Perfil estrutural invalido: ${profileErrors.join(" ")}`);
  }
  const hydroProfile: NormativeProfile = {
    id: profile.id,
    version: profile.version,
    status: profile.status,
    waterUnitWeightKNM3: profile.waterUnitWeightKNM3,
    references: profile.references
  };
  const hydrostatic = calculateHydrostaticAction(input.geometry, hydroProfile);
  if (!hydrostatic.ok) {
    throw new RangeError(hydrostatic.errors.map((error) => error.message).join(" "));
  }
  const loadCasesBundle = calculatePoolLoadCases({
    internalLengthMm: input.geometry.internalLengthMm,
    internalWidthMm: input.geometry.internalWidthMm,
    wallHeightMm: input.geometry.waterDepthMm,
    wallThicknessMm: input.geometry.wallThicknessMm,
    slabThicknessMm: input.geometry.slabThicknessMm,
    waterDepthMm: input.geometry.waterDepthMm,
    groundwaterHeadAboveSlabBottomMm: input.groundwaterHeadAboveSlabBottomMm,
    imposedFloorLoadKPa: input.imposedFloorLoadKPa,
    masonryUnitWeightKNM3: input.masonryUnitWeightKNM3
  }, profile);
  const wallBase = {
    panelHeightMm: input.geometry.waterDepthMm,
    wallThicknessMm: input.geometry.wallThicknessMm,
    saturatedSoilUnitWeightKNM3: input.saturatedSoilUnitWeightKNM3,
    soilFrictionAngleDegrees: input.soilFrictionAngleDegrees,
    effectiveHeightFactor: input.effectiveWallHeightFactor,
    ultimateLoadFactor: profile.actionFactor,
    orthogonalityCoefficient: input.orthogonalityCoefficient
  } as const;
  const createWall = (panelLengthMm: number): Phase1WallResult => {
    const actionsOutcome = calculateWallPanelActions(
      { ...wallBase, panelLengthMm },
      hydroProfile
    );
    if (!actionsOutcome.ok) {
      throw new RangeError(actionsOutcome.errors.map((error) => error.message).join(" "));
    }
    const designBundle = designMasonryPanel({
      panelLengthMm,
      panelHeightMm: input.geometry.waterDepthMm,
      wallThicknessMm: input.geometry.wallThicknessMm,
      reinforcementCoverMm: input.reinforcementCoverMm,
      barDiameterMm: input.wallBarDiameterMm,
      leverArmFactor: input.wallLeverArmFactor,
      flexuralTensileStrengthParallelMPa: input.flexuralTensileStrengthParallelMPa,
      flexuralTensileStrengthPerpendicularMPa: input.flexuralTensileStrengthPerpendicularMPa,
      forceReinforcedDesign: true,
      panelActions: actionsOutcome.value
    }, profile);
    return {
      actions: actionsOutcome.value,
      design: designBundle.value,
      checks: designBundle.checks
    };
  };
  const longWall = createWall(
    input.geometry.internalLengthMm + 2 * input.geometry.wallThicknessMm
  );
  const shortWall = createWall(
    input.geometry.internalWidthMm + 2 * input.geometry.wallThicknessMm
  );
  const shortSpanMm = Math.min(
    input.geometry.internalLengthMm,
    input.geometry.internalWidthMm
  );
  const longSpanMm = Math.max(
    input.geometry.internalLengthMm,
    input.geometry.internalWidthMm
  );
  const slabBundle = designClampedPoolSlab({
    shortSpanMm,
    longSpanMm,
    thicknessMm: input.geometry.slabThicknessMm,
    reinforcementCoverMm: input.slabReinforcementCoverMm,
    barDiameterMm: input.slabBarDiameterMm,
    minimumSteelRatio: input.minimumSlabSteelRatio,
    downwardDesignLoadKPa: loadCasesBundle.value.fullPoolDownwardDesignKPa,
    upliftDesignLoadKPa: loadCasesBundle.value.emptyPoolNetUpliftDesignKPa
  }, profile);
  const masonrySpecification = input.masonry ?? DEFAULT_MASONRY_SPECIFICATION;
  const family = DEFAULT_BLOCK_FAMILIES.find(
    (candidate) => candidate.id === masonrySpecification.blockFamilyId
  );
  if (!family) {
    throw new RangeError(`Familia de blocos desconhecida: ${masonrySpecification.blockFamilyId}.`);
  }
  if (!Number.isFinite(masonrySpecification.blockStrengthMPa) || masonrySpecification.blockStrengthMPa < 3) {
    throw new RangeError("fbk do bloco deve ser finito e igual ou superior a 3 MPa.");
  }
  const blockClass = masonrySpecification.blockStrengthMPa >= 8
    ? "A"
    : masonrySpecification.blockStrengthMPa >= 4 ? "B" : "C";
  const modulationBundle = modulatePoolPerimeter({
    internalLengthMm: input.geometry.internalLengthMm,
    internalWidthMm: input.geometry.internalWidthMm,
    wallHeightMm: input.geometry.waterDepthMm,
    wallThicknessMm: input.geometry.wallThicknessMm,
    verticalGroutSpacingMm: masonrySpecification.verticalGroutSpacingMm,
    bondBeamCourseSpacing: masonrySpecification.bondBeamCourseSpacing
  }, family);
  const certificationCheck: EngineeringCheck = {
    id: "block-family-certification",
    status: family.status === "reviewed" ? "PASS" : "REQUIRES_REVIEW",
    demand: family.status === "reviewed" ? 1 : 0,
    resistance: 1,
    unit: "certification",
    message: family.status === "reviewed"
      ? "Familia de blocos possui dados tecnicos revisados."
      : family.status === "catalog"
        ? "Família extraída de catálogo: confirmar certificado, identificação e ensaios do lote fornecido."
        : "Família acadêmica: confirmar fabricante, fbk, prisma, argamassa e graute antes do uso executivo."
  };
  const [catalogMinimumMPa, catalogMaximumMPa] = family.catalogStrengthRangeMPa;
  const strengthInCatalog = family.status === "draft" || (
    masonrySpecification.blockStrengthMPa >= catalogMinimumMPa &&
    masonrySpecification.blockStrengthMPa <= catalogMaximumMPa
  );
  const catalogStrengthCheck: EngineeringCheck = {
    id: "block-strength-in-catalog",
    status: strengthInCatalog ? (family.status === "draft" ? "REQUIRES_REVIEW" : "PASS") : "FAIL",
    demand: masonrySpecification.blockStrengthMPa,
    resistance: catalogMaximumMPa,
    unit: "MPa",
    message: family.status === "draft"
      ? "Família sem faixa resistente de catálogo."
      : `fbk especificado pertence à faixa comercial declarada de ${catalogMinimumMPa} MPa a ${catalogMaximumMPa} MPa.`
  };
  const belowGradeClassCheck: EngineeringCheck = {
    id: "nbr-6136-below-grade-class-a",
    status: blockClass === "A" ? "PASS" : "FAIL",
    demand: masonrySpecification.blockStrengthMPa,
    resistance: 8,
    unit: "MPa",
    message: "Critério conservador da edição 2016 fornecida: aplicação enterrada exige Classe A (fbk ≥ 8 MPa)."
  };
  const currentNormativeEditionCheck: EngineeringCheck = {
    id: "current-block-standard-edition",
    status: "REQUIRES_REVIEW",
    demand: 2016,
    resistance: 2026,
    unit: "year",
    message: "A ABNT NBR 6136:2016 foi cancelada em 27/02/2026; revisar o produto e o lote pela série ABNT NBR 6136-1:2026 vigente."
  };
  const lotAcceptanceCheck: EngineeringCheck = {
    id: "nbr-6136-lot-acceptance",
    status: "REQUIRES_REVIEW",
    demand: 0,
    resistance: 1,
    unit: "document",
    message: "Confirmar no recebimento do lote: identificação, fbk, classe, dimensões, absorção e ensaios de aceitação."
  };
  const requiredVerticalBarSpacingMm = Math.min(
    longWall.design.perpendicular.layout.spacingMm,
    shortWall.design.perpendicular.layout.spacingMm
  );
  const groutSpacingCheck: EngineeringCheck = {
    id: "grout-spacing-covers-vertical-bars",
    status: masonrySpecification.verticalGroutSpacingMm <= requiredVerticalBarSpacingMm ? "PASS" : "FAIL",
    demand: masonrySpecification.verticalGroutSpacingMm,
    resistance: requiredVerticalBarSpacingMm,
    unit: "mm",
    message: "Espaçamento das células grauteadas atende todas as barras verticais calculadas."
  };
  const checks = [
    ...loadCasesBundle.checks,
    ...longWall.checks,
    ...shortWall.checks,
    ...slabBundle.checks,
    ...modulationBundle.checks,
    groutSpacingCheck,
    catalogStrengthCheck,
    belowGradeClassCheck,
    currentNormativeEditionCheck,
    lotAcceptanceCheck,
    certificationCheck
  ];
  const overallStatus = checks.some((check) => check.governing !== false && check.status === "FAIL")
    ? "FAIL"
    : checks.some((check) => check.governing !== false && check.status === "REQUIRES_REVIEW")
      ? "REQUIRES_REVIEW"
      : "PASS";

  return {
    engineVersion: "phase1-1.2.0",
    profileId: profile.id,
    profileVersion: profile.version,
    hydrostatic: hydrostatic.value,
    loadCases: loadCasesBundle.value,
    longWall,
    shortWall,
    slab: slabBundle.value,
    masonry: {
      family,
      blockStrengthMPa: masonrySpecification.blockStrengthMPa,
      blockClass,
      modulation: modulationBundle.value,
      checks: [
        ...modulationBundle.checks,
        groutSpacingCheck,
        catalogStrengthCheck,
        belowGradeClassCheck,
        currentNormativeEditionCheck,
        lotAcceptanceCheck,
        certificationCheck
      ],
      trace: modulationBundle.trace,
      warnings: modulationBundle.warnings
    },
    checks,
    overallStatus,
    warnings: [
      ...loadCasesBundle.warnings,
      ...slabBundle.warnings,
      ...modulationBundle.warnings,
      "Resultado de Fase 1 para pre-dimensionamento; revisao de engenheiro permanece obrigatoria."
    ]
  };
}
