import { describe, expect, it } from "vitest";
import { calculateMaterialQuantities, steelBarMassKg } from "./quantities.js";

describe("material quantities", () => {
  it("calcula massa de barras pela densidade do aco", () => {
    expect(steelBarMassKg(10, 12_000)).toBeCloseTo(7.4, 1);
  });

  it("calcula blocos, graute, concreto e perdas por elemento", () => {
    const result = calculateMaterialQuantities([
      {
        id: "wall-1",
        occurrences: 2,
        lengthMm: 5_280,
        heightMm: 1_600,
        blockLengthMm: 290,
        blockHeightMm: 190,
        verticalGroutedCells: 7,
        horizontalGroutedCourses: 2,
        verticalHoleAreaMm2: 8_000,
        horizontalChannelAreaMm2: 7_000,
        steel: [{ diameterMm: 10, count: 20, lengthMm: 1_600 }]
      }
    ], [
      {
        id: "slab",
        occurrences: 1,
        lengthMm: 8_000,
        widthMm: 4_000,
        thicknessMm: 150,
        steel: [{ diameterMm: 10, count: 40, lengthMm: 8_000 }]
      }
    ]);

    expect(result.totalBlocks).toBe(Math.ceil(19 * 9 * 2 * 1.1));
    expect(result.totalSteelKg).toBeGreaterThan(0);
    expect(result.totalGroutM3).toBeGreaterThan(0);
    expect(result.totalConcreteM3).toBeCloseTo(5.28);
  });
});
