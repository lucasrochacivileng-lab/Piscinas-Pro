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

    expect(result.engineVersion).toBe("phase1-2.0.0");
    expect(result.hydrostatic.waterVolumeM3).toBeCloseTo(44.8);
    expect(result.longWall.actions.analysisMethod).toBe("VERTICAL_CANTILEVER");
    expect(result.shortWall.actions.analysisMethod).toBe("TWO_WAY_TABLE");
    expect(result.slab.bottomX.layout.providedAreaMm2PerM).toBeGreaterThan(0);
    expect(result.masonry?.family.id).toBe("jb-blocks-20x40");
    expect(result.masonry?.blockClass).toBe("A");
    expect(result.masonry?.checks.find((check) => check.id === "nbr-6136-1-2026-strength-class")?.status).toBe("PASS");
    expect(result.masonry?.checks.find((check) => check.id === "nbr-6136-below-grade-class-a")?.status).toBe("PASS");
    expect(result.masonry?.checks.find((check) => check.id === "current-block-standard-edition")?.status).toBe("PASS");
    expect(result.masonry?.checks.find((check) => check.id === "nbr-6136-1-2026-dimensional-tolerances")?.status).toBe("REQUIRES_REVIEW");
    expect(result.masonry?.modulation.totalBlocks).toBeGreaterThan(0);
    expect(result.masonry?.modulation.totalChannelBlocks).toBeGreaterThan(0);
    expect(result.masonry?.checks.some((check) => check.id === "grout-spacing-covers-vertical-bars")).toBe(true);
    expect(result.checks.length).toBeGreaterThan(15);
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

  it("aplica a familia de blocos escolhida e verifica a largura da parede", () => {
    const result = runPhase1Design({
      ...input,
      geometry: { ...input.geometry, wallThicknessMm: 140 },
      masonry: {
        blockFamilyId: "academic-block-family-m15",
        blockClass: "A",
        blockStrengthMPa: 8,
        verticalGroutSpacingMm: 150,
        bondBeamCourseSpacing: 4
      }
    }, SILVA_2022_PHASE1_PROFILE);

    expect(result.masonry?.family.id).toBe("academic-block-family-m15");
    expect(result.masonry?.checks.find((check) => check.id === "junction-thickness-modular")?.status).toBe("PASS");
    expect(result.masonry?.checks.find((check) => check.id === "nbr-6136-1-2026-nominal-family")?.status).toBe("PASS");
  });

  it("rejeita familia de blocos desconhecida", () => {
    expect(() => runPhase1Design({
      ...input,
      masonry: {
        blockFamilyId: "fabricante-inexistente",
        blockClass: "A",
        blockStrengthMPa: 8,
        verticalGroutSpacingMm: 200,
        bondBeamCourseSpacing: 4
      }
    }, SILVA_2022_PHASE1_PROFILE)).toThrow(/Familia de blocos desconhecida/);
  });

  it("rejeita bloco abaixo da Classe A para piscina enterrada", () => {
    const result = runPhase1Design({
      ...input,
      masonry: {
        blockFamilyId: "jb-blocks-20x40",
        blockClass: "B",
        blockStrengthMPa: 6,
        verticalGroutSpacingMm: 200,
        bondBeamCourseSpacing: 4
      }
    }, SILVA_2022_PHASE1_PROFILE);

    expect(result.masonry?.blockClass).toBe("B");
    expect(result.masonry?.checks.find((check) => check.id === "nbr-6136-1-2026-strength-class")?.status).toBe("PASS");
    expect(result.masonry?.checks.find((check) => check.id === "nbr-6136-below-grade-class-a")?.status).toBe("FAIL");
    expect(result.overallStatus).toBe("FAIL");
  });

  it("reprova resistência fora da faixa discreta da classe declarada", () => {
    const result = runPhase1Design({
      ...input,
      masonry: {
        blockFamilyId: "jb-blocks-20x40",
        blockClass: "B",
        blockStrengthMPa: 5,
        verticalGroutSpacingMm: 200,
        bondBeamCourseSpacing: 4
      }
    }, SILVA_2022_PHASE1_PROFILE);

    expect(result.masonry?.checks.find((check) => check.id === "nbr-6136-1-2026-strength-class")?.status).toBe("FAIL");
    expect(result.overallStatus).toBe("FAIL");
  });

  it("mantém compatibilidade com revisão legada sem classe explícita", () => {
    const result = runPhase1Design({
      ...input,
      masonry: {
        blockFamilyId: "jb-blocks-20x40",
        blockStrengthMPa: 8,
        verticalGroutSpacingMm: 200,
        bondBeamCourseSpacing: 4
      }
    }, SILVA_2022_PHASE1_PROFILE);

    expect(result.masonry?.blockClass).toBe("A");
    expect(result.masonry?.checks.find((check) => check.id === "nbr-6136-1-2026-strength-class")?.status).toBe("PASS");
  });
});
