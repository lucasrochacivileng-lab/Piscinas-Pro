import { describe, expect, it } from "vitest";
import { calculateGlobalFlotation } from "./flotation.js";
import { BRAZIL_2026_PRELIMINARY_PROFILE } from "./profiles.js";
import { analyzeSoilProfile } from "./soil.js";

const geometry = {
  internalLengthMm: 8_000,
  internalWidthMm: 4_000,
  waterDepthMm: 1_600,
  wallThicknessMm: 190,
  slabThicknessMm: 200,
  depthZones: [
    { id: "beach", label: "Prainha", kind: "SHALLOW" as const, lengthMm: 1_600, waterDepthMm: 400 },
    { id: "main", label: "Fundo", kind: "MAIN" as const, lengthMm: 6_400, waterDepthMm: 1_600 }
  ]
};

const geotechnical = {
  layers: [
    { id: "s1", label: "Areia fofa", soilType: "SAND" as const, topDepthMm: 0, bottomDepthMm: 1_000, nspt: 4, saturatedUnitWeightKNM3: 18, frictionAngleDegrees: 29 },
    { id: "s2", label: "Areia compacta", soilType: "SAND" as const, topDepthMm: 1_000, bottomDepthMm: 5_000, nspt: 18, saturatedUnitWeightKNM3: 20, frictionAngleDegrees: 35 }
  ],
  groundwaterDepthBelowGradeMm: 600,
  additionalPermanentResistanceKN: 0
};

describe("integração geotécnica", () => {
  it("resolve camada de apoio, NSPT e parâmetros representativos", () => {
    const result = analyzeSoilProfile(geotechnical, geometry);

    expect(result.analysisDepthMm).toBe(1_800);
    expect(result.foundationLayerId).toBe("s2");
    expect(result.foundationNspt).toBe(18);
    expect(result.representativeFrictionAngleDegrees).toBe(29);
    expect(result.representativeSaturatedUnitWeightKNM3).toBeCloseTo((18 * 1_000 + 20 * 800) / 1_800);
    expect(result.groundwaterHeadAboveDeepestSlabBottomMm).toBe(1_200);
    expect(result.foundationAllowableBearingKPa).toBeGreaterThan(300);
    expect(result.checks.find((check) => check.id === "soil-profile-continuity")?.status).toBe("PASS");
  });

  it("reprova perfil que não alcança a base", () => {
    const result = analyzeSoilProfile({
      ...geotechnical,
      layers: [{ ...geotechnical.layers[0]!, bottomDepthMm: 1_200 }]
    }, geometry);

    expect(result.checks.find((check) => check.id === "soil-profile-foundation-coverage")?.status).toBe("FAIL");
  });

  it("calcula equilíbrio global da piscina vazia", () => {
    const soil = analyzeSoilProfile(geotechnical, geometry);
    const result = calculateGlobalFlotation({
      geometry,
      groundwaterHeadAboveDeepestSlabBottomMm: soil.groundwaterHeadAboveDeepestSlabBottomMm,
      masonryUnitWeightKNM3: 14,
      additionalPermanentResistanceKN: 0
    }, BRAZIL_2026_PRELIMINARY_PROFILE);

    expect(result.grossUpliftKN).toBeGreaterThan(0);
    expect(result.slabWeightKN).toBeGreaterThan(0);
    expect(result.wallWeightKN).toBeGreaterThan(0);
    expect(result.safetyFactor).not.toBeNull();
    expect(result.checks).toHaveLength(1);
    expect(JSON.stringify(result)).not.toMatch(/Infinity|NaN/);
  });
});
