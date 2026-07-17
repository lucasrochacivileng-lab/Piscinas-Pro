import { describe, expect, it } from "vitest";
import { runIntegratedDesign } from "./integrated-design.js";

const input = {
  structuralProfileId: "brazil-2026-normative-review",
  geometry: {
    internalLengthMm: 8_000,
    internalWidthMm: 4_000,
    waterDepthMm: 1_400,
    wallThicknessMm: 190,
    slabThicknessMm: 200,
    depthZones: [{ id: "main", label: "Fundo principal", kind: "MAIN" as const, lengthMm: 8_000, waterDepthMm: 1_400 }]
  },
  saturatedSoilUnitWeightKNM3: 20,
  soilFrictionAngleDegrees: 30,
  groundwaterHeadAboveSlabBottomMm: 0,
  imposedFloorLoadKPa: 2.5,
  masonryUnitWeightKNM3: 14,
  effectiveWallHeightFactor: 2,
  orthogonalityCoefficient: 0.5,
  reinforcementCoverMm: 30,
  wallBarDiameterMm: 10,
  wallLeverArmFactor: 0.8,
  flexuralTensileStrengthParallelMPa: 0.8,
  flexuralTensileStrengthPerpendicularMPa: 0.4,
  slabReinforcementCoverMm: 30,
  slabBarDiameterMm: 10,
  minimumSlabSteelRatio: 0.0015,
  masonry: {
    blockFamilyId: "jb-blocks-20x40",
    blockClass: "A" as const,
    blockStrengthMPa: 8,
    verticalGroutSpacingMm: 200,
    bondBeamCourseSpacing: 4
  },
  geotechnical: {
    groundLevelToWaterLevelMm: 1_000,
    excavationBottomDepthMm: 1_900,
    permanentSoilCoverThicknessMm: 150,
    permanentSoilCoverUnitWeightKNM3: 18,
    additionalPermanentBallastKN: 20,
    flotationSafetyFactor: 1.1,
    layers: [{
      id: "layer-1", label: "Areia média", topDepthMm: 0, bottomDepthMm: 5_000,
      nspt: 18, material: "SAND" as const
    }]
  },
  masonryMaterials: {
    mortarCompressiveStrengthMPa: 6,
    groutCompressiveStrengthMPa: 20,
    prismCharacteristicStrengthMPa: 5.2,
    mortarJointThicknessMm: 10,
    source: "TEST_REPORT" as const
  }
};

describe("integrated design", () => {
  it("usa o perfil normativo e injeta solo derivado no cálculo estrutural", () => {
    const result = runIntegratedDesign(input);
    expect(result.integrationVersion).toBe("geotech-normative-1.0.0");
    expect(result.normativeProfile.sourceKind).toBe("normative");
    expect(result.geotechnical.wallSoil.nspt).toBe(18);
    expect(result.masonryMaterials.prismEfficiency).toBeCloseTo(0.65);
    expect(result.checks.some((check) => check.id === "global-flotation")).toBe(true);
  });

  it("rejeita perfil inexistente", () => {
    expect(() => runIntegratedDesign({ ...input, structuralProfileId: "missing" })).toThrow(RangeError);
  });
});
