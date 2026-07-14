import { describe, expect, it } from "vitest";
import { SILVA_2022_ACADEMIC_PROFILE } from "./profiles.js";
import {
  activeEarthPressureCoefficient,
  calculateWallPanelActions,
  momentCoefficientForRatio
} from "./wall-panel.js";

const academicExample = {
  panelLengthMm: 5_280,
  panelHeightMm: 1_600,
  wallThicknessMm: 140,
  saturatedSoilUnitWeightKNM3: 19,
  soilFrictionAngleDegrees: 30,
  effectiveHeightFactor: 2,
  ultimateLoadFactor: 1.4,
  orthogonalityCoefficient: 0.5
} as const;

describe("wall panel actions", () => {
  it("reproduz o exemplo da ferramenta academica de Silva (2022)", () => {
    const result = calculateWallPanelActions(academicExample, SILVA_2022_ACADEMIC_PROFILE);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.activeEarthPressureCoefficient).toBeCloseTo(0.3333, 3);
    expect(result.value.maximumSoilPressureKPa).toBeCloseTo(10.13, 2);
    expect(result.value.maximumWaterPressureKPa).toBeCloseTo(16, 5);
    expect(result.value.governingCase).toBe("FULL_POOL_WATER");
    expect(result.value.slendernessRatio).toBeCloseTo(22.86, 2);
    expect(result.value.heightToLengthRatio).toBeCloseTo(0.303, 3);
    expect(result.value.momentCoefficient).toBeCloseTo(0.0433, 4);
    expect(result.value.designMomentParallelKNMPerM).toBeCloseTo(13.51, 2);
    expect(result.value.designMomentPerpendicularKNMPerM).toBeCloseTo(6.76, 2);
  });

  it("calcula Ka a partir do angulo em graus", () => {
    expect(activeEarthPressureCoefficient(30)).toBeCloseTo(1 / 3, 10);
  });

  it("interpola o coeficiente sem degraus entre pontos tabulados", () => {
    expect(momentCoefficientForRatio(0.3)).toBeCloseTo(0.043);
    expect(momentCoefficientForRatio(0.4)).toBeCloseTo(0.052);
    expect(momentCoefficientForRatio(2)).toBeCloseTo(0.104);
  });

  it("usa balanco vertical quando h/L e inferior a 0,3", () => {
    const result = calculateWallPanelActions(
      { ...academicExample, panelLengthMm: 6_000, panelHeightMm: 1_000 },
      SILVA_2022_ACADEMIC_PROFILE
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.analysisMethod).toBe("VERTICAL_CANTILEVER");
    expect(result.value.designMomentPerpendicularKNMPerM).toBe(0);
  });

  it("rejeita razao acima do dominio academico", () => {
    const result = calculateWallPanelActions(
      { ...academicExample, panelLengthMm: 500, panelHeightMm: 1_600 },
      SILVA_2022_ACADEMIC_PROFILE
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatchObject({ code: "UNSUPPORTED_RATIO" });
  });

  it("permite que o solo governe quando sua pressao for maior", () => {
    const result = calculateWallPanelActions(
      { ...academicExample, saturatedSoilUnitWeightKNM3: 50, soilFrictionAngleDegrees: 10 },
      SILVA_2022_ACADEMIC_PROFILE
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.governingCase).toBe("EMPTY_POOL_SATURATED_SOIL");
  });
});
