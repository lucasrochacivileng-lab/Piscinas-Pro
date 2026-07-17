import { describe, expect, it } from "vitest";
import { runPhase1Design, type Phase1DesignInput } from "./phase1.js";
import { SILVA_2022_PHASE1_PROFILE } from "./profiles.js";

const baseline: Phase1DesignInput = {
  geometry: {
    internalLengthMm: 8000,
    internalWidthMm: 4000,
    waterDepthMm: 1400,
    wallThicknessMm: 190,
    slabThicknessMm: 200
  },
  saturatedSoilUnitWeightKNM3: 20,
  soilFrictionAngleDegrees: 30,
  groundwaterHeadAboveSlabBottomMm: 0,
  imposedFloorLoadKPa: 0,
  masonryUnitWeightKNM3: 14,
  effectiveWallHeightFactor: 1,
  orthogonalityCoefficient: 0.5,
  reinforcementCoverMm: 30,
  wallBarDiameterMm: 10,
  wallLeverArmFactor: 0.8,
  flexuralTensileStrengthParallelMPa: 0.8,
  flexuralTensileStrengthPerpendicularMPa: 0.4,
  slabReinforcementCoverMm: 30,
  slabBarDiameterMm: 10,
  minimumSlabSteelRatio: 0.0015
};

function expectFiniteTree(value: unknown): void {
  if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
  else if (Array.isArray(value)) value.forEach(expectFiniteTree);
  else if (value && typeof value === "object") Object.values(value).forEach(expectFiniteTree);
}

describe("regressões integradas da Fase 3", () => {
  it("mantém o golden case residencial", () => {
    const result = runPhase1Design(baseline, SILVA_2022_PHASE1_PROFILE);
    expect(result.hydrostatic.approximateCapacityLitres).toBe(44_800);
    expect(result.hydrostatic.maximumWallPressureKPa).toBe(14);
    expect(result.hydrostatic.wallBaseMomentKNMPerM).toBeCloseTo(4.5733333333, 8);
    expect(result.engineVersion).toBe("phase1-1.3.0");
  });

  it("é determinístico para entradas e perfil idênticos", () => {
    expect(runPhase1Design(baseline, SILVA_2022_PHASE1_PROFILE)).toEqual(
      runPhase1Design(baseline, SILVA_2022_PHASE1_PROFILE)
    );
  });

  it("aumentar a lâmina aumenta pressão, momento e volume", () => {
    const shallow = runPhase1Design({ ...baseline, geometry: { ...baseline.geometry, waterDepthMm: 1000 } }, SILVA_2022_PHASE1_PROFILE);
    const deep = runPhase1Design({ ...baseline, geometry: { ...baseline.geometry, waterDepthMm: 1800 } }, SILVA_2022_PHASE1_PROFILE);
    expect(deep.hydrostatic.maximumWallPressureKPa).toBeGreaterThan(shallow.hydrostatic.maximumWallPressureKPa);
    expect(deep.hydrostatic.wallBaseMomentKNMPerM).toBeGreaterThan(shallow.hydrostatic.wallBaseMomentKNMPerM);
    expect(deep.hydrostatic.waterVolumeM3).toBeGreaterThan(shallow.hydrostatic.waterVolumeM3);
  });

  it("aumentar apenas a planta aumenta o volume sem alterar pressão hidrostática", () => {
    const larger = runPhase1Design({ ...baseline, geometry: { ...baseline.geometry, internalLengthMm: 10_000, internalWidthMm: 5000 } }, SILVA_2022_PHASE1_PROFILE);
    const reference = runPhase1Design(baseline, SILVA_2022_PHASE1_PROFILE);
    expect(larger.hydrostatic.waterVolumeM3).toBeGreaterThan(reference.hydrostatic.waterVolumeM3);
    expect(larger.hydrostatic.maximumWallPressureKPa).toBe(reference.hydrostatic.maximumWallPressureKPa);
  });

  it("não produz NaN ou infinito na matriz operacional", () => {
    for (const length of [6000, 8000, 10_000]) {
      for (const depth of [1000, 1400, 1800]) {
        const input = { ...baseline, geometry: { ...baseline.geometry, internalLengthMm: length, internalWidthMm: length / 2, waterDepthMm: depth } };
        expectFiniteTree(runPhase1Design(input, SILVA_2022_PHASE1_PROFILE));
      }
    }
  });

  it("rejeita valores não finitos antes de emitir resultado", () => {
    const invalid = { ...baseline, saturatedSoilUnitWeightKNM3: Number.NaN };
    expect(() => runPhase1Design(invalid, SILVA_2022_PHASE1_PROFILE)).toThrow(RangeError);
  });
});
