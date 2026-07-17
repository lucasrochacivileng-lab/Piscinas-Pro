import {
  findBlockWebRequirement,
  findClassCUseLimit,
  findNominalBlockFamily,
  inferLegacyConcreteBlockClass,
  minimumMiterRadiusMm,
  NBR_6136_1_2026_DIMENSIONAL_TOLERANCES,
  validateConcreteBlockStrength,
  type ConcreteBlockClass
} from "./block-standard.js";
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
  /** Classe declarada para o bloco. Opcional apenas para revisões legadas já salvas. */
  readonly blockClass?: ConcreteBlockClass;
  /** fbk especificado para o lote, referido à área bruta. */
  readonly blockStrengthMPa: number;
  readonly verticalGroutSpacingMm: number;
  readonly bondBeamCourseSpacing: number;
}

export const DEFAULT_MASONRY_SPECIFICATION: MasonrySpecificationInput = Object.freeze({
  blockFamilyId: "jb-blocks-20x40",
  blockClass: "A",
  blockStrengthMPa: 8,
  verticalGroutSpacingMm: 200,
  bondBeamCourseSpacing: 4
});

export interface Phase1MasonryResult {
  readonly family: BlockFamily;
  readonly blockStrengthMPa: number;
  readonly blockClass: ConcreteBlockClass;
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
  readonly engineVersion: "phase1-1.3.0";
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
  const blockClass = masonrySpecification.blockClass ??
    inferLegacyConcreteBlockClass(masonrySpecification.blockStrengthMPa);
  const strengthValidation = validateConcreteBlockStrength(
    blockClass,
    masonrySpecification.blockStrengthMPa
  );
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
  const strengthClassCheck: EngineeringCheck = {
    id: "nbr-6136-1-2026-strength-class",
    status: strengthValidation.valid ? "PASS" : "FAIL",
    demand: masonrySpecification.blockStrengthMPa,
    resistance: strengthValidation.rule.minimumMPa,
    unit: "MPa",
    message: strengthValidation.message
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
      : strengthInCatalog
        ? `fbk especificado pertence à faixa comercial declarada de ${catalogMinimumMPa} MPa a ${catalogMaximumMPa} MPa.`
        : `fbk especificado está fora da faixa comercial declarada de ${catalogMinimumMPa} MPa a ${catalogMaximumMPa} MPa.`
  };
  const belowGradeClassCheck: EngineeringCheck = {
    id: "nbr-6136-below-grade-class-a",
    status: strengthValidation.rule.belowGradePermitted ? "PASS" : "FAIL",
    demand: masonrySpecification.blockStrengthMPa,
    resistance: 8,
    unit: "MPa",
    message: "ABNT NBR 6136-1:2026, classificação de uso: aplicação abaixo do nível do solo somente com bloco Classe A."
  };
  const currentNormativeEditionCheck: EngineeringCheck = {
    id: "current-block-standard-edition",
    status: "PASS",
    demand: 2026,
    resistance: 2026,
    unit: "year",
    message: "Classificação, faixas resistentes e parâmetros geométricos referenciados à ABNT NBR 6136-1:2026."
  };
  const fullUnit = family.units.find((unit) => unit.role === "full");
  const fullActualLengthMm = fullUnit?.actualLengthMm ??
    (fullUnit ? fullUnit.nominalLengthMm - family.jointThicknessMm : 0);
  const nominalFamily = findNominalBlockFamily(family.normativeFamily);
  const dimensionalFamilyMatches = nominalFamily !== undefined &&
    nominalFamily.widthMm === family.nominalWidthMm &&
    nominalFamily.fullLengthMm === fullActualLengthMm;
  const dimensionalFamilyCheck: EngineeringCheck = {
    id: "nbr-6136-1-2026-nominal-family",
    status: dimensionalFamilyMatches ? "PASS" : "REQUIRES_REVIEW",
    demand: fullActualLengthMm,
    ...(nominalFamily ? { resistance: nominalFamily.fullLengthMm } : {}),
    unit: "mm",
    message: dimensionalFamilyMatches
      ? `Família ${family.normativeFamily} compatível com as dimensões nominais cadastradas.`
      : `Família ${family.normativeFamily} não pôde ser confirmada integralmente na tabela dimensional cadastrada.`
  };
  const dimensionalToleranceCheck: EngineeringCheck = {
    id: "nbr-6136-1-2026-dimensional-tolerances",
    status: "REQUIRES_REVIEW",
    demand: 0,
    resistance: NBR_6136_1_2026_DIMENSIONAL_TOLERANCES.lengthPlusMinusMm,
    unit: "mm",
    message: `Medir o lote: largura ±${NBR_6136_1_2026_DIMENSIONAL_TOLERANCES.widthPlusMinusMm} mm, altura/comprimento ±${NBR_6136_1_2026_DIMENSIONAL_TOLERANCES.heightPlusMinusMm} mm e paredes com tolerância negativa de ${NBR_6136_1_2026_DIMENSIONAL_TOLERANCES.wallThicknessNegativeMm} mm.`
  };
  const webRequirement = findBlockWebRequirement(
    blockClass,
    family.nominalWidthMm,
    fullActualLengthMm
  );
  const webGeometryCheck: EngineeringCheck = {
    id: "nbr-6136-1-2026-web-geometry",
    status: "REQUIRES_REVIEW",
    demand: 0,
    ...(webRequirement ? { resistance: webRequirement.minimumEquivalentWallMm } : {}),
    unit: "mm",
    message: webRequirement
      ? `Confirmar no lote: paredes longitudinais ≥ ${webRequirement.minimumLongitudinalWallMm} mm, transversais ≥ ${webRequirement.minimumTransverseWallMm} mm e espessura equivalente ≥ ${webRequirement.minimumEquivalentWallMm} mm${webRequirement.minimumVoidDimensionMm === undefined ? "." : `; menor dimensão dos furos ≥ ${webRequirement.minimumVoidDimensionMm} mm.`}`
      : "A geometria interna desta combinação de classe e família exige conferência específica."
  };
  const miterRadiusCheck: EngineeringCheck = {
    id: "nbr-6136-1-2026-miter-radius",
    status: "REQUIRES_REVIEW",
    demand: 0,
    resistance: minimumMiterRadiusMm(blockClass),
    unit: "mm",
    message: `Confirmar raio mínimo das mísulas de ${minimumMiterRadiusMm(blockClass)} mm para a Classe ${blockClass}.`
  };
  const visualInspectionCheck: EngineeringCheck = {
    id: "nbr-6136-1-2026-visual-inspection",
    status: "REQUIRES_REVIEW",
    demand: 0,
    resistance: 1,
    unit: "inspection",
    message: "Registrar inspeção visual do lote quanto à homogeneidade, arestas e defeitos que prejudiquem assentamento, resistência ou durabilidade."
  };
  const classCUseLimit = findClassCUseLimit(family.nominalWidthMm);
  const classCUseLimitCheck: EngineeringCheck = {
    id: "nbr-6136-1-2026-class-c-use-limit",
    governing: false,
    status: blockClass === "C" ? "REQUIRES_REVIEW" : "PASS",
    demand: family.nominalWidthMm,
    ...(classCUseLimit?.maximumStoreys === undefined ? {} : { resistance: classCUseLimit.maximumStoreys }),
    unit: blockClass === "C" ? "storeys" : "project",
    message: blockClass !== "C"
      ? "Para Classes A e B, a limitação de uso segue a especificação do projeto."
      : classCUseLimit === undefined
        ? "Limitação de uso da Classe C não cadastrada para esta largura."
        : classCUseLimit.structuralUsePermitted
          ? `Classe C com largura ${classCUseLimit.widthMm} mm: uso estrutural limitado a ${classCUseLimit.maximumStoreys} pavimento(s).`
          : `Classe C com largura ${classCUseLimit.widthMm} mm: somente uso sem função estrutural.`
  };
  const lotAcceptanceCheck: EngineeringCheck = {
    id: "nbr-6136-lot-acceptance",
    status: "REQUIRES_REVIEW",
    demand: 0,
    resistance: 1,
    unit: "document",
    message: "Confirmar no recebimento: identificação do lote, classe, fbk, dimensões, absorção, inspeção e resultados de ensaio."
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
  const masonryChecks = [
    ...modulationBundle.checks,
    groutSpacingCheck,
    strengthClassCheck,
    catalogStrengthCheck,
    belowGradeClassCheck,
    currentNormativeEditionCheck,
    dimensionalFamilyCheck,
    dimensionalToleranceCheck,
    webGeometryCheck,
    miterRadiusCheck,
    visualInspectionCheck,
    classCUseLimitCheck,
    lotAcceptanceCheck,
    certificationCheck
  ];
  const checks = [
    ...loadCasesBundle.checks,
    ...longWall.checks,
    ...shortWall.checks,
    ...slabBundle.checks,
    ...masonryChecks
  ];
  const overallStatus = checks.some((check) => check.governing !== false && check.status === "FAIL")
    ? "FAIL"
    : checks.some((check) => check.governing !== false && check.status === "REQUIRES_REVIEW")
      ? "REQUIRES_REVIEW"
      : "PASS";

  return {
    engineVersion: "phase1-1.3.0",
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
      checks: masonryChecks,
      trace: modulationBundle.trace,
      warnings: [
        ...modulationBundle.warnings,
        "Dimensões internas, mísulas e inspeção visual dependem de medição e documentação do lote fornecido."
      ]
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
