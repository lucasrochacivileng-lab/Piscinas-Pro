export interface CadPoint {
  readonly x: number;
  readonly y: number;
}

export type CadPathRole = "BOUNDARY" | "BREAKLINE";
export type CadPathCurve = "POLYLINE" | "SMOOTH";

export interface CadPath {
  readonly id: string;
  readonly label: string;
  readonly role: CadPathRole;
  readonly curve: CadPathCurve;
  readonly closed: boolean;
  readonly points: readonly CadPoint[];
}

export interface CadDepthMarker {
  readonly id: string;
  readonly label: string;
  readonly point: CadPoint;
  readonly depthMm: number;
}

export interface CadCalibration {
  readonly pointA: CadPoint;
  readonly pointB: CadPoint;
  readonly knownDistanceMm: number;
  readonly drawingDistanceUnits: number;
  readonly mmPerUnit: number;
}

export interface CadBackgroundReference {
  readonly fileName: string;
  readonly mimeType: string;
  readonly page: number;
  readonly opacity: number;
}

export interface CadGeometryDocument {
  readonly version: "cad-2d-1.0.0";
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly calibration?: CadCalibration;
  readonly background?: CadBackgroundReference;
  readonly paths: readonly CadPath[];
  readonly depthMarkers: readonly CadDepthMarker[];
}

export interface CadGeometryMeasurements {
  readonly calibrated: boolean;
  readonly boundaryAreaM2: number | null;
  readonly boundaryPerimeterM: number | null;
  readonly breaklineLengthM: number | null;
  readonly totalPathLengthM: number | null;
  readonly envelopeLengthMm: number | null;
  readonly envelopeWidthMm: number | null;
  readonly maximumDepthMm: number | null;
  readonly boundaryCount: number;
  readonly breaklineCount: number;
}

const finite = (value: number): boolean => Number.isFinite(value);
const midpoint = (a: CadPoint, b: CadPoint): CadPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: CadPoint, b: CadPoint): number => Math.hypot(b.x - a.x, b.y - a.y);

const quadraticPoint = (start: CadPoint, control: CadPoint, end: CadPoint, t: number): CadPoint => {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y
  };
};

const sampleQuadratic = (
  start: CadPoint,
  control: CadPoint,
  end: CadPoint,
  subdivisions: number,
  includeStart: boolean
): CadPoint[] => {
  const points: CadPoint[] = [];
  const first = includeStart ? 0 : 1;
  for (let index = first; index <= subdivisions; index += 1) {
    points.push(quadraticPoint(start, control, end, index / subdivisions));
  }
  return points;
};

export function createEmptyCadGeometryDocument(): CadGeometryDocument {
  return {
    version: "cad-2d-1.0.0",
    canvasWidth: 1200,
    canvasHeight: 760,
    paths: [],
    depthMarkers: []
  };
}

export function cadDrawingDistance(a: CadPoint, b: CadPoint): number {
  return distance(a, b);
}

export function calibrateCadGeometry(
  document: CadGeometryDocument,
  pointA: CadPoint,
  pointB: CadPoint,
  knownDistanceMm: number
): CadGeometryDocument {
  const drawingDistanceUnits = distance(pointA, pointB);
  if (!finite(knownDistanceMm) || knownDistanceMm <= 0) {
    throw new RangeError("A distância real de calibração deve ser positiva.");
  }
  if (!finite(drawingDistanceUnits) || drawingDistanceUnits <= 1e-6) {
    throw new RangeError("Os pontos de calibração devem ser distintos.");
  }
  return {
    ...document,
    calibration: {
      pointA,
      pointB,
      knownDistanceMm,
      drawingDistanceUnits,
      mmPerUnit: knownDistanceMm / drawingDistanceUnits
    }
  };
}

