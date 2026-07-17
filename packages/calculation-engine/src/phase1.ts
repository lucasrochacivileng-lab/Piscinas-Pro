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
import type { EngineeringCheck, StructuralDesignProfile } from "./engineering.js";
import { validateStructuralProfile } from "./engineering.js";
import {
  buildPoolGeometryModel,
  groundwaterHeadAboveZoneSlabBottomMm,
  type GeometricWallKind,
  type GeometricWallSide,
  type NormalizedDepthZone,
  type PoolGeometryModel
} from "./geometry.js";
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
  readonly blockClass?: ConcreteBlockClass;
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

export interface Phase1WallPanelResult extends Phase1WallResult {
  readonly id: string;
  readonly label: string;
  readonly kind: GeometricWallKind;
  readonly side: GeometricWallSide;
  readonly lengthMm: number;
  readonly heightMm: number;
  readonly zoneId?: string;
  readonly fromZoneId?: string;
  readonly toZoneId?: string;
}

export interface Phase1SlabZoneResult {
  readonly id: string;
  readonly label: string;
  readonly zone: NormalizedDepthZone;
  readonly groundwaterHeadAboveSlabBottomMm: number;
  readonly loadCases: PoolLoadCasesResult;
  readonly design: SlabDesignResult;
  readonly checks: readonly EngineeringCheck[];
}

export interface Phase1DesignResult {
  readonly engineVersion: "phase1-2.0.0";
  readonly profileId: string;
  readonly profileVersion: string;
  readonly geometryModel: PoolGeometryModel;
  readonly hydrostatic: HydrostaticResult;
  readonly loadCases: PoolLoadCasesResult;
  /** Resumos governantes mantidos para compatibilidade com revisões e exportações anteriores. */
  readonly longWall: Phase1WallResult;
  readonly shortWall: Phase1WallResult;
  readonly slab: SlabDesignResult;
  readonly wallPanels: readonly Phase1WallPanelResult[];
  readonly slabZones: readonly Phase1SlabZoneResult[];
  readonly masonry?: Phase1MasonryResult;
  readonly checks: readonly EngineeringCheck[];
  readonly overallStatus: "PASS" | "FAIL" | "REQUIRES_REVIEW";
  readonly warnings: readonly string[];
}

const wallDemand = (wall: Phase1WallResult): number => Math.max(
  wall.actions.designMomentParallelKNMPerM,
  wall.actions.designMomentPerpendicularKNMPerM
);

