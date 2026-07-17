import type { EngineeringCheck } from "./engineering.js";
import {
  evaluateGeotechnicalModel,
  type GeotechnicalInput,
  type GeotechnicalResult
} from "./geotechnical.js";
import {
  evaluateMasonryMaterials,
  type MasonryMaterialInput,
  type MasonryMaterialResult
} from "./masonry-materials.js";
import { runPhase1Design, type Phase1DesignInput, type Phase1DesignResult } from "./phase1.js";
import { findStructuralProfile } from "./profiles.js";
import { enhanceSlopedBeachDesign } from "./sloped-beach.js";

export interface IntegratedDesignInput extends Phase1DesignInput {
  readonly structuralProfileId: string;
  readonly geotechnical: GeotechnicalInput;
  readonly masonryMaterials: MasonryMaterialInput;
}

export interface IntegratedDesignResult extends Phase1DesignResult {
  readonly integrationVersion: "geotech-normative-1.1.0";
  readonly geotechnical: GeotechnicalResult;
  readonly masonryMaterials: MasonryMaterialResult;
  readonly normativeProfile: {
    readonly id: string;
    readonly version: string;
    readonly status: "draft" | "reviewed";
    readonly sourceKind: "academic" | "normative";
    readonly references: readonly string[];
  };
}

const overall = (checks: readonly EngineeringCheck[]): IntegratedDesignResult["overallStatus"] =>
  checks.some((check) => check.governing !== false && check.status === "FAIL")
    ? "FAIL"
    : checks.some((check) => check.governing !== false && check.status === "REQUIRES_REVIEW")
      ? "REQUIRES_REVIEW"
      : "PASS";

export function runIntegratedDesign(input: IntegratedDesignInput): IntegratedDesignResult {
  const profile = findStructuralProfile(input.structuralProfileId);
  if (!profile) throw new RangeError(`Perfil estrutural desconhecido: ${input.structuralProfileId}.`);

  const preliminary = runPhase1Design(input, profile);
  const geotechnical = evaluateGeotechnicalModel(
    input.geotechnical,
    preliminary.geometryModel,
    input.geometry.wallThicknessMm,
    input.geometry.slabThicknessMm,
    profile.concreteUnitWeightKNM3,
    input.masonryUnitWeightKNM3,
    profile.waterUnitWeightKNM3,
    profile.actionFactor
  );
  const masonryMaterials = evaluateMasonryMaterials(
    input.masonryMaterials,
    input.masonry?.blockStrengthMPa ?? 8
  );

  const soilAdjustedInput: Phase1DesignInput = {
    ...input,
    saturatedSoilUnitWeightKNM3: geotechnical.wallSoil.saturatedUnitWeightKNM3,
    soilFrictionAngleDegrees: geotechnical.wallSoil.frictionAngleDegrees,
    groundwaterHeadAboveSlabBottomMm: geotechnical.flotation.waterTableHeadAboveDeepestSlabBottomMm
  };
  const baseStructural = runPhase1Design(soilAdjustedInput, profile);
  const structural = enhanceSlopedBeachDesign(soilAdjustedInput, profile, baseStructural);
  const profileCheck: EngineeringCheck = {
    id: "normative-profile-source",
    status: profile.sourceKind === "normative" && profile.status === "reviewed" ? "PASS" : "REQUIRES_REVIEW",
    demand: profile.sourceKind === "normative" ? 1 : 0,
    resistance: 1,
    unit: "profile",
    message: profile.sourceKind === "normative"
      ? `Perfil normativo ${profile.id} v${profile.version} selecionado.`
      : `Perfil acadêmico ${profile.id} v${profile.version}; não liberar emissão executiva.`
  };
  const checks = [
    ...structural.checks,
    ...geotechnical.checks,
    ...masonryMaterials.checks,
    profileCheck
  ];

  return {
    ...structural,
    integrationVersion: "geotech-normative-1.1.0",
    geotechnical,
    masonryMaterials,
    normativeProfile: {
      id: profile.id,
      version: profile.version,
      status: profile.status,
      sourceKind: profile.sourceKind,
      references: profile.references
    },
    checks,
    overallStatus: overall(checks),
    warnings: [
      ...structural.warnings,
      ...geotechnical.warnings,
      ...masonryMaterials.warnings,
      "Perfil normativo e dados de ensaio devem permanecer vinculados à revisão do projeto."
    ]
  };
}