export function sampleCadPath(path: CadPath, subdivisions = 12): readonly CadPoint[] {
  if (path.points.length === 0) return [];
  if (path.curve === "POLYLINE" || path.points.length < 3) {
    return path.closed ? [...path.points, path.points[0]!] : [...path.points];
  }

  const resolution = Math.max(3, Math.floor(subdivisions));
  if (path.closed) {
    const sampled: CadPoint[] = [];
    for (let index = 0; index < path.points.length; index += 1) {
      const previous = path.points[(index - 1 + path.points.length) % path.points.length]!;
      const control = path.points[index]!;
      const next = path.points[(index + 1) % path.points.length]!;
      const start = midpoint(previous, control);
      const end = midpoint(control, next);
      sampled.push(...sampleQuadratic(start, control, end, resolution, index === 0));
    }
    sampled.push(sampled[0]!);
    return sampled;
  }

  const first = path.points[0]!;
  const sampled: CadPoint[] = [first];
  let current = first;
  for (let index = 1; index < path.points.length - 1; index += 1) {
    const control = path.points[index]!;
    const next = path.points[index + 1]!;
    const end = index === path.points.length - 2 ? next : midpoint(control, next);
    sampled.push(...sampleQuadratic(current, control, end, resolution, false));
    current = end;
  }
  return sampled;
}

export function cadPathLengthDrawingUnits(path: CadPath): number {
  const points = sampleCadPath(path);
  return points.slice(1).reduce((total, point, index) => total + distance(points[index]!, point), 0);
}

export function cadPathLengthMm(path: CadPath, calibration: CadCalibration): number {
  return cadPathLengthDrawingUnits(path) * calibration.mmPerUnit;
}

const polygonAreaDrawingUnits2 = (points: readonly CadPoint[]): number => {
  if (points.length < 4) return 0;
  let twiceArea = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]!;
    const next = points[index + 1]!;
    twiceArea += current.x * next.y - next.x * current.y;
  }
  return Math.abs(twiceArea) / 2;
};

export function measureCadGeometry(document: CadGeometryDocument): CadGeometryMeasurements {
  const boundaries = document.paths.filter((path) => path.role === "BOUNDARY" && path.closed && path.points.length >= 3);
  const breaklines = document.paths.filter((path) => path.role === "BREAKLINE" && path.points.length >= 2);
  const maximumDepthMm = document.depthMarkers.length > 0
    ? Math.max(...document.depthMarkers.map((marker) => marker.depthMm))
    : null;

  if (!document.calibration) {
    return {
      calibrated: false,
      boundaryAreaM2: null,
      boundaryPerimeterM: null,
      breaklineLengthM: null,
      totalPathLengthM: null,
      envelopeLengthMm: null,
      envelopeWidthMm: null,
      maximumDepthMm,
      boundaryCount: boundaries.length,
      breaklineCount: breaklines.length
    };
  }

  const scale = document.calibration.mmPerUnit;
  const boundarySamples = boundaries.flatMap((path) => sampleCadPath(path));
  const boundaryAreaMm2 = boundaries.reduce(
    (total, path) => total + polygonAreaDrawingUnits2(sampleCadPath(path)) * scale * scale,
    0
  );
  const boundaryPerimeterMm = boundaries.reduce((total, path) => total + cadPathLengthMm(path, document.calibration!), 0);
  const breaklineLengthMm = breaklines.reduce((total, path) => total + cadPathLengthMm(path, document.calibration!), 0);
  const totalPathLengthMm = document.paths.reduce((total, path) => total + cadPathLengthMm(path, document.calibration!), 0);

  const xs = boundarySamples.map((point) => point.x);
  const ys = boundarySamples.map((point) => point.y);
  const envelopeLengthMm = xs.length > 0 ? (Math.max(...xs) - Math.min(...xs)) * scale : null;
  const envelopeWidthMm = ys.length > 0 ? (Math.max(...ys) - Math.min(...ys)) * scale : null;

  return {
    calibrated: true,
    boundaryAreaM2: boundaryAreaMm2 / 1_000_000,
    boundaryPerimeterM: boundaryPerimeterMm / 1_000,
    breaklineLengthM: breaklineLengthMm / 1_000,
    totalPathLengthM: totalPathLengthMm / 1_000,
    envelopeLengthMm,
    envelopeWidthMm,
    maximumDepthMm,
    boundaryCount: boundaries.length,
    breaklineCount: breaklines.length
  };
}

