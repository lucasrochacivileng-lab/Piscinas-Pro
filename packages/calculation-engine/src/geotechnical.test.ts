import { describe, expect, it } from "vitest";
import { buildPoolGeometryModel } from "./geometry.js";
import { evaluateGeotechnicalModel, evaluateSptLayer } from "./geotechnical.js";

const geometry = buildPoolGeometryModel({
  internalLengthMm: 8_000,
  internalWidthMm: 4_000,
  waterDepthMm: 1_600,
  wallThicknessMm: 190,
  slabThicknessMm: 200,
  depthZones: [
    { id: "beach", label: "Prainha", kind: "SHALLOW", lengthMm: 1_600, waterDepthMm: 400 },
    { id: "main", label: "Fundo", kind: "MAIN", lengthMm: 6_400, waterDepthMm: 1_600 }
  ]
});

const baseInput = {
  groundLevelToWaterLevelMm: 700,
  excavationBottomDepthMm: 2_000,
  permanentSoilCoverThicknessMm: 100,
  permanentSoilCoverUnitWeightKNM3: 18,
  additionalPermanentBallastKN: 0,
  flotationSafetyFactor: 1.1,
  layers: [
    { id: "l1", label: "Areia siltosa", topDepthMm: 0, bottomDepthMm: 1_000, nspt: 6, material: "SILTY_SAND" as const },
    { id: "l2", label: "Areia compacta", topDepthMm: 1_000, bottomDepthMm: 5_000, nspt: 24, material: "SAND" as const }
  ]
};

describe("geotechnical model", () => {
  it("deriva parâmetros de camada a partir do NSPT", () => {
    const layer = evaluateSptLayer(baseInput.layers[1]!);
    expect(layer.frictionAngleDegrees).toBeGreaterThan(30);
    expect(layer.allowableBearingKPa).toBeGreaterThan(200);
    expect(layer.source).toBe("SPT_CORRELATION");
  });

  it("seleciona camada de parede e apoio e verifica flutuação global", () => {
    const result = evaluateGeotechnicalModel(baseInput, geometry, 190, 200, 25, 14, 10, 1.4);
    expect(result.wallSoil.id).toBe("l2");
    expect(result.bearingSoil.id).toBe("l2");
    expect(result.flotation.characteristicUpliftKN).toBeGreaterThan(0);
    expect(result.checks.some((check) => check.id === "global-flotation")).toBe(true);
    expect(result.trace).toHaveLength(2);
  });

  it("detecta falha de flutuação quando o peso estabilizante é insuficiente", () => {
    const result = evaluateGeotechnicalModel(
      { ...baseInput, groundLevelToWaterLevelMm: 0, permanentSoilCoverThicknessMm: 0 },
      geometry,
      140,
      120,
      25,
      10,
      10,
      1.4
    );
    expect(result.flotation.status).toBe("FAIL");
  });

  it("aceita parâmetros do laudo e marca a camada como informada", () => {
    const layer = evaluateSptLayer({
      ...baseInput.layers[1]!,
      saturatedUnitWeightKNM3: 20.5,
      frictionAngleDegrees: 35,
      allowableBearingKPa: 250
    });
    expect(layer.source).toBe("USER");
    expect(layer.allowableBearingKPa).toBe(250);
  });
});
