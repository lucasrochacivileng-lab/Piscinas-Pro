export interface CadPoint {
  readonly x: number;
  readonly y: number;
}

export type CadPathRole = "BOUNDARY" | "BREAKLINE";
export type CadPathCurve = "POLYLINE" | "SMOOTH";
export type CadDepthPosition = "UNIFORM" | "START" | "END";

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
  readonly zoneId?: string;
  readonly zonePosition?: CadDepthPosition;
}

export interface CadCalibration {
  readonly pointA: CadPoint;
  readonly pointB: CadPoint;
  readonly knownDistanceMm: number;
  readonly drawingDistanceUnits: number;
  readonly mmPerUnit: number;
}

export interface CadLongitudinalAxis {
  readonly pointA: CadPoint;
  readonly pointB: CadPoint;
}

export interface CadBackgroundReference {
  readonly fileName: string;
  readonly mimeType: string;
  readonly page: number;
  readonly opacity: number;
  /**
   * SHA-256 do arquivo usado na calibracao, em hexadecimal minusculo. O arquivo
   * em si nao vai ao banco: o hash permite provar que um reenvio e o mesmo
   * documento sobre o qual a geometria foi tracada. Ausente em revisoes
   * anteriores a `cad-2d-1.2.0`.
   */
  readonly sha256?: string;
  readonly byteSize?: number;
}

export interface CadGeometryDocument {
  readonly version: "cad-2d-1.0.0" | "cad-2d-1.1.0" | "cad-2d-1.2.0";
  readonly canvasWidth: number;
  readonly canvasHeight: number;
  readonly calibration?: CadCalibration;
  readonly longitudinalAxis?: CadLongitudinalAxis;
  readonly background?: CadBackgroundReference;
  readonly paths: readonly CadPath[];
  readonly depthMarkers: readonly CadDepthMarker[];
}

export interface CadGeometryMeasurements {
  readonly calibrated: boolean;
  readonly axisDefined: boolean;
  readonly boundaryAreaM2: number | null;
  readonly boundaryPerimeterM: number | null;
  readonly breaklineLengthM: number | null;
  readonly totalPathLengthM: number | null;
  readonly envelopeLengthMm: number | null;
  readonly envelopeWidthMm: number | null;
  readonly longitudinalLengthMm: number | null;
  readonly transverseWidthMm: number | null;
  readonly maximumDepthMm: number | null;
  readonly boundaryCount: number;
  readonly breaklineCount: number;
}

const EPSILON = 1e-7;
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const midpoint = (a: CadPoint, b: CadPoint): CadPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: CadPoint, b: CadPoint): number => Math.hypot(b.x - a.x, b.y - a.y);
const samePoint = (a: CadPoint, b: CadPoint): boolean => distance(a, b) <= EPSILON;
const cross = (a: CadPoint, b: CadPoint, c: CadPoint): number =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

const pointFromUnknown = (value: unknown): CadPoint | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<CadPoint>;
  return isFiniteNumber(candidate.x) && isFiniteNumber(candidate.y)
    ? { x: candidate.x, y: candidate.y }
    : null;
};

export function createEmptyCadGeometryDocument(): CadGeometryDocument {
  return {
    version: "cad-2d-1.2.0",
    canvasWidth: 1200,
    canvasHeight: 760,
    paths: [],
    depthMarkers: []
  };
}

export function hasCadGeometryContent(document: CadGeometryDocument | undefined): boolean {
  return Boolean(document && (
    document.paths.length > 0 || document.depthMarkers.length > 0 || document.calibration ||
    document.longitudinalAxis || document.background
  ));
}

