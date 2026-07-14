import type {
  EngineeringCheck,
  StructuralDesignProfile
} from "./engineering.js";
import { validateStructuralProfile } from "./engineering.js";
import { calculateHydrostaticAction } from "./hydrostatic.js";
import { calculatePoolLoadCases, type PoolLoadCasesResult } from "./load-cases.js";
import { designMasonryPanel, type MasonryDesignResult } from "./masonry-design.js";
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
}

export interface Phase1WallResult {
  readonly actions: WallPanelResult;
  readonly design: MasonryDesignResult;
  readonly checks: readonly EngineeringCheck[];
}

export interface Phase1DesignResult {
  readonly engineVersion: "phase1-1.0.0";
  readonly profileId: string;
  readonly profileVersion: string;
  readonly hydrostatic: HydrostaticResult;
  readonly loadCases: PoolLoadCasesResult;
  readonly longWall: Phase1WallResult;
  readonly shortWall: Phase1WallResult;
  readonly slab: SlabDesignResult;
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
  const checks = [
    ...loadCasesBundle.checks,
    ...longWall.checks,
    ...shortWall.checks,
    ...slabBundle.checks
  ];
  const overallStatus = checks.some((check) => check.governing !== false && check.status === "FAIL")
    ? "FAIL"
    : checks.some((check) => check.governing !== false && check.status === "REQUIRES_REVIEW")
      ? "REQUIRES_REVIEW"
      : "PASS";

  return {
    engineVersion: "phase1-1.0.0",
    profileId: profile.id,
    profileVersion: profile.version,
    hydrostatic: hydrostatic.value,
    loadCases: loadCasesBundle.value,
    longWall,
    shortWall,
    slab: slabBundle.value,
    checks,
    overallStatus,
    warnings: [
      ...loadCasesBundle.warnings,
      ...slabBundle.warnings,
      "Resultado de Fase 1 para pre-dimensionamento; revisao de engenheiro permanece obrigatoria."
    ]
  };
}
