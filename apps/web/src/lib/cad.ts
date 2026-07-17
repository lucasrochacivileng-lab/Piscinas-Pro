import {
  buildCadGeometryDxf,
  type CadGeometryDocument,
  type CadPath,
  type CadPoint
} from "@poolstruct/calculation-engine";

const midpoint = (a: CadPoint, b: CadPoint): CadPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const point = (value: CadPoint): string => `${value.x.toFixed(2)} ${value.y.toFixed(2)}`;

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
  URL.revokeObjectURL(url);
}

export function cadDraftKey(ownerId: string, projectId: string): string {
  return `poolstruct:cad-2d:${ownerId}:${projectId}`;
}

export function loadCadDraft(ownerId: string, projectId: string): CadGeometryDocument | null {
  try {
    const raw = localStorage.getItem(cadDraftKey(ownerId, projectId));
    return raw ? JSON.parse(raw) as CadGeometryDocument : null;
  } catch {
    return null;
  }
}

export function saveCadDraft(ownerId: string, projectId: string, document: CadGeometryDocument): void {
  localStorage.setItem(cadDraftKey(ownerId, projectId), JSON.stringify(document));
}