export function normalizeCadGeometryDocument(value: unknown): CadGeometryDocument | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<CadGeometryDocument>;
  if (!isFiniteNumber(candidate.canvasWidth) || !isFiniteNumber(candidate.canvasHeight)) return null;
  if (!Array.isArray(candidate.paths) || !Array.isArray(candidate.depthMarkers)) return null;

  const paths: CadPath[] = [];
  for (const raw of candidate.paths) {
    if (!raw || typeof raw !== "object") return null;
    const path = raw as Partial<CadPath>;
    if (typeof path.id !== "string" || typeof path.label !== "string" ||
        (path.role !== "BOUNDARY" && path.role !== "BREAKLINE") ||
        (path.curve !== "POLYLINE" && path.curve !== "SMOOTH") ||
        typeof path.closed !== "boolean" || !Array.isArray(path.points)) return null;
    const points = path.points.map(pointFromUnknown);
    if (points.some((point) => point === null)) return null;
    paths.push({ ...path, points: points as CadPoint[] } as CadPath);
  }

  const depthMarkers: CadDepthMarker[] = [];
  for (const raw of candidate.depthMarkers) {
    if (!raw || typeof raw !== "object") return null;
    const marker = raw as Partial<CadDepthMarker>;
    const point = pointFromUnknown(marker.point);
    if (!point || typeof marker.id !== "string" || typeof marker.label !== "string" || !isFiniteNumber(marker.depthMm)) return null;
    depthMarkers.push({
      id: marker.id,
      label: marker.label,
      point,
      depthMm: marker.depthMm,
      ...(typeof marker.zoneId === "string" ? { zoneId: marker.zoneId } : {}),
      ...(marker.zonePosition === "UNIFORM" || marker.zonePosition === "START" || marker.zonePosition === "END"
        ? { zonePosition: marker.zonePosition }
        : {})
    });
  }

  let calibration: CadCalibration | undefined;
  if (candidate.calibration) {
    const pointA = pointFromUnknown(candidate.calibration.pointA);
    const pointB = pointFromUnknown(candidate.calibration.pointB);
    if (pointA && pointB && isFiniteNumber(candidate.calibration.knownDistanceMm) &&
        isFiniteNumber(candidate.calibration.drawingDistanceUnits) && isFiniteNumber(candidate.calibration.mmPerUnit)) {
      calibration = {
        pointA,
        pointB,
        knownDistanceMm: candidate.calibration.knownDistanceMm,
        drawingDistanceUnits: candidate.calibration.drawingDistanceUnits,
        mmPerUnit: candidate.calibration.mmPerUnit
      };
    }
  }

  let longitudinalAxis: CadLongitudinalAxis | undefined;
  if (candidate.longitudinalAxis) {
    const pointA = pointFromUnknown(candidate.longitudinalAxis.pointA);
    const pointB = pointFromUnknown(candidate.longitudinalAxis.pointB);
    if (pointA && pointB) longitudinalAxis = { pointA, pointB };
  }

  let background: CadBackgroundReference | undefined;
  if (candidate.background && typeof candidate.background.fileName === "string" &&
      typeof candidate.background.mimeType === "string" && isFiniteNumber(candidate.background.page) &&
      isFiniteNumber(candidate.background.opacity)) {
    const sha256 = candidate.background.sha256;
    const byteSize = candidate.background.byteSize;
    background = {
      fileName: candidate.background.fileName,
      mimeType: candidate.background.mimeType,
      page: candidate.background.page,
      opacity: candidate.background.opacity,
      ...(typeof sha256 === "string" && /^[0-9a-f]{64}$/.test(sha256) ? { sha256 } : {}),
      ...(isFiniteNumber(byteSize) && byteSize >= 0 ? { byteSize } : {})
    };
  }

  return {
    version: "cad-2d-1.2.0",
    canvasWidth: candidate.canvasWidth,
    canvasHeight: candidate.canvasHeight,
    ...(calibration ? { calibration } : {}),
    ...(longitudinalAxis ? { longitudinalAxis } : {}),
    ...(background ? { background } : {}),
    paths,
    depthMarkers
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
  if (!isFiniteNumber(knownDistanceMm) || knownDistanceMm <= 0) {
    throw new RangeError("A distância real de calibração deve ser positiva.");
  }
  if (!isFiniteNumber(drawingDistanceUnits) || drawingDistanceUnits <= EPSILON) {
    throw new RangeError("Os pontos de calibração devem ser distintos.");
  }
  return {
    ...document,
    version: "cad-2d-1.2.0",
    calibration: {
      pointA,
      pointB,
      knownDistanceMm,
      drawingDistanceUnits,
      mmPerUnit: knownDistanceMm / drawingDistanceUnits
    }
  };
}

