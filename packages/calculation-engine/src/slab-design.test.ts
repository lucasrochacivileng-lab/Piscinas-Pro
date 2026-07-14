import { describe, expect, it } from "vitest";
import { SILVA_2022_PHASE1_PROFILE } from "./profiles.js";
import { clampedPlateCoefficients, designClampedPoolSlab } from "./slab-design.js";

describe("clamped slab design", () => {
  it("interpola a tabela de placas engastadas", () => {
    expect(clampedPlateCoefficients(0.5)).toMatchObject({ positiveX: 40.9, negativeX: 82.6 });
    expect(clampedPlateCoefficients(1)).toMatchObject({ positiveX: 21.1, positiveY: 21.1 });
    expect(clampedPlateCoefficients(0.525)?.positiveX).toBeCloseTo(40.25);
    expect(clampedPlateCoefficients(0.49)).toBeNull();
  });

  it("dimensiona as quatro faces e direcoes para carga descendente", () => {
    const result = designClampedPoolSlab({
      shortSpanMm: 4_000,
      longSpanMm: 8_000,
      thicknessMm: 150,
      reinforcementCoverMm: 30,
      barDiameterMm: 10,
      minimumSteelRatio: 0.0015,
      downwardDesignLoadKPa: 29.75,
      upliftDesignLoadKPa: 0
    }, SILVA_2022_PHASE1_PROFILE);

    expect(result.value.downwardMomentsKNMPerM.positiveX).toBeCloseTo(19.47, 2);
    expect(result.value.downwardMomentsKNMPerM.negativeX).toBeCloseTo(39.32, 2);
    expect(result.value.topX.designMomentKNMPerM).toBeGreaterThan(result.value.bottomX.designMomentKNMPerM);
    expect(result.checks.filter((check) => check.status === "PASS")).toHaveLength(4);
  });

  it("inverte o envelope de armadura quando a subpressao governa", () => {
    const result = designClampedPoolSlab({
      shortSpanMm: 4_000,
      longSpanMm: 8_000,
      thicknessMm: 200,
      reinforcementCoverMm: 30,
      barDiameterMm: 10,
      minimumSteelRatio: 0.0015,
      downwardDesignLoadKPa: 5,
      upliftDesignLoadKPa: 40
    }, SILVA_2022_PHASE1_PROFILE);

    expect(result.value.bottomX.designMomentKNMPerM).toBeCloseTo(
      result.value.upliftMomentsKNMPerM.negativeX
    );
    expect(result.value.topX.designMomentKNMPerM).toBeCloseTo(
      result.value.upliftMomentsKNMPerM.positiveX
    );
  });
});
