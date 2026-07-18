import { describe, expect, it } from "vitest";
import {
  buildCadGeometryDxf,
  calibrateCadGeometry,
  createEmptyCadGeometryDocument,
  isCadPointInsideBoundary,
  measureCadGeometry,
  normalizeCadGeometryDocument,
  sampleCadPath,
  setCadLongitudinalAxis,
  validateCadGeometry
} from "./cad-geometry.js";

const rectangle = {
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
};

describe("CAD geometry", () => {
  it("calibra, mede área e exporta DXF em milímetros", () => {
    const calibrated = calibrateCadGeometry(
      createEmptyCadGeometryDocument(),
      { x: 100, y: 100 },
      { x: 500, y: 100 },
      8_000
    );
    const document = setCadLongitudinalAxis({
      ...calibrated,
      paths: [rectangle],
      depthMarkers: [{
        id: "d1",
        label: "Fundo",
        point: { x: 300, y: 200 },
        depthMm: 1_400,
        zoneId: "main",
        zonePosition: "UNIFORM" as const
      }]
    }, { x: 100, y: 200 }, { x: 500, y: 200 });

    const measurements = measureCadGeometry(document);
    expect(document.calibration?.mmPerUnit).toBe(20);
    expect(measurements.boundaryAreaM2).toBeCloseTo(32, 6);
    expect(measurements.boundaryPerimeterM).toBeCloseTo(24, 6);
    expect(measurements.longitudinalLengthMm).toBeCloseTo(8_000, 6);
    expect(measurements.transverseWidthMm).toBeCloseTo(4_000, 6);
    expect(measurements.maximumDepthMm).toBe(1_400);
    expect(validateCadGeometry(document)).toEqual([]);

    const dxf = buildCadGeometryDxf(document, "Piscina teste");
    expect(dxf).toContain("CONTORNO");
    expect(dxf).toContain("PROFUNDIDADE");
    expect(dxf).toContain("EIXO_LONGITUDINAL");
    expect(dxf).toContain("Piscina teste");
  });

  it("mede corretamente um contorno rotacionado usando o eixo longitudinal", () => {
    const root = Math.SQRT1_2;
    const center = { x: 350, y: 350 };
    const point = (longitudinal: number, transverse: number) => ({
      x: center.x + longitudinal * root - transverse * root,
      y: center.y + longitudinal * root + transverse * root
    });
    const calibrated = calibrateCadGeometry(createEmptyCadGeometryDocument(), { x: 0, y: 0 }, { x: 100, y: 0 }, 2_000);
    const document = setCadLongitudinalAxis({
      ...calibrated,
      paths: [{
        ...rectangle,
        points: [point(-200, -100), point(200, -100), point(200, 100), point(-200, 100)]
      }]
    }, point(-200, 0), point(200, 0));

    const measurements = measureCadGeometry(document);
    expect(measurements.longitudinalLengthMm).toBeCloseTo(8_000, 3);
    expect(measurements.transverseWidthMm).toBeCloseTo(4_000, 3);
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

  it("rejeita contorno auto-intersectante, segundo contorno e cota externa", () => {
    const document = {
      ...createEmptyCadGeometryDocument(),
      paths: [
        {
          ...rectangle,
          points: [{ x: 100, y: 100 }, { x: 500, y: 300 }, { x: 100, y: 300 }, { x: 500, y: 100 }]
        },
        { ...rectangle, id: "pool-2", label: "Outro contorno" }
      ],
      depthMarkers: [{ id: "outside", label: "Cota externa", point: { x: 700, y: 700 }, depthMm: 1_400 }]
    };

    const errors = validateCadGeometry(document);
    expect(errors.some((message) => message.includes("somente um contorno"))).toBe(true);
    expect(errors.some((message) => message.includes("auto-interseção"))).toBe(true);
    expect(errors.some((message) => message.includes("dentro do contorno"))).toBe(true);
  });

  it("considera somente profundidades dentro do contorno", () => {
    const document = {
      ...createEmptyCadGeometryDocument(),
      paths: [rectangle],
      depthMarkers: [
        { id: "inside", label: "Interna", point: { x: 300, y: 200 }, depthMm: 800 },
        { id: "outside", label: "Externa", point: { x: 700, y: 200 }, depthMm: 3_000 }
      ]
    };
    expect(isCadPointInsideBoundary(document, { x: 300, y: 200 })).toBe(true);
    expect(isCadPointInsideBoundary(document, { x: 700, y: 200 })).toBe(false);
    expect(measureCadGeometry(document).maximumDepthMm).toBe(800);
  });

  it("migra documentos CAD antigos e rejeita estruturas corrompidas", () => {
    const legacy = {
      version: "cad-2d-1.0.0",
      canvasWidth: 1200,
      canvasHeight: 760,
      paths: [rectangle],
      depthMarkers: []
    };
    expect(normalizeCadGeometryDocument(legacy)?.version).toBe("cad-2d-1.1.0");
    expect(normalizeCadGeometryDocument({ ...legacy, paths: "invalid" })).toBeNull();
  });
});