export function setCadLongitudinalAxis(
  document: CadGeometryDocument,
  pointA: CadPoint,
  pointB: CadPoint
): CadGeometryDocument {
  if (distance(pointA, pointB) <= EPSILON) throw new RangeError("Os pontos do eixo longitudinal devem ser distintos.");
  return { ...document, version: "cad-2d-1.2.0", longitudinalAxis: { pointA, pointB } };
}

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
  for (let index = includeStart ? 0 : 1; index <= subdivisions; index += 1) {
    points.push(quadraticPoint(start, control, end, index / subdivisions));
  }
  return points;
};

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
      sampled.push(...sampleQuadratic(
        midpoint(previous, control),
        control,
        midpoint(control, next),
        resolution,
        index === 0
      ));
    }
    if (sampled.length > 0 && !samePoint(sampled[0]!, sampled.at(-1)!)) sampled.push(sampled[0]!);
    return sampled;
  }

  const sampled: CadPoint[] = [path.points[0]!];
  let current = path.points[0]!;
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

const polygonSignedArea = (points: readonly CadPoint[]): number => {
  if (points.length < 4) return 0;
  let twiceArea = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    twiceArea += points[index]!.x * points[index + 1]!.y - points[index + 1]!.x * points[index]!.y;
  }
  return twiceArea / 2;
};

const onSegment = (a: CadPoint, b: CadPoint, point: CadPoint): boolean =>
  Math.abs(cross(a, b, point)) <= EPSILON &&
  point.x >= Math.min(a.x, b.x) - EPSILON && point.x <= Math.max(a.x, b.x) + EPSILON &&
  point.y >= Math.min(a.y, b.y) - EPSILON && point.y <= Math.max(a.y, b.y) + EPSILON;

const segmentsIntersect = (a: CadPoint, b: CadPoint, c: CadPoint, d: CadPoint): boolean => {
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  if (((abC > EPSILON && abD < -EPSILON) || (abC < -EPSILON && abD > EPSILON)) &&
      ((cdA > EPSILON && cdB < -EPSILON) || (cdA < -EPSILON && cdB > EPSILON))) return true;
  return onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b);
};

const hasSelfIntersection = (path: CadPath): boolean => {
  const points = sampleCadPath(path, 18);
  const segmentCount = Math.max(0, points.length - 1);
  for (let first = 0; first < segmentCount; first += 1) {
    for (let second = first + 1; second < segmentCount; second += 1) {
      if (second === first + 1 || (path.closed && first === 0 && second === segmentCount - 1)) continue;
      if (segmentsIntersect(points[first]!, points[first + 1]!, points[second]!, points[second + 1]!)) return true;
    }
  }
  return false;
};

const primaryBoundary = (document: CadGeometryDocument): CadPath | null =>
  document.paths.find((path) => path.role === "BOUNDARY" && path.closed && path.points.length >= 3) ?? null;

export function isCadPointInsideBoundary(document: CadGeometryDocument, point: CadPoint): boolean {
  const boundary = primaryBoundary(document);
  if (!boundary) return false;
  const polygon = sampleCadPath(boundary, 18);
  for (let index = 0; index < polygon.length - 1; index += 1) {
    if (onSegment(polygon[index]!, polygon[index + 1]!, point)) return true;
  }
  let inside = false;
  for (let index = 0, previous = polygon.length - 2; index < polygon.length - 1; previous = index++) {
    const current = polygon[index]!;
    const prior = polygon[previous]!;
    if ((current.y > point.y) !== (prior.y > point.y) &&
        point.x < (prior.x - current.x) * (point.y - current.y) / (prior.y - current.y) + current.x) inside = !inside;
  }
  return inside;
}

const projectedRange = (points: readonly CadPoint[], origin: CadPoint, ux: number, uy: number): number => {
  const values = points.map((point) => (point.x - origin.x) * ux + (point.y - origin.y) * uy);
  return values.length > 0 ? Math.max(...values) - Math.min(...values) : 0;
};

