import { describe, expect, it } from "vitest";
import { designMasonryPanel } from "./masonry-design.js";
import { SILVA_2022_ACADEMIC_PROFILE, SILVA_2022_PHASE1_PROFILE } from "./profiles.js";
import { calculateWallPanelActions } from "./wall-panel.js";

function academicPanel() {
  const result = calculateWallPanelActions({
    panelLengthMm: 5_280,
    panelHeightMm: 1_600,
    wallThicknessMm: 140,
    saturatedSoilUnitWeightKNM3: 19,
    soilFrictionAngleDegrees: 30,
    effectiveHeightFactor: 2,
    ultimateLoadFactor: 1.4,
    orthogonalityCoefficient: 0.5
  }, SILVA_2022_ACADEMIC_PROFILE);
  if (!result.ok) throw new Error("Painel academico invalido.");
  return result.value;
}

describe("designMasonryPanel", () => {
  it("reproduz resistencias e areas de aco do exemplo academico", () => {
    const result = designMasonryPanel({
      panelLengthMm: 5_280,
      panelHeightMm: 1_600,
      wallThicknessMm: 140,
      reinforcementCoverMm: 50,
      barDiameterMm: 10,
      leverArmFactor: 0.95,
      flexuralTensileStrengthParallelMPa: 0.5,
      flexuralTensileStrengthPerpendicularMPa: 0.25,
      forceReinforcedDesign: true,
      panelActions: academicPanel()
    }, SILVA_2022_PHASE1_PROFILE);

    expect(result.value.parallel.characteristicUnreinforcedResistanceKNMPerM).toBeCloseTo(1.63, 2);
    expect(result.value.parallel.designUnreinforcedResistanceKNMPerM).toBeCloseTo(0.817, 3);
    expect(result.value.perpendicular.designUnreinforcedResistanceKNMPerM).toBeCloseTo(0.408, 3);
    expect(result.value.parallel.requiredSteelByMomentMm2PerM).toBeCloseTo(363, 0);
    expect(result.value.perpendicular.requiredSteelByMomentMm2PerM).toBeCloseTo(182, 0);
    expect(result.value.parallel.layout.spacingMm).toBe(210);
    expect(result.value.reinforcementRequired).toBe(true);
  });

  it("executa verificacoes de cisalhamento, estabilidade e ELS", () => {
    const result = designMasonryPanel({
      panelLengthMm: 5_280,
      panelHeightMm: 1_600,
      wallThicknessMm: 140,
      reinforcementCoverMm: 50,
      barDiameterMm: 10,
      leverArmFactor: 0.95,
      flexuralTensileStrengthParallelMPa: 0.5,
      flexuralTensileStrengthPerpendicularMPa: 0.25,
      forceReinforcedDesign: true,
      panelActions: academicPanel()
    }, SILVA_2022_PHASE1_PROFILE);

    expect(result.checks.find((check) => check.id === "masonry-shear")?.status).toBe("PASS");
    expect(result.checks.find((check) => check.id === "wall-stability-slenderness")?.status).toBe("PASS");
    expect(result.checks.find((check) => check.id === "masonry-serviceability-domain")?.status).toBe("PASS");
  });
});
