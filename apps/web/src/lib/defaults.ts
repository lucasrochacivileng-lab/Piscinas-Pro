import type { Phase1DesignInput } from "@poolstruct/calculation-engine";

export const DEFAULT_DESIGN_INPUT: Phase1DesignInput = {
  geometry: {
    internalLengthMm: 8000,
    internalWidthMm: 4000,
    waterDepthMm: 1400,
    wallThicknessMm: 190,
    slabThicknessMm: 200
  },
  saturatedSoilUnitWeightKNM3: 20,
  soilFrictionAngleDegrees: 30,
  groundwaterHeadAboveSlabBottomMm: 0,
  imposedFloorLoadKPa: 0,
  masonryUnitWeightKNM3: 14,
  effectiveWallHeightFactor: 1,
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
    blockStrengthMPa: 8,
    verticalGroutSpacingMm: 200,
    bondBeamCourseSpacing: 4
  }
};
