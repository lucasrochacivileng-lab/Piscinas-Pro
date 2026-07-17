import { describe, expect, it } from "vitest";
import { evaluateMasonryMaterials } from "./masonry-materials.js";

describe("masonry materials", () => {
  it("calcula eficiência do prisma e valida relatório de ensaio", () => {
    const result = evaluateMasonryMaterials({
      mortarCompressiveStrengthMPa: 6,
      groutCompressiveStrengthMPa: 20,
      prismCharacteristicStrengthMPa: 5.2,
      mortarJointThicknessMm: 10,
      groutSlumpMm: 220,
      testAgeDays: 28,
      source: "TEST_REPORT"
    }, 8);
    expect(result.prismEfficiency).toBeCloseTo(0.65);
    expect(result.checks.find((check) => check.id === "masonry-material-test-source")?.status).toBe("PASS");
  });

  it("mantém revisão quando os valores não possuem ensaio", () => {
    const result = evaluateMasonryMaterials({
      mortarCompressiveStrengthMPa: 4,
      groutCompressiveStrengthMPa: 15,
      prismCharacteristicStrengthMPa: 4,
      source: "ACADEMIC_ESTIMATE"
    }, 8);
    expect(result.checks.some((check) => check.status === "REQUIRES_REVIEW")).toBe(true);
  });

  it("rejeita resistências inválidas", () => {
    expect(() => evaluateMasonryMaterials({
      mortarCompressiveStrengthMPa: 0,
      groutCompressiveStrengthMPa: 15,
      prismCharacteristicStrengthMPa: 4,
      source: "TEST_REPORT"
    }, 8)).toThrow(RangeError);
  });
});
