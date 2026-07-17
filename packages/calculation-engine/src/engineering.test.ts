import { describe, expect, it } from "vitest";
import { barAreaMm2, selectBarLayout, validateStructuralProfile } from "./engineering.js";
import { SILVA_2022_PHASE1_PROFILE } from "./profiles.js";

describe("engineering primitives", () => {
  it("seleciona espacamento que fornece area igual ou superior a demanda", () => {
    const layout = selectBarLayout(360, 10, 840);
    expect(barAreaMm2(10)).toBeCloseTo(78.54, 2);
    expect(layout.spacingMm).toBe(210);
    expect(layout.providedAreaMm2PerM).toBeGreaterThanOrEqual(360);
  });

  it("rejeita dados de detalhamento invalidos", () => {
    expect(() => selectBarLayout(0, 10, 200)).toThrow(RangeError);
  });

  it("valida o perfil academico versionado", () => {
    expect(validateStructuralProfile(SILVA_2022_PHASE1_PROFILE)).toEqual([]);
    expect(validateStructuralProfile({
      ...SILVA_2022_PHASE1_PROFILE,
      actionFactor: 0
    })).toContain("actionFactor deve ser positivo e finito.");
  });
});
