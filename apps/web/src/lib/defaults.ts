import type { IntegratedDesignInput } from "@poolstruct/calculation-engine";

export const DEFAULT_DESIGN_INPUT: IntegratedDesignInput = {
  structuralProfileId: "brazil-2026-normative-review",
  geometry: {
    internalLengthMm: 8000,
    internalWidthMm: 4000,
    waterDepthMm: 1400,
    wallThicknessMm: 190,
    slabThicknessMm: 200,
    depthZones: [{
      id: "main",
      label: "Fundo principal",
      kind: "MAIN",
      lengthMm: 8000,
      waterDepthMm: 1400
    }]
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