const slabDemand = (slab: SlabDesignResult): number => Math.max(
  slab.bottomX.adoptedSteelMm2PerM,
  slab.bottomY.adoptedSteelMm2PerM,
  slab.topX.adoptedSteelMm2PerM,
  slab.topY.adoptedSteelMm2PerM
);

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
  const geometryModel = buildPoolGeometryModel(input.geometry);
  const maximumDepthMm = geometryModel.maximumWaterDepthMm;
  const loadCasesBundle = calculatePoolLoadCases({
    internalLengthMm: input.geometry.internalLengthMm,
    internalWidthMm: input.geometry.internalWidthMm,
    wallHeightMm: maximumDepthMm,
    wallThicknessMm: input.geometry.wallThicknessMm,
    slabThicknessMm: input.geometry.slabThicknessMm,
    waterDepthMm: maximumDepthMm,
    groundwaterHeadAboveSlabBottomMm: input.groundwaterHeadAboveSlabBottomMm,
    imposedFloorLoadKPa: input.imposedFloorLoadKPa,
    masonryUnitWeightKNM3: input.masonryUnitWeightKNM3
  }, profile);

  const createWall = (panel: PoolGeometryModel["wallPanels"][number]): Phase1WallPanelResult => {
    const effectiveHeightFactor = panel.kind === "STEP" ? 1 : input.effectiveWallHeightFactor;
    const actionsOutcome = calculateWallPanelActions({
      panelLengthMm: panel.lengthMm,
      panelHeightMm: panel.heightMm,
      wallThicknessMm: input.geometry.wallThicknessMm,
      saturatedSoilUnitWeightKNM3: input.saturatedSoilUnitWeightKNM3,
      soilFrictionAngleDegrees: input.soilFrictionAngleDegrees,
      effectiveHeightFactor,
      ultimateLoadFactor: profile.actionFactor,
      orthogonalityCoefficient: input.orthogonalityCoefficient
    }, hydroProfile);
    if (!actionsOutcome.ok) {
      throw new RangeError(`${panel.label}: ${actionsOutcome.errors.map((error) => error.message).join(" ")}`);
    }
    const designBundle = designMasonryPanel({
      panelLengthMm: panel.lengthMm,
      panelHeightMm: panel.heightMm,
      wallThicknessMm: input.geometry.wallThicknessMm,
      reinforcementCoverMm: input.reinforcementCoverMm,
      barDiameterMm: input.wallBarDiameterMm,
      leverArmFactor: input.wallLeverArmFactor,
      flexuralTensileStrengthParallelMPa: input.flexuralTensileStrengthParallelMPa,
      flexuralTensileStrengthPerpendicularMPa: input.flexuralTensileStrengthPerpendicularMPa,
      forceReinforcedDesign: true,
      panelActions: actionsOutcome.value
    }, profile);
    const checks = designBundle.checks.map((check) => ({
      ...check,
      id: `${panel.id}-${check.id}`,
      message: `${panel.label}: ${check.message}`
    }));
    if (panel.kind === "STEP") {
      checks.push({
        id: `${panel.id}-support-model`,
        status: "REQUIRES_REVIEW",
        demand: panel.heightMm,
        resistance: panel.lengthMm,
        unit: "mm",
        message: `${panel.label}: confirmar ligação monolítica, apoio das lajes e material sob a prainha.`
      });
    }
    return {
      id: panel.id,
      label: panel.label,
      kind: panel.kind,
      side: panel.side,
      lengthMm: panel.lengthMm,
      heightMm: panel.heightMm,
      ...(panel.zoneId ? { zoneId: panel.zoneId } : {}),
      ...(panel.fromZoneId ? { fromZoneId: panel.fromZoneId } : {}),
      ...(panel.toZoneId ? { toZoneId: panel.toZoneId } : {}),
      actions: actionsOutcome.value,
      design: designBundle.value,
      checks
    };
  };

  const wallPanels = geometryModel.wallPanels.map(createWall);
  const longCandidates = wallPanels.filter((wall) => wall.kind === "PERIMETER_LONG");
  const endCandidates = wallPanels.filter((wall) => wall.kind === "PERIMETER_END");
  const longWall = longCandidates.reduce((governing, wall) =>
    wallDemand(wall) > wallDemand(governing) ? wall : governing
  );
  const shortWall = endCandidates.reduce((governing, wall) =>
    wallDemand(wall) > wallDemand(governing) ? wall : governing
  );

  const slabZones: Phase1SlabZoneResult[] = geometryModel.zones.map((zone) => {
    const groundwaterHead = groundwaterHeadAboveZoneSlabBottomMm(
      input.geometry,
      input.groundwaterHeadAboveSlabBottomMm,
      zone.waterDepthMm
    );
    const zoneLoadCases = calculatePoolLoadCases({
      internalLengthMm: zone.lengthMm,
      internalWidthMm: input.geometry.internalWidthMm,
      wallHeightMm: zone.waterDepthMm,
      wallThicknessMm: input.geometry.wallThicknessMm,
      slabThicknessMm: input.geometry.slabThicknessMm,
      waterDepthMm: zone.waterDepthMm,
      groundwaterHeadAboveSlabBottomMm: groundwaterHead,
      imposedFloorLoadKPa: input.imposedFloorLoadKPa,
      masonryUnitWeightKNM3: input.masonryUnitWeightKNM3
    }, profile);
    const shortSpanMm = Math.min(zone.lengthMm, input.geometry.internalWidthMm);
    const trueLongSpanMm = Math.max(zone.lengthMm, input.geometry.internalWidthMm);
    const tableLongSpanMm = Math.min(trueLongSpanMm, 2 * shortSpanMm);
    const designBundle = designClampedPoolSlab({
      shortSpanMm,
      longSpanMm: tableLongSpanMm,
      thicknessMm: input.geometry.slabThicknessMm,
      reinforcementCoverMm: input.slabReinforcementCoverMm,
      barDiameterMm: input.slabBarDiameterMm,
      minimumSteelRatio: input.minimumSlabSteelRatio,
      downwardDesignLoadKPa: zoneLoadCases.value.fullPoolDownwardDesignKPa,
      upliftDesignLoadKPa: zoneLoadCases.value.emptyPoolNetUpliftDesignKPa
    }, profile);
    const checks = designBundle.checks.map((check) => ({
      ...check,
      id: `${zone.id}-${check.id}`,
      message: `${zone.label}: ${check.message}`
    }));
    if (tableLongSpanMm !== trueLongSpanMm) {
      checks.push({
        id: `${zone.id}-slab-aspect-ratio`,
        status: "REQUIRES_REVIEW",
        demand: shortSpanMm / trueLongSpanMm,
        resistance: 0.5,
        unit: "ratio",
        message: `${zone.label}: relação de vãos inferior a 0,5; coeficientes limitados ao bordo da tabela acadêmica e laje unidirecional deve ser revisada.`
      });
    }
    return {
      id: `slab-${zone.id}`,
      label: `Laje — ${zone.label}`,
      zone,
      groundwaterHeadAboveSlabBottomMm: groundwaterHead,
      loadCases: zoneLoadCases.value,
      design: designBundle.value,
      checks
    };
  });
  const governingSlabZone = slabZones.reduce((governing, candidate) =>
    slabDemand(candidate.design) > slabDemand(governing.design) ? candidate : governing
  );
  const slab = governingSlabZone.design;

  const masonrySpecification = input.masonry ?? DEFAULT_MASONRY_SPECIFICATION;
  const family = DEFAULT_BLOCK_FAMILIES.find(
    (candidate) => candidate.id === masonrySpecification.blockFamilyId
  );
  if (!family) throw new RangeError(`Familia de blocos desconhecida: ${masonrySpecification.blockFamilyId}.`);
  if (!Number.isFinite(masonrySpecification.blockStrengthMPa) || masonrySpecification.blockStrengthMPa < 3) {
    throw new RangeError("fbk do bloco deve ser finito e igual ou superior a 3 MPa.");
  }
  const blockClass = masonrySpecification.blockClass ??
    inferLegacyConcreteBlockClass(masonrySpecification.blockStrengthMPa);
  const strengthValidation = validateConcreteBlockStrength(blockClass, masonrySpecification.blockStrengthMPa);
  const modulationBundle = modulatePoolPerimeter({
    internalLengthMm: input.geometry.internalLengthMm,
    internalWidthMm: input.geometry.internalWidthMm,
    wallHeightMm: maximumDepthMm,
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
  const webRequirement = findBlockWebRequirement(blockClass, family.nominalWidthMm, fullActualLengthMm);
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
    ...wallPanels.map((wall) => wall.design.perpendicular.layout.spacingMm)
  );
  const groutSpacingCheck: EngineeringCheck = {
    id: "grout-spacing-covers-vertical-bars",
    status: masonrySpecification.verticalGroutSpacingMm <= requiredVerticalBarSpacingMm ? "PASS" : "FAIL",
    demand: masonrySpecification.verticalGroutSpacingMm,
    resistance: requiredVerticalBarSpacingMm,
    unit: "mm",
    message: "Espaçamento das células grauteadas atende todas as barras verticais calculadas."
  };
  const multiDepthModulationCheck: EngineeringCheck = {
    id: "multi-depth-masonry-modulation",
    status: geometryModel.hasMultipleDepths ? "REQUIRES_REVIEW" : "PASS",
    demand: geometryModel.zones.length,
    resistance: 1,
    unit: "zones",
    message: geometryModel.hasMultipleDepths
      ? "Paginação por zonas e encontros com degraus deve ser conferida individualmente; o resumo perimetral usa a maior altura."
      : "Piscina com profundidade única para a modulação perimetral."
  };
  const masonryChecks = [
    ...modulationBundle.checks,
    groutSpacingCheck,
    multiDepthModulationCheck,
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
    ...wallPanels.flatMap((wall) => wall.checks),
    ...slabZones.flatMap((zone) => zone.checks),
    ...masonryChecks
  ];
  const overallStatus = checks.some((check) => check.governing !== false && check.status === "FAIL")
    ? "FAIL"
    : checks.some((check) => check.governing !== false && check.status === "REQUIRES_REVIEW")
      ? "REQUIRES_REVIEW"
      : "PASS";

  return {
    engineVersion: "phase1-2.0.0",
    profileId: profile.id,
    profileVersion: profile.version,
    geometryModel,
    hydrostatic: hydrostatic.value,
    loadCases: loadCasesBundle.value,
    longWall,
    shortWall,
    slab,
    wallPanels,
    slabZones,
    masonry: {
      family,
      blockStrengthMPa: masonrySpecification.blockStrengthMPa,
      blockClass,
      modulation: modulationBundle.value,
      checks: masonryChecks,
      trace: modulationBundle.trace,
      warnings: [
        ...modulationBundle.warnings,
        ...(geometryModel.hasMultipleDepths ? ["Modulação vertical segmentada por profundidade exige revisão dos encontros e degraus."] : []),
        "Dimensões internas, mísulas e inspeção visual dependem de medição e documentação do lote fornecido."
      ]
    },
    checks,
    overallStatus,
    warnings: [
      ...loadCasesBundle.warnings,
      ...slabZones.flatMap((zone) => zone.design.warnings),
      ...modulationBundle.warnings,
      ...(geometryModel.hasMultipleDepths ? ["Modelo geométrico com múltiplas profundidades e paredes individualizadas ativo."] : []),
      "Resultado de Fase 1 para pre-dimensionamento; revisao de engenheiro permanece obrigatoria."
    ]
  };
}