export function measureCadGeometry(document: CadGeometryDocument): CadGeometryMeasurements {
  const boundaries = document.paths.filter((path) => path.role === "BOUNDARY" && path.closed && path.points.length >= 3);
  const breaklines = document.paths.filter((path) => path.role === "BREAKLINE" && path.points.length >= 2);
  const boundary = boundaries[0] ?? null;
  const validDepthMarkers = boundary
    ? document.depthMarkers.filter((marker) => isCadPointInsideBoundary(document, marker.point))
    : [];
  const maximumDepthMm = validDepthMarkers.length > 0
    ? Math.max(...validDepthMarkers.map((marker) => marker.depthMm))
    : null;

  if (!document.calibration || !boundary) {
    return {
      calibrated: Boolean(document.calibration),
      axisDefined: Boolean(document.longitudinalAxis),
      boundaryAreaM2: null,
      boundaryPerimeterM: null,
      breaklineLengthM: null,
      totalPathLengthM: null,
      envelopeLengthMm: null,
      envelopeWidthMm: null,
      longitudinalLengthMm: null,
      transverseWidthMm: null,
      maximumDepthMm,
      boundaryCount: boundaries.length,
      breaklineCount: breaklines.length
    };
  }

  const scale = document.calibration.mmPerUnit;
  const boundarySamples = sampleCadPath(boundary);
  const xs = boundarySamples.map((point) => point.x);
  const ys = boundarySamples.map((point) => point.y);
  const axisAlignedLengthMm = xs.length > 0 ? (Math.max(...xs) - Math.min(...xs)) * scale : null;
  const axisAlignedWidthMm = ys.length > 0 ? (Math.max(...ys) - Math.min(...ys)) * scale : null;
  let longitudinalLengthMm: number | null = null;
  let transverseWidthMm: number | null = null;

  if (document.longitudinalAxis) {
    const axisLength = distance(document.longitudinalAxis.pointA, document.longitudinalAxis.pointB);
    if (axisLength > EPSILON) {
      const ux = (document.longitudinalAxis.pointB.x - document.longitudinalAxis.pointA.x) / axisLength;
      const uy = (document.longitudinalAxis.pointB.y - document.longitudinalAxis.pointA.y) / axisLength;
      longitudinalLengthMm = projectedRange(boundarySamples, document.longitudinalAxis.pointA, ux, uy) * scale;
      transverseWidthMm = projectedRange(boundarySamples, document.longitudinalAxis.pointA, -uy, ux) * scale;
    }
  }

  return {
    calibrated: true,
    axisDefined: longitudinalLengthMm !== null && transverseWidthMm !== null,
    boundaryAreaM2: Math.abs(polygonSignedArea(boundarySamples)) * scale * scale / 1_000_000,
    boundaryPerimeterM: cadPathLengthMm(boundary, document.calibration) / 1_000,
    breaklineLengthM: breaklines.reduce((sum, path) => sum + cadPathLengthMm(path, document.calibration!), 0) / 1_000,
    totalPathLengthM: document.paths.reduce((sum, path) => sum + cadPathLengthMm(path, document.calibration!), 0) / 1_000,
    envelopeLengthMm: longitudinalLengthMm ?? axisAlignedLengthMm,
    envelopeWidthMm: transverseWidthMm ?? axisAlignedWidthMm,
    longitudinalLengthMm,
    transverseWidthMm,
    maximumDepthMm,
    boundaryCount: boundaries.length,
    breaklineCount: breaklines.length
  };
}

