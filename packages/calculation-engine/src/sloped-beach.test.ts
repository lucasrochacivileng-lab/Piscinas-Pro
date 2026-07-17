import { describe, expect, it } from "vitest";
import { buildPoolGeometryModel, poolWaterVolumeM3 } from "./geometry.js";
import { runIntegratedDesign, type IntegratedDesignInput } from "./integrated-design.js";

const input: IntegratedDesignInput = {
  structuralProfileId: "brazil-2026-normative-review",
  geometry: {
    internalLengthMm: 8000,
    internalWidthMm: 4000,
    waterDepthMm: 1400,
    wallThicknessMm: 190,
    slabThicknessMm: 200,
    depthZones: [
      {
        id: "beach",
        label: "Praia",
        kind: "BEACH",
        lengthMm: 5000,
        waterDepthMm: 1400,
        floorProfile: "SLOPED",
        startWaterDepthMm: 0,
        endWaterDepthMm: 1400
      },
      {
        id: "main",
        label: "Fundo principal",
        kind: "MAIN",
        lengthMm: 3000,
        waterDepthMm: 1400,
        floorProfile: "HORIZONTAL",
        startWaterDepthMm: 1400,
        endWaterDepthMm: 1400
      }
    ]
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
    blockClass: "A",
    blockStrengthMPa: 8,
    verticalGroutSpacingMm: 200,
    bondBeamCourseSpacing: 4
  },
  geotechnical: {
    groundLevelToWaterLevelMm: 3000,
    excavationBottomDepthMm: 1900,
    permanentSoilCoverThicknessMm: 100,
    permanentSoilCoverUnitWeightKNM3: 18,
    additionalPermanentBallastKN: 0,
    flotationSafetyFactor: 1.1,
    layers: [{
      id: "layer-1",
      label: "Camada 1",
      topDepthMm: 0,
      bottomDepthMm: 5000,
      nspt: 10,
      material: "SILTY_SAND"
    }]
  },
  masonryMaterials: {
    mortarCompressiveStrengthMPa: 6,
    groutCompressiveStrengthMPa: 20,
    prismCharacteristicStrengthMPa: 5.2,
    groutSlumpMm: 220,
    mortarJointThicknessMm: 10,
    testAgeDays: 28,
    source: "ACADEMIC_ESTIMATE"
  }
};

describe("sloped beach geometry", () => {
  it("models a continuous beach without creating a false step", () => {
    const model = buildPoolGeometryModel(input.geometry);
    const beach = model.zones[0]!;

    expect(model.hasSlopedFloor).toBe(true);
    expect(model.transitions).toHaveLength(0);
    expect(beach.averageWaterDepthMm).toBe(700);
    expect(beach.floorLengthMm).toBeCloseTo(Math.hypot(5000, 1400), 6);
    expect(beach.slopePercent).toBeCloseTo(28, 6);
    expect(poolWaterVolumeM3(input.geometry)).toBeCloseTo(30.8, 6);
    expect(model.wallPanels.filter((panel) => panel.zoneId === "beach" && panel.side === "NORTH")).toHaveLength(5);
  });

  it("uses the true ramp length and average water depth in slab pre-design", () => {
    const result = runIntegratedDesign(input);
    const beachSlab = result.slabZones.find((zone) => zone.zone.id === "beach")!;

    expect(result.integrationVersion).toBe("geotech-normative-1.1.0");
    expect(beachSlab.label).toContain("Laje inclinada");
    expect(beachSlab.zone.floorLengthMm).toBeGreaterThan(beachSlab.zone.lengthMm);
    expect(beachSlab.loadCases.containedWaterLoadKPa).toBeCloseTo(7, 6);
    expect(beachSlab.checks.some((check) => check.id === "beach-sloped-slab-model")).toBe(true);
    expect(result.hydrostatic.zones[0]?.startFloorPressureKPa).toBe(0);
    expect(result.hydrostatic.zones[0]?.endFloorPressureKPa).toBeCloseTo(14, 6);
    expect(result.overallStatus).toBe("REQUIRES_REVIEW");
  });
});
