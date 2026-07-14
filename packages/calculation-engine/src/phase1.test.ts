import { describe, expect, it } from "vitest";
import { runPhase1Design } from "./phase1.js";
import { SILVA_2022_PHASE1_PROFILE } from "./profiles.js";

describe("runPhase1Design", () => {
  const input = {
      geometry: {
        internalLengthMm: 8_000,
        internalWidthMm: 4_000,
        waterDepthMm: 1_400,
        wallThicknessMm: 140,
        slabThicknessMm: 150
      },
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

  it("executa o fluxo completo da Fase 1 para piscina 8 x 4 m", () => {
    const result = runPhase1Design(input, SILVA_2022_PHASE1_PROFILE);

    expect(result.engineVersion).toBe("phase1-1.0.0");
    expect(result.hydrostatic.waterVolumeM3).toBeCloseTo(44.8);
    expect(result.longWall.actions.analysisMethod).toBe("VERTICAL_CANTILEVER");
    expect(result.shortWall.actions.analysisMethod).toBe("TWO_WAY_TABLE");
    expect(result.slab.bottomX.layout.providedAreaMm2PerM).toBeGreaterThan(0);
    expect(result.checks.length).toBeGreaterThan(10);
    expect(result.overallStatus).toBe("REQUIRES_REVIEW");
  });

  it("propaga falha governante para o estado global", () => {
    const result = runPhase1Design(input, {
      ...SILVA_2022_PHASE1_PROFILE,
      reinforcedSlendernessLimit: 1
    });
    expect(result.overallStatus).toBe("FAIL");
    expect(result.checks.some((check) => check.governing !== false && check.status === "FAIL")).toBe(true);
  });
});
