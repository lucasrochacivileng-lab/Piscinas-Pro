import { useMemo } from "react";
import { buildTechnicalDrawingSvg, downloadTechnicalDrawing, DRAWING_SHEET } from "../lib/drawing";
import type { ProjectRecord, RevisionRecord } from "../lib/models";

interface DrawingPanelProps {
  project: ProjectRecord;
  revision: RevisionRecord;
}

export function DrawingPanel({ project, revision }: DrawingPanelProps) {
  const svg = useMemo(() => buildTechnicalDrawingSvg(project, revision), [project, revision]);
  const previewUrl = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, [svg]);

  return <section className="drawing-panel">
    <div className="section-title">
      <div><p className="eyebrow">Fase 5 · desenho automático</p><h2>Prancha estrutural</h2></div>
      <span className="drawing-badge">{DRAWING_SHEET.designation} · R{revision.revisionNumber}</span>
    </div>
    <p className="drawing-summary">Planta, corte A—A, elevação da parede longa, níveis, cotas e quadro das armaduras calculadas.</p>
    <div className="drawing-preview">
      <img src={previewUrl} alt={`Prancha estrutural ${project.name}, revisão R${revision.revisionNumber}`} />
    </div>
    <div className="drawing-actions">
      <button className="primary" onClick={() => downloadTechnicalDrawing(project, revision)}>Baixar prancha SVG</button>
      <small>A3 vetorial · abre em navegador, CAD compatível ou editor vetorial</small>
    </div>
    <p className="drawing-disclaimer">Pré-dimensionamento acadêmico. A prancha não substitui projeto executivo, ART/RRT ou revisão de engenheiro habilitado.</p>
  </section>;
}