export function validateCadGeometry(document: CadGeometryDocument): readonly string[] {
  const errors: string[] = [];
  if (!isFiniteNumber(document.canvasWidth) || document.canvasWidth <= 0 ||
      !isFiniteNumber(document.canvasHeight) || document.canvasHeight <= 0) {
    errors.push("A prancheta CAD deve possuir dimensões positivas.");
  }
  if (document.calibration) {
    const measured = distance(document.calibration.pointA, document.calibration.pointB);
    if (!isFiniteNumber(document.calibration.mmPerUnit) || document.calibration.mmPerUnit <= 0 ||
        !isFiniteNumber(document.calibration.knownDistanceMm) || document.calibration.knownDistanceMm <= 0 || measured <= EPSILON) {
      errors.push("A calibração CAD é inválida.");
    } else if (Math.abs(document.calibration.knownDistanceMm / measured - document.calibration.mmPerUnit) >
      Math.max(EPSILON, document.calibration.mmPerUnit * 1e-6)) {
      errors.push("A calibração CAD está inconsistente com os pontos informados.");
    }
  }
  if (document.longitudinalAxis && distance(document.longitudinalAxis.pointA, document.longitudinalAxis.pointB) <= EPSILON) {
    errors.push("O eixo longitudinal deve possuir dois pontos distintos.");
  }

  const ids = new Set<string>();
  const boundaries = document.paths.filter((path) => path.role === "BOUNDARY");
  if (boundaries.length > 1) errors.push("Esta fase aceita somente um contorno externo por projeto; use linhas de quebra para regiões internas.");

  for (const path of document.paths) {
    if (ids.has(path.id)) errors.push(`Identificador CAD duplicado: ${path.id}.`);
    ids.add(path.id);
    if (path.role === "BOUNDARY" && (!path.closed || path.points.length < 3)) {
      errors.push(`O contorno ${path.label} deve ser fechado e possuir pelo menos três pontos.`);
    }
    if (path.role === "BREAKLINE" && path.points.length < 2) {
      errors.push(`A linha de quebra ${path.label} deve possuir pelo menos dois pontos.`);
    }
    if (path.points.some((point) => !isFiniteNumber(point.x) || !isFiniteNumber(point.y))) {
      errors.push(`O caminho ${path.label} possui coordenadas inválidas.`);
      continue;
    }
    if (path.points.some((point, index) => index > 0 && samePoint(point, path.points[index - 1]!))) {
      errors.push(`O caminho ${path.label} possui pontos consecutivos repetidos.`);
    }
    if (path.role === "BOUNDARY" && path.points.length >= 3) {
      const sampled = sampleCadPath(path, 18);
      if (Math.abs(polygonSignedArea(sampled)) <= EPSILON) errors.push(`O contorno ${path.label} possui área nula.`);
      if (hasSelfIntersection(path)) errors.push(`O contorno ${path.label} possui auto-interseção.`);
    }
  }

  const boundary = primaryBoundary(document);
  if (boundary) {
    for (const path of document.paths.filter((item) => item.role === "BREAKLINE")) {
      if (sampleCadPath(path, 18).some((point) => !isCadPointInsideBoundary(document, point))) {
        errors.push(`A linha de quebra ${path.label} deve permanecer dentro do contorno.`);
      }
    }
  }

  for (const marker of document.depthMarkers) {
    if (ids.has(marker.id)) errors.push(`Identificador CAD duplicado: ${marker.id}.`);
    ids.add(marker.id);
    if (!isFiniteNumber(marker.depthMm) || marker.depthMm < 0) errors.push(`A profundidade ${marker.label} é inválida.`);
    if (boundary && !isCadPointInsideBoundary(document, marker.point)) errors.push(`A profundidade ${marker.label} deve estar dentro do contorno.`);
    if ((marker.zoneId && !marker.zonePosition) || (!marker.zoneId && marker.zonePosition)) {
      errors.push(`A profundidade ${marker.label} possui associação de zona incompleta.`);
    }
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
  if (document.longitudinalAxis) {
    entities.push(dxfLine("EIXO_LONGITUDINAL", document.longitudinalAxis.pointA, document.longitudinalAxis.pointB, scale, document.canvasHeight));
  }
  for (const marker of document.depthMarkers) {
    const association = marker.zoneId && marker.zonePosition ? ` [${marker.zoneId}/${marker.zonePosition}]` : "";
    entities.push(dxfText("PROFUNDIDADE", marker.point, `${marker.label}: -${(marker.depthMm / 1000).toFixed(3)} m${association}`, scale, document.canvasHeight));
  }
  return [
    "0", "SECTION", "2", "HEADER", "9", "$INSUNITS", "70", "4", "0", "ENDSEC",
    "0", "SECTION", "2", "ENTITIES", entities.join("\n"), "0", "ENDSEC", "0", "EOF", ""
  ].join("\n");
}

/**
 * Concordancia entre o desenho vetorial e o modelo parametrico que foi de fato
 * calculado. "Aplicar ao calculo" e um empurrao pontual: nada impede que o CAD
 * seja editado depois, e a partir dai o desenho anexado a revisao deixa de
 * corresponder ao que o motor dimensionou.
 */
export interface CadModelAgreement {
  /** Falso quando o CAD ainda nao permite comparacao (sem calibracao, eixo ou contorno unico). */
  readonly comparable: boolean;
  readonly lengthDeltaMm: number | null;
  readonly widthDeltaMm: number | null;
  readonly depthMismatches: readonly {
    readonly zoneId: string;
    readonly markerDepthMm: number;
    readonly zoneDepthMm: number;
  }[];
  readonly agrees: boolean;
  readonly reason: string;
}

/** Tolerancia de 1 mm: "Aplicar ao calculo" arredonda as medidas para inteiro. */
const CAD_AGREEMENT_TOLERANCE_MM = 1;

export function compareCadWithParametricGeometry(
  document: CadGeometryDocument | undefined,
  geometry: {
    readonly internalLengthMm: number;
    readonly internalWidthMm: number;
    readonly depthZones?: readonly { readonly id: string; readonly waterDepthMm: number }[];
  }
): CadModelAgreement {
  const absent = (reason: string): CadModelAgreement =>
    ({ comparable: false, lengthDeltaMm: null, widthDeltaMm: null, depthMismatches: [], agrees: false, reason });

  if (!document || !hasCadGeometryContent(document)) return absent("Revisão sem geometria CAD vinculada.");

  const measurements = measureCadGeometry(document);
  if (!measurements.calibrated) return absent("Geometria CAD sem calibração de escala.");
  if (!measurements.axisDefined) return absent("Geometria CAD sem eixo longitudinal definido.");
  if (measurements.boundaryCount !== 1) {
    return absent(`Geometria CAD com ${measurements.boundaryCount} contorno(s); a comparação exige exatamente um.`);
  }
  if (measurements.longitudinalLengthMm === null || measurements.transverseWidthMm === null) {
    return absent("Geometria CAD sem dimensões orientadas mensuráveis.");
  }

  const lengthDeltaMm = measurements.longitudinalLengthMm - geometry.internalLengthMm;
  const widthDeltaMm = measurements.transverseWidthMm - geometry.internalWidthMm;

  // Só cotas vinculadas a uma zona sao comparaveis: marcadores soltos nao
  // alimentam o modelo parametrico e nao devem acusar divergencia.
  const zonesById = new Map((geometry.depthZones ?? []).map((zone) => [zone.id, zone]));
  const depthMismatches = document.depthMarkers.flatMap((marker) => {
    if (!marker.zoneId) return [];
    const zone = zonesById.get(marker.zoneId);
    if (!zone) return [];
    return Math.abs(marker.depthMm - zone.waterDepthMm) > CAD_AGREEMENT_TOLERANCE_MM
      ? [{ zoneId: marker.zoneId, markerDepthMm: marker.depthMm, zoneDepthMm: zone.waterDepthMm }]
      : [];
  });

  const lengthAgrees = Math.abs(lengthDeltaMm) <= CAD_AGREEMENT_TOLERANCE_MM;
  const widthAgrees = Math.abs(widthDeltaMm) <= CAD_AGREEMENT_TOLERANCE_MM;
  const agrees = lengthAgrees && widthAgrees && depthMismatches.length === 0;

  if (agrees) {
    return {
      comparable: true, lengthDeltaMm, widthDeltaMm, depthMismatches, agrees: true,
      reason: "Desenho vetorial e modelo paramétrico calculado coincidem em comprimento, largura e cotas vinculadas."
    };
  }

  const divergences = [
    ...(lengthAgrees ? [] : [`comprimento difere em ${Math.round(lengthDeltaMm)} mm`]),
    ...(widthAgrees ? [] : [`largura difere em ${Math.round(widthDeltaMm)} mm`]),
    ...(depthMismatches.length > 0 ? [`${depthMismatches.length} cota(s) de zona divergente(s)`] : [])
  ];
  return {
    comparable: true, lengthDeltaMm, widthDeltaMm, depthMismatches, agrees: false,
    reason: `Desenho editado após o último "Aplicar ao cálculo": ${divergences.join("; ")}.`
  };
}
