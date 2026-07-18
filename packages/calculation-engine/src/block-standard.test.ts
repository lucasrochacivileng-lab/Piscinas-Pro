import { describe, expect, it } from "vitest";
import {
  absorptionLimitsPercent,
  findBlockWebRequirement,
  findClassCUseLimit,
  findNominalBlockFamily,
  inferLegacyConcreteBlockClass,
  minimumMiterRadiusMm,
  NBR_6136_1_2026_PHYSICAL_REQUIREMENTS,
  validateConcreteBlockStrength
} from "./block-standard.js";

describe("ABNT NBR 6136-1:2026 block rules", () => {
  it("aplica as faixas e incrementos de resistência por classe", () => {
    expect(validateConcreteBlockStrength("A", 8).valid).toBe(true);
    expect(validateConcreteBlockStrength("A", 10).valid).toBe(true);
    expect(validateConcreteBlockStrength("A", 9).valid).toBe(false);
    expect(validateConcreteBlockStrength("B", 4).valid).toBe(true);
    expect(validateConcreteBlockStrength("B", 6).valid).toBe(true);
    expect(validateConcreteBlockStrength("B", 5).valid).toBe(false);
    expect(validateConcreteBlockStrength("B", 8).valid).toBe(false);
    expect(validateConcreteBlockStrength("C", 3).valid).toBe(true);
    expect(validateConcreteBlockStrength("C", 7).valid).toBe(true);
  });

  it("mantém inferência conservadora para revisões antigas", () => {
    expect(inferLegacyConcreteBlockClass(8)).toBe("A");
    expect(inferLegacyConcreteBlockClass(6)).toBe("B");
    expect(inferLegacyConcreteBlockClass(5)).toBe("C");
  });

  it("cadastra famílias dimensionais e requisitos geométricos", () => {
    expect(findNominalBlockFamily("20 x 40")?.fullLengthMm).toBe(390);
    expect(findNominalBlockFamily("12,5 x 25")?.halfLengthMm).toBe(115);
    expect(findBlockWebRequirement("A", 190, 390)?.minimumEquivalentWallMm).toBe(74);
    expect(findBlockWebRequirement("C", 90, 290)?.minimumEquivalentWallMm).toBe(44);
    expect(minimumMiterRadiusMm("A")).toBe(40);
    expect(minimumMiterRadiusMm("C")).toBe(20);
  });

  it("cadastra os requisitos físicos ensaiados conforme a NBR 6136-2", () => {
    expect(NBR_6136_1_2026_PHYSICAL_REQUIREMENTS.maximumDryingShrinkagePercent).toBe(0.055);
    expect(NBR_6136_1_2026_PHYSICAL_REQUIREMENTS.initialWaterAbsorptionTestRequired).toBe(true);
    expect(absorptionLimitsPercent("normal")).toEqual({ individual: 11, mean: 10 });
    expect(absorptionLimitsPercent("lightweight")).toEqual({ individual: 16, mean: 13 });
  });

  it("mantém o limite individual de absorção acima da média em ambos os agregados", () => {
    for (const aggregate of ["normal", "lightweight"] as const) {
      const limits = absorptionLimitsPercent(aggregate);
      expect(limits.individual).toBeGreaterThan(limits.mean);
    }
  });

  it("cadastra as limitações de uso da Classe C por largura", () => {
    expect(findClassCUseLimit(190)?.maximumStoreys).toBe(5);
    expect(findClassCUseLimit(140)?.maximumStoreys).toBe(2);
    expect(findClassCUseLimit(90)?.maximumStoreys).toBe(1);
    expect(findClassCUseLimit(65)?.structuralUsePermitted).toBe(false);
  });
});
