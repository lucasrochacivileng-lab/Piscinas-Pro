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
    <header className="viewport-header">
      <div className="section-title"><div><p className="eyebrow">Viewport · prancha</p><h2>Prancha estrutural</h2></div></div>
      <span className="drawing-badge">{DRAWING_SHEET.designation} · R{revision.revisionNumber}</span>
      <div className="drawing-actions">
        <button className="secondary" onClick={() => downloadTechnicalDrawing(project, revision)}>Baixar prancha SVG</button>
        <small>A3 vetorial · abre em CAD ou editor vetorial</small>
      </div>
    </header>
    <div className="drawing-preview">
      <img src={previewUrl} alt={`Prancha estrutural ${project.name}, revisão R${revision.revisionNumber}`} />
    </div>
    <p className="drawing-summary">Planta de formas e armaduras · corte A—A · elevação da parede longa · níveis · cotas · quadro de armaduras</p>
    <p className="drawing-disclaimer">Pré-dimensionamento acadêmico. A prancha não substitui projeto executivo, ART/RRT ou revisão de engenheiro habilitado.</p>
  </section>;
}
