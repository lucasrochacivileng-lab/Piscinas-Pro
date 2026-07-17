import { describe, expect, it } from "vitest";
import { runIntegratedDesign, type IntegratedDesignInput } from "./integrated-design.js";
import { BRAZIL_2026_PRELIMINARY_PROFILE } from "./profiles.js";

const input: IntegratedDesignInput = {
  normativeProfileId: BRAZIL_2026_PRELIMINARY_PROFILE.id,
  geometry: {
    internalLengthMm: 8_000,
    internalWidthMm: 4_000,
    waterDepthMm: 1_400,
    wallThicknessMm: 190,
    slabThicknessMm: 200,
    depthZones: [{ id: "main", label: "Fundo", kind: "MAIN", lengthMm: 8_000, waterDepthMm: 1_400 }]
  },
  saturatedSoilUnitWeightKNM3: 20,
  soilFrictionAngleDegrees: 30,
  groundwaterHeadAboveSlabBottomMm: 0,
  geotechnical: {
    layers: [{
      id: "s1",
      label: "Areia",
      soilType: "SAND",
      topDepthMm: 0,
      bottomDepthMm: 5_000,
      nspt: 12,
      saturatedUnitWeightKNM3: 20,
      frictionAngleDegrees: 32
    }],
    groundwaterDepthBelowGradeMm: 900,
    additionalPermanentResistanceKN: 0
  },
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
    mortarStrengthMPa: 4,
    groutStrengthMPa: 15,
    prismStrengthMPa: 4,
    verticalGroutSpacingMm: 200,
    bondBeamCourseSpacing: 4
  }
};

describe("runIntegratedDesign", () => {
  it("integra perfil SPT, flutuação e propriedades da alvenaria", () => {
    const result = runIntegratedDesign(input, BRAZIL_2026_PRELIMINARY_PROFILE);

    expect(result.integrationVersion).toBe("geotechnical-normative-1.0.0");
    expect(result.profileId).toBe(BRAZIL_2026_PRELIMINARY_PROFILE.id);
    expect(result.profileLabel).toBe(BRAZIL_2026_PRELIMINARY_PROFILE.label);
    expect(result.geotechnical.foundationNspt).toBe(12);
    expect(result.flotation.grossUpliftKN).toBeGreaterThan(0);
    expect(result.masonry?.mortarStrengthMPa).toBe(4);
    expect(result.masonry?.groutStrengthMPa).toBe(15);
    expect(result.masonry?.prismStrengthMPa).toBe(4);
    expect(result.masonry?.prismToBlockEfficiency).toBeCloseTo(0.5);
    expect(result.wallPanels.every((wall) => wall.design.prismStrengthMPa === 4)).toBe(true);
    expect(result.checks.some((check) => check.id === "global-flotation-equilibrium")).toBe(true);
    expect(result.checks.some((check) => check.id === "masonry-mortar-strength")).toBe(true);
    expect(result.checks.some((check) => check.id.endsWith("masonry-prism-compression"))).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/Infinity|NaN/);
  });

  it("reprova argamassa, graute e prisma incompatíveis", () => {
    const result = runIntegratedDesign({
      ...input,
      masonry: {
        ...input.masonry!,
        mortarStrengthMPa: 2,
        groutStrengthMPa: 8,
        prismStrengthMPa: 2
      }
    }, BRAZIL_2026_PRELIMINARY_PROFILE);

    expect(result.checks.find((check) => check.id === "masonry-mortar-strength")?.status).toBe("FAIL");
    expect(result.checks.find((check) => check.id === "masonry-grout-strength")?.status).toBe("FAIL");
    expect(result.checks.find((check) => check.id === "masonry-prism-efficiency-minimum")?.status).toBe("FAIL");
    expect(result.overallStatus).toBe("FAIL");
  });

  it("mantém entrada legada sem perfil geotécnico explícito", () => {
    const { geotechnical: _geotechnical, normativeProfileId: _profile, ...legacy } = input;
    const result = runIntegratedDesign(legacy, BRAZIL_2026_PRELIMINARY_PROFILE);

    expect(result.geotechnical.layers[0]?.id).toBe("legacy-layer");
    expect(result.geotechnical.groundwaterHeadAboveDeepestSlabBottomMm).toBe(input.groundwaterHeadAboveSlabBottomMm);
  });
});
