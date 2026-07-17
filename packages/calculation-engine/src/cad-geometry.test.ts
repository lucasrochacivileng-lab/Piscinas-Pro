import { describe, expect, it } from "vitest";
import {
  buildCadGeometryDxf,
  calibrateCadGeometry,
  createEmptyCadGeometryDocument,
  measureCadGeometry,
  sampleCadPath
} from "./cad-geometry.js";

describe("CAD geometry", () => {
  it("calibra, mede área e exporta DXF em milímetros", () => {
    const calibrated = calibrateCadGeometry(
      createEmptyCadGeometryDocument(),
      { x: 100, y: 100 },
      { x: 500, y: 100 },
      8_000
    );
    const document = {
      ...calibrated,
      paths: [{
        id: "pool",
        label: "Contorno da piscina",
        role: "BOUNDARY" as const,
        curve: "POLYLINE" as const,
        closed: true,
        points: [
          { x: 100, y: 100 },
          { x: 500, y: 100 },
          { x: 500, y: 300 },
          { x: 100, y: 300 }
        ]
      }],
      depthMarkers: [{ id: "d1", label: "Fundo", point: { x: 300, y: 200 }, depthMm: 1_400 }]
    };

    const measurements = measureCadGeometry(document);
    expect(document.calibration?.mmPerUnit).toBe(20);
    expect(measurements.boundaryAreaM2).toBeCloseTo(32, 6);
    expect(measurements.boundaryPerimeterM).toBeCloseTo(24, 6);
    expect(measurements.envelopeLengthMm).toBeCloseTo(8_000, 6);
    expect(measurements.envelopeWidthMm).toBeCloseTo(4_000, 6);
    expect(measurements.maximumDepthMm).toBe(1_400);

    const dxf = buildCadGeometryDxf(document, "Piscina teste");
    expect(dxf).toContain("CONTORNO");
    expect(dxf).toContain("PROFUNDIDADE");
    expect(dxf).toContain("Piscina teste");
  });

  it("amostra contorno curvo fechado e mantém o fechamento", () => {
    const sampled = sampleCadPath({
      id: "curve",
      label: "Curva",
      role: "BOUNDARY",
      curve: "SMOOTH",
      closed: true,
      points: [
        { x: 0, y: 50 },
        { x: 50, y: 0 },
        { x: 100, y: 50 },
        { x: 50, y: 100 }
      ]
    });
    expect(sampled.length).toBeGreaterThan(20);
    expect(sampled[0]).toEqual(sampled.at(-1));
  });
});
