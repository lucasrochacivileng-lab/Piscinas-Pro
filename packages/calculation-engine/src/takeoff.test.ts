import { describe, expect, it } from "vitest";
import { estimateCosts } from "./costing.js";
import { BLOCK_FAMILY_M20 } from "./modulation.js";
import { runPhase1Design } from "./phase1.js";
import { SILVA_2022_PHASE1_PROFILE } from "./profiles.js";
import { takeoffPoolQuantities } from "./quantities.js";
import type { PoolGeometryInput } from "./types.js";

const geometry: PoolGeometryInput = {
  internalLengthMm: 8_000,
  internalWidthMm: 4_000,
  waterDepthMm: 1_400,
  wallThicknessMm: 140,
  slabThicknessMm: 150
};

const input = {
  geometry,
  saturatedSoilUnitWeightKNM3: 19,
  soilFrictionAngleDegrees: 30,
  groundwaterHeadAboveSlabBottomMm: 200,
  imposedFloorLoadKPa: 2.5,
  masonryUnitWeightKNM3: 20,
  effectiveWallHeightFactor: 2,
  orthogonalityCoefficient: 0.5,
  reinforcementCoverMm: 50,
  wallBarDiameterMm: 10,
  wallLeverArmFactor: 0.95,
  flexuralTensileStrengthParallelMPa: 0.5,
  flexuralTensileStrengthPerpendicularMPa: 0.25,
  slabReinforcementCoverMm: 30,
  slabBarDiameterMm: 10,
  minimumSlabSteelRatio: 0.0015
} as const;

describe("levantamento de quantitativos da piscina", () => {
  const result = runPhase1Design(input, SILVA_2022_PHASE1_PROFILE);

  it("consolida blocos, aco, graute e concreto com perdas", () => {
    const quantities = takeoffPoolQuantities(geometry, result, BLOCK_FAMILY_M20);
    expect(quantities.totalBlocks).toBeGreaterThan(0);
    expect(quantities.totalSteelKg).toBeGreaterThan(0);
    expect(quantities.totalGroutM3).toBeGreaterThan(0);
    // Concreto da laje 8,28 x 4,28 x 0,15 m com 10% de perda.
    expect(quantities.totalConcreteM3).toBeCloseTo(8.28 * 4.28 * 0.15 * 1.1, 2);
    expect(quantities.wasteFactor).toBe(1.1);
  });

  it("alimenta a estimativa de custos de ponta a ponta", () => {
    const quantities = takeoffPoolQuantities(geometry, result, BLOCK_FAMILY_M20);
    const estimate = estimateCosts(quantities);
    expect(estimate.totalBRL).toBeGreaterThan(0);
    expect(estimate.netBRL).toBeLessThan(estimate.totalBRL);
    expect(estimate.lines).toHaveLength(4);
  });

  it("e deterministico para a mesma entrada", () => {
    const first = takeoffPoolQuantities(geometry, result, BLOCK_FAMILY_M20);
    const second = takeoffPoolQuantities(geometry, result, BLOCK_FAMILY_M20);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
