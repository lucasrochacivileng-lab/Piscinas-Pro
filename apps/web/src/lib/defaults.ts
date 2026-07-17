import type { IntegratedDesignInput } from "@poolstruct/calculation-engine";

export const DEFAULT_DESIGN_INPUT: IntegratedDesignInput = {
  normativeProfileId: "brazil-2026-preliminary",
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
  // Campos legados preservados para abertura de revisões anteriores.
  saturatedSoilUnitWeightKNM3: 20,
  soilFrictionAngleDegrees: 32,
  groundwaterHeadAboveSlabBottomMm: 0,
  geotechnical: {
    layers: [{
      id: "layer-1",
      label: "Areia medianamente compacta",
      soilType: "SAND",
      topDepthMm: 0,
      bottomDepthMm: 5000,
      nspt: 10,
      saturatedUnitWeightKNM3: 20,
      frictionAngleDegrees: 32
    }],
    groundwaterDepthBelowGradeMm: 5000,
    additionalPermanentResistanceKN: 0
  },
  // Valor acadêmico adotado por Silva (2022): 250 kgf/m² ≈ 2,5 kPa.
  imposedFloorLoadKPa: 2.5,
  masonryUnitWeightKNM3: 14,
  // Parede engastada na base e livre no topo: hef = 2h, salvo travamento específico.
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
    mortarStrengthMPa: 4,
    groutStrengthMPa: 15,
    prismStrengthMPa: 4,
    verticalGroutSpacingMm: 200,
    bondBeamCourseSpacing: 4
  }
};
