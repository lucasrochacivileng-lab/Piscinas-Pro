import { describe, expect, it } from "vitest";
import { calculatePoolLoadCases } from "./load-cases.js";
import { SILVA_2022_PHASE1_PROFILE } from "./profiles.js";

describe("calculatePoolLoadCases", () => {
  const base = {
    internalLengthMm: 8_000,
    internalWidthMm: 4_000,
    wallHeightMm: 1_600,
    wallThicknessMm: 140,
    slabThicknessMm: 150,
    waterDepthMm: 1_500,
    groundwaterHeadAboveSlabBottomMm: 200,
    imposedFloorLoadKPa: 2.5,
    masonryUnitWeightKNM3: 20
  } as const;

  it("calcula peso proprio, agua e caso cheio", () => {
    const result = calculatePoolLoadCases(base, SILVA_2022_PHASE1_PROFILE);
    expect(result.value.planAreaM2).toBeCloseTo(32);
    expect(result.value.slabSelfWeightKPa).toBeCloseTo(3.75);
    expect(result.value.containedWaterLoadKPa).toBeCloseTo(15);
    expect(result.value.fullPoolDownwardCharacteristicKPa).toBeCloseTo(21.25);
    expect(result.value.wallSelfWeightKNPerM).toBeCloseTo(4.48);
    expect(result.value.wallBaseAxialStressKPa).toBeCloseTo(32);
  });

  it("nao cria uplift liquido quando o peso da laje e suficiente", () => {
    const result = calculatePoolLoadCases(base, SILVA_2022_PHASE1_PROFILE);
    expect(result.value.groundwaterUpliftCharacteristicKPa).toBeCloseTo(2);
    expect(result.value.emptyPoolNetUpliftCharacteristicKPa).toBe(0);
  });

  it("identifica subpressao liquida em lencol elevado", () => {
    const result = calculatePoolLoadCases(
      { ...base, waterDepthMm: 0, imposedFloorLoadKPa: 0, groundwaterHeadAboveSlabBottomMm: 5_000 },
      SILVA_2022_PHASE1_PROFILE
    );
    expect(result.value.emptyPoolNetUpliftCharacteristicKPa).toBeCloseTo(46.25);
    expect(result.value.governingFloorCase).toBe("EMPTY_POOL_UPLIFT");
  });
});
