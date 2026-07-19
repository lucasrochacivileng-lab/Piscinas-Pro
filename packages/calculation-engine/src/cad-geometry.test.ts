import { describe, expect, it } from "vitest";
import {
  buildCadGeometryDxf,
  calibrateCadGeometry,
  compareCadWithParametricGeometry,
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
    expect(normalizeCadGeometryDocument(legacy)?.version).toBe("cad-2d-1.2.0");
    expect(normalizeCadGeometryDocument({ ...legacy, paths: "invalid" })).toBeNull();
  });

  it("preserva o hash do fundo ao normalizar a revisão", () => {
    const sha256 = "a".repeat(64);
    const document = {
      version: "cad-2d-1.2.0",
      canvasWidth: 1200,
      canvasHeight: 760,
      background: { fileName: "planta.pdf", mimeType: "application/pdf", page: 1, opacity: 0.72, sha256, byteSize: 4096 },
      paths: [rectangle],
      depthMarkers: []
    };
    const normalized = normalizeCadGeometryDocument(document);
    expect(normalized?.background?.sha256).toBe(sha256);
    expect(normalized?.background?.byteSize).toBe(4096);
  });

  it("descarta hash de fundo malformado sem invalidar o documento", () => {
    const base = {
      version: "cad-2d-1.2.0",
      canvasWidth: 1200,
      canvasHeight: 760,
      paths: [rectangle],
      depthMarkers: []
    };
    const background = { fileName: "planta.pdf", mimeType: "application/pdf", page: 1, opacity: 0.72 };
    for (const sha256 of ["ABC", "z".repeat(64), 42, null]) {
      const normalized = normalizeCadGeometryDocument({ ...base, background: { ...background, sha256 } });
      expect(normalized?.background?.fileName).toBe("planta.pdf");
      expect(normalized?.background?.sha256).toBeUndefined();
    }
  });
});

describe("concordância entre CAD e modelo paramétrico", () => {
  const applied = () => setCadLongitudinalAxis({
    ...calibrateCadGeometry(createEmptyCadGeometryDocument(), { x: 100, y: 100 }, { x: 500, y: 100 }, 8_000),
    paths: [rectangle],
    depthMarkers: [{
      id: "d1", label: "Fundo", point: { x: 300, y: 200 },
      depthMm: 1_400, zoneId: "main", zonePosition: "UNIFORM" as const
    }]
  }, { x: 100, y: 200 }, { x: 500, y: 200 });

  const zones = [{ id: "main", waterDepthMm: 1_400 }];

  it("aprova quando o desenho corresponde ao que foi calculado", () => {
    const agreement = compareCadWithParametricGeometry(applied(), {
      internalLengthMm: 8_000, internalWidthMm: 4_000, depthZones: zones
    });
    expect(agreement.comparable).toBe(true);
    expect(agreement.agrees).toBe(true);
    expect(agreement.depthMismatches).toEqual([]);
  });

  it("reprova quando o desenho foi editado depois de aplicar ao cálculo", () => {
    const agreement = compareCadWithParametricGeometry(applied(), {
      internalLengthMm: 7_000, internalWidthMm: 4_000, depthZones: zones
    });
    expect(agreement.agrees).toBe(false);
    expect(agreement.lengthDeltaMm).toBeCloseTo(1_000, 6);
    expect(agreement.reason).toContain("comprimento difere em 1000 mm");
  });

  it("acusa cota de zona divergente", () => {
    const agreement = compareCadWithParametricGeometry(applied(), {
      internalLengthMm: 8_000, internalWidthMm: 4_000,
      depthZones: [{ id: "main", waterDepthMm: 1_200 }]
    });
    expect(agreement.agrees).toBe(false);
    expect(agreement.depthMismatches).toEqual([{ zoneId: "main", markerDepthMm: 1_400, zoneDepthMm: 1_200 }]);
  });

  it("ignora marcadores sem zona associada", () => {
    const document = applied();
    const solto = {
      ...document,
      depthMarkers: [...document.depthMarkers, { id: "d2", label: "Solto", point: { x: 200, y: 150 }, depthMm: 9_999 }]
    };
    expect(compareCadWithParametricGeometry(solto, {
      internalLengthMm: 8_000, internalWidthMm: 4_000, depthZones: zones
    }).agrees).toBe(true);
  });

  it("tolera o arredondamento de milímetro do \"Aplicar ao cálculo\"", () => {
    const agreement = compareCadWithParametricGeometry(applied(), {
      internalLengthMm: 7_999, internalWidthMm: 4_001, depthZones: zones
    });
    expect(agreement.agrees).toBe(true);
  });

  it("não compara desenho sem calibração, sem eixo ou com dois contornos", () => {
    const semCalibracao = { ...createEmptyCadGeometryDocument(), paths: [rectangle] };
    expect(compareCadWithParametricGeometry(semCalibracao, { internalLengthMm: 8_000, internalWidthMm: 4_000 }).comparable).toBe(false);

    const semEixo = { ...calibrateCadGeometry(createEmptyCadGeometryDocument(), { x: 100, y: 100 }, { x: 500, y: 100 }, 8_000), paths: [rectangle] };
    expect(compareCadWithParametricGeometry(semEixo, { internalLengthMm: 8_000, internalWidthMm: 4_000 }).reason).toContain("eixo longitudinal");

    const doisContornos = { ...applied(), paths: [rectangle, { ...rectangle, id: "outro" }] };
    expect(compareCadWithParametricGeometry(doisContornos, { internalLengthMm: 8_000, internalWidthMm: 4_000 }).reason).toContain("2 contorno(s)");

    expect(compareCadWithParametricGeometry(undefined, { internalLengthMm: 8_000, internalWidthMm: 4_000 }).comparable).toBe(false);
  });
});
