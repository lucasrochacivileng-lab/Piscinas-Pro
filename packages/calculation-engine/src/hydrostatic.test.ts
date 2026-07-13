import { describe, expect, it } from "vitest";
import { calculateHydrostaticAction } from "./hydrostatic.js";
import { DEMONSTRATION_PROFILE } from "./profiles.js";

const geometry = {
  internalLengthMm: 8_000,
  internalWidthMm: 4_000,
  waterDepthMm: 1_500,
  wallThicknessMm: 200,
  slabThicknessMm: 200
} as const;

describe("calculateHydrostaticAction", () => {
  it("calcula volume, pressoes, resultante e momento em SI", () => {
    const result = calculateHydrostaticAction(geometry, DEMONSTRATION_PROFILE);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.waterVolumeM3).toBeCloseTo(48);
    expect(result.value.approximateCapacityLitres).toBeCloseTo(48_000);
    expect(result.value.maximumWallPressureKPa).toBeCloseTo(14.715);
    expect(result.value.wallResultantKNPerM).toBeCloseTo(11.03625);
    expect(result.value.wallBaseMomentKNMPerM).toBeCloseTo(5.518125);
    expect(result.value.trace).toHaveLength(4);
  });

  it("rejeita entradas nao finitas e fora dos limites operacionais", () => {
    const result = calculateHydrostaticAction(
      { ...geometry, waterDepthMm: Number.NaN, wallThicknessMm: 0 },
      DEMONSTRATION_PROFILE
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "waterDepthMm", code: "NOT_FINITE" }),
      expect.objectContaining({ field: "wallThicknessMm", code: "OUT_OF_RANGE" })
    ]));
  });

  it("preserva a relacao cubica entre profundidade e momento", () => {
    const shallow = calculateHydrostaticAction(geometry, DEMONSTRATION_PROFILE);
    const deep = calculateHydrostaticAction(
      { ...geometry, waterDepthMm: geometry.waterDepthMm * 2 },
      DEMONSTRATION_PROFILE
    );

    expect(shallow.ok && deep.ok).toBe(true);
    if (!shallow.ok || !deep.ok) return;

    expect(deep.value.wallBaseMomentKNMPerM / shallow.value.wallBaseMomentKNMPerM).toBeCloseTo(8);
  });

  it("rejeita perfil de parametros invalido", () => {
    const result = calculateHydrostaticAction(geometry, {
      ...DEMONSTRATION_PROFILE,
      waterUnitWeightKNM3: -1
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatchObject({ field: "profile", code: "INVALID_PROFILE" });
  });
});

