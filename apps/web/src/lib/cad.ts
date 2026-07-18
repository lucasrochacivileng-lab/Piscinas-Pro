import {
  buildCadGeometryDxf,
  normalizeCadGeometryDocument,
  type CadGeometryDocument,
  type CadPath,
  type CadPoint
} from "@poolstruct/calculation-engine";

const midpoint = (a: CadPoint, b: CadPoint): CadPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const point = (value: CadPoint): string => `${value.x.toFixed(2)} ${value.y.toFixed(2)}`;

export interface CadDraftContext {
  readonly baseRevisionId: string | null;
  readonly baseInputHash: string | null;
}

export interface CadDraftRecord {
  readonly version: "cad-draft-1.0.0";
  readonly updatedAt: string;
  readonly baseRevisionId: string | null;
  readonly baseInputHash: string | null;
  readonly document: CadGeometryDocument;
}

export function cadPathSvgData(path: Pick<CadPath, "points" | "curve" | "closed">): string {
  if (path.points.length === 0) return "";
  if (path.curve === "POLYLINE" || path.points.length < 3) {
    return `M ${path.points.map(point).join(" L ")}${path.closed ? " Z" : ""}`;
  }

  if (path.closed) {
    const first = path.points[0]!;
    const last = path.points.at(-1)!;
    const commands = [`M ${point(midpoint(last, first))}`];
    for (let index = 0; index < path.points.length; index += 1) {
      const control = path.points[index]!;
      const next = path.points[(index + 1) % path.points.length]!;
      commands.push(`Q ${point(control)} ${point(midpoint(control, next))}`);
    }
    commands.push("Z");
    return commands.join(" ");
  }

  const commands = [`M ${point(path.points[0]!)}`];
  for (let index = 1; index < path.points.length - 1; index += 1) {
    const control = path.points[index]!;
    const next = path.points[index + 1]!;
    const end = index === path.points.length - 2 ? next : midpoint(control, next);
    commands.push(`Q ${point(control)} ${point(end)}`);
  }
  return commands.join(" ");
}

export function downloadCadGeometryDxf(document: CadGeometryDocument, projectName: string): void {
  const dxf = buildCadGeometryDxf(document, `POOLSTRUCT CAD 2D - ${projectName}`);
  const url = URL.createObjectURL(new Blob([dxf], { type: "image/vnd.dxf;charset=utf-8" }));
  const link = window.document.createElement("a");
  link.href = url;
  const slug = projectName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "piscina";
  link.download = `${slug}-geometria-cad.dxf`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function cadDraftKey(ownerId: string, projectId: string): string {
  return `poolstruct:cad-2d:${ownerId}:${projectId}`;
}

const sameContext = (record: CadDraftRecord, context: CadDraftContext): boolean =>
  record.baseRevisionId === context.baseRevisionId && record.baseInputHash === context.baseInputHash;

const parseDraftRecord = (value: unknown): CadDraftRecord | null => {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<CadDraftRecord>;
  if (candidate.version !== "cad-draft-1.0.0" || typeof candidate.updatedAt !== "string") return null;
  if (candidate.baseRevisionId !== null && typeof candidate.baseRevisionId !== "string") return null;
  if (candidate.baseInputHash !== null && typeof candidate.baseInputHash !== "string") return null;
  const document = normalizeCadGeometryDocument(candidate.document);
  return document ? {
    version: "cad-draft-1.0.0",
    updatedAt: candidate.updatedAt,
    baseRevisionId: candidate.baseRevisionId ?? null,
    baseInputHash: candidate.baseInputHash ?? null,
    document
  } : null;
};

export function loadCadDraft(
  ownerId: string,
  projectId: string,
  context: CadDraftContext
): CadGeometryDocument | null {
  try {
    const raw = localStorage.getItem(cadDraftKey(ownerId, projectId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const record = parseDraftRecord(parsed);
    if (record) return sameContext(record, context) ? record.document : null;

    // Migração de rascunhos da primeira versão: só é segura antes da primeira revisão.
    if (context.baseRevisionId !== null || context.baseInputHash !== null) return null;
    return normalizeCadGeometryDocument(parsed);
  } catch {
    return null;
  }
}

export function saveCadDraft(
  ownerId: string,
  projectId: string,
  document: CadGeometryDocument,
  context: CadDraftContext
): boolean {
  try {
    const normalized = normalizeCadGeometryDocument(document);
    if (!normalized) return false;
    const record: CadDraftRecord = {
      version: "cad-draft-1.0.0",
      updatedAt: new Date().toISOString(),
      baseRevisionId: context.baseRevisionId,
      baseInputHash: context.baseInputHash,
      document: normalized
    };
    localStorage.setItem(cadDraftKey(ownerId, projectId), JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}
