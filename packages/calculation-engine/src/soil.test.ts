import { describe, expect, it } from "vitest";
import { estimateSoilFromSPT } from "./soil.js";

describe("estimateSoilFromSPT", () => {
  it("reproduz as correlacoes academicas", () => {
    const result = estimateSoilFromSPT(12);
    expect(result.frictionAngleDegrees).toBeCloseTo(32.8);
    expect(result.allowableBearingKgCm2).toBeCloseTo(2.4);
    expect(result.allowableBearingKPa).toBeCloseTo(235.36, 2);
  });

  it("rejeita NSPT fora do dominio adotado", () => {
    expect(() => estimateSoilFromSPT(0)).toThrow(RangeError);
    expect(() => estimateSoilFromSPT(51)).toThrow(RangeError);
  });
});
