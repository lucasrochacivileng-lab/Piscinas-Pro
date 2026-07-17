import type { ProjectRecord, RevisionRecord } from "../lib/models";
import { downloadMemoryHtml } from "../lib/report";
import { StatusBadge } from "./StatusBadge";

interface Props {
  project: ProjectRecord;
  revisions: RevisionRecord[];
  onOpen(revision: RevisionRecord): void;
}

export function RevisionHistory({ project, revisions, onOpen }: Props) {
  return <section className="revision-panel"><div className="section-title"><h2>Revisões</h2><span className="revision-count">{revisions.length}</span></div>
    {revisions.length === 0 ? <p className="empty-copy">O primeiro cálculo salvo aparecerá aqui com hash e resultado completos.</p> : <div className="revision-list">{revisions.map((revision) => <article key={revision.id}>
      <button className="revision-open" onClick={() => onOpen(revision)}><span><strong>R{revision.revisionNumber}</strong><small>{new Date(revision.createdAt).toLocaleString("pt-BR")}</small></span><StatusBadge status={revision.result.overallStatus} /></button>
      <code title={revision.inputHash}>{revision.inputHash.slice(0, 12)}…</code>
      <button className="text-button" onClick={() => downloadMemoryHtml(project, revision)}>Baixar memória HTML</button>
    </article>)}</div>}
  </section>;
}