export function validateCadGeometry(document: CadGeometryDocument): readonly string[] {
  const errors: string[] = [];
  if (!finite(document.canvasWidth) || document.canvasWidth <= 0 || !finite(document.canvasHeight) || document.canvasHeight <= 0) {
    errors.push("A prancheta CAD deve possuir dimensões positivas.");
  }
  if (document.calibration && (!finite(document.calibration.mmPerUnit) || document.calibration.mmPerUnit <= 0)) {
    errors.push("A calibração CAD é inválida.");
  }
  const ids = new Set<string>();
  for (const path of document.paths) {
    if (ids.has(path.id)) errors.push(`Identificador CAD duplicado: ${path.id}.`);
    ids.add(path.id);
    if (path.role === "BOUNDARY" && (!path.closed || path.points.length < 3)) {
      errors.push(`O contorno ${path.label} deve ser fechado e possuir pelo menos três pontos.`);
    }
    if (path.role === "BREAKLINE" && path.points.length < 2) {
      errors.push(`A linha de quebra ${path.label} deve possuir pelo menos dois pontos.`);
    }
    if (path.points.some((point) => !finite(point.x) || !finite(point.y))) {
      errors.push(`O caminho ${path.label} possui coordenadas inválidas.`);
    }
  }
  for (const marker of document.depthMarkers) {
    if (!finite(marker.depthMm) || marker.depthMm < 0) errors.push(`A profundidade ${marker.label} é inválida.`);
  }
  return errors;
}

const dxfNumber = (value: number): string => (Math.round(value * 1000) / 1000).toFixed(3);
const dxfLine = (layer: string, a: CadPoint, b: CadPoint, scale: number, canvasHeight: number): string => [
  "0", "LINE", "8", layer,
  "10", dxfNumber(a.x * scale), "20", dxfNumber((canvasHeight - a.y) * scale), "30", "0",
  "11", dxfNumber(b.x * scale), "21", dxfNumber((canvasHeight - b.y) * scale), "31", "0"
].join("\n");
const dxfText = (layer: string, point: CadPoint, value: string, scale: number, canvasHeight: number): string => [
  "0", "TEXT", "8", layer,
  "10", dxfNumber(point.x * scale), "20", dxfNumber((canvasHeight - point.y) * scale), "30", "0",
  "40", dxfNumber(Math.max(100, 12 * scale)), "1", value.replace(/[\r\n]+/g, " ")
].join("\n");

export function buildCadGeometryDxf(document: CadGeometryDocument, title = "POOLSTRUCT CAD 2D"): string {
  if (!document.calibration) throw new RangeError("Calibre o desenho antes de exportar o DXF.");
  const errors = validateCadGeometry(document);
  if (errors.length > 0) throw new RangeError(errors.join(" "));
  const scale = document.calibration.mmPerUnit;
  const entities: string[] = [dxfText("TEXTO", { x: 10, y: 20 }, title, scale, document.canvasHeight)];

  for (const path of document.paths) {
    const layer = path.role === "BOUNDARY" ? "CONTORNO" : "QUEBRA";
    const points = sampleCadPath(path, 18);
    for (let index = 1; index < points.length; index += 1) {
      entities.push(dxfLine(layer, points[index - 1]!, points[index]!, scale, document.canvasHeight));
    }
  }
  for (const marker of document.depthMarkers) {
    entities.push(dxfText("PROFUNDIDADE", marker.point, `${marker.label}: -${(marker.depthMm / 1000).toFixed(3)} m`, scale, document.canvasHeight));
  }

  return [
    "0", "SECTION", "2", "HEADER", "9", "$INSUNITS", "70", "4", "0", "ENDSEC",
    "0", "SECTION", "2", "ENTITIES", entities.join("\n"), "0", "ENDSEC", "0", "EOF", ""
  ].join("\n");
}
