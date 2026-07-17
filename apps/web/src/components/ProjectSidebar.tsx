import { useState, type FormEvent } from "react";
import type { NewProject, ProjectRecord } from "../lib/models";

interface Props {
  projects: ProjectRecord[];
  activeProjectId: string | null;
  onSelect(project: ProjectRecord): void;
  onCreate(project: NewProject): Promise<void>;
  onArchive(projectId: string): Promise<void>;
}

export function ProjectSidebar({ projects, activeProjectId, onSelect, onCreate, onArchive }: Props) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onCreate({ name, location });
    setName("");
    setLocation("");
    setCreating(false);
  }

  return <section className="sidebar">
    <div className="sidebar-heading"><span>Projetos</span><button className="icon-button" onClick={() => setCreating((value) => !value)} aria-label="Novo projeto">+</button></div>
    {creating && <form className="project-form" onSubmit={(event) => void submit(event)}>
      <label>Nome<input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} required autoFocus /></label>
      <label>Local<input value={location} maxLength={240} onChange={(event) => setLocation(event.target.value)} /></label>
      <button className="primary">Criar projeto</button>
    </form>}
    <nav aria-label="Projetos">
      {projects.length === 0 && <p className="empty-copy">Crie seu primeiro projeto para começar o dimensionamento.</p>}
      {projects.map((project) => <div className={`project-item ${project.id === activeProjectId ? "active" : ""}`} key={project.id}>
        <button className="project-select" onClick={() => onSelect(project)}>
          <strong>{project.name}</strong><small>{project.location || "Local não informado"}</small>
        </button>
        <button className="archive-button" onClick={() => void onArchive(project.id)} aria-label={`Arquivar ${project.name}`}>×</button>
      </div>)}
    </nav>
  </section>;
}
