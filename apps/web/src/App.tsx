import { runPhase1Design, SILVA_2022_PHASE1_PROFILE, type Phase1DesignInput, type Phase1DesignResult } from "@poolstruct/calculation-engine";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth/auth-context";
import { AuthScreen } from "./components/AuthScreen";
import { CalculationEditor } from "./components/CalculationEditor";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { ResultDashboard } from "./components/ResultDashboard";
import { RevisionHistory } from "./components/RevisionHistory";
import { DEFAULT_DESIGN_INPUT } from "./lib/defaults";
import type { NewProject, ProjectRecord, RevisionRecord } from "./lib/models";
import { reportOperationalError, type OperationalEventType } from "./lib/observability";
import { createProjectRepository } from "./lib/repository";

interface ErrorNotice {
  readonly message: string;
  readonly correlationId: string;
}

export function App() {
  const { user, loading, localMode, signOut } = useAuth();
  const repository = useMemo(() => user ? createProjectRepository(user.id) : null, [user]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [editorInput, setEditorInput] = useState<Phase1DesignInput>(DEFAULT_DESIGN_INPUT);
  const [result, setResult] = useState<Phase1DesignResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorNotice | null>(null);

  const handleFailure = useCallback(async (
    eventType: OperationalEventType,
    messageCode: string,
    reason: unknown,
    fallback: string
  ) => {
    const incident = await reportOperationalError(eventType, messageCode, reason, user?.id);
    setError({
      message: fallback,
      correlationId: incident.correlationId
    });
  }, [user?.id]);

  const refreshProjects = useCallback(async () => {
    if (!repository) return;
    const records = await repository.listProjects();
    setProjects(records.filter((project) => project.status !== "archived"));
  }, [repository]);

  useEffect(() => {
    void refreshProjects().catch((reason) => handleFailure("repository_error", "project_list_failed", reason, "Falha ao carregar projetos."));
  }, [handleFailure, refreshProjects]);

  async function selectProject(project: ProjectRecord) {
    if (!repository) return;
    setActiveProject(project);
    setError(null);
    try {
      const records = await repository.listRevisions(project.id);
      setRevisions(records);
      const latest = records[0];
      setEditorInput(latest?.input ?? DEFAULT_DESIGN_INPUT);
      setResult(latest?.result ?? null);
    } catch (reason) {
      await handleFailure("repository_error", "revision_list_failed", reason, "Falha ao carregar revisões.");
    }
  }

  async function createProject(project: NewProject) {
    if (!repository) return;
    try {
      const record = await repository.createProject(project);
      await refreshProjects();
      await selectProject(record);
    } catch (reason) {
      await handleFailure("repository_error", "project_create_failed", reason, "Falha ao criar projeto.");
    }
  }

  async function archiveProject(projectId: string) {
    if (!repository) return;
    try {
      await repository.archiveProject(projectId);
      if (activeProject?.id === projectId) {
        setActiveProject(null);
        setRevisions([]);
        setResult(null);
      }
      await refreshProjects();
    } catch (reason) {
      await handleFailure("repository_error", "project_archive_failed", reason, "Falha ao arquivar projeto.");
    }
  }

  async function calculate(input: Phase1DesignInput) {
    if (!repository || !activeProject) return;
    setBusy(true);
    setError(null);
    try {
      const calculation = runPhase1Design(input, SILVA_2022_PHASE1_PROFILE);
      const revision = await repository.saveRevision(activeProject.id, input, calculation);
      setActiveProject((current) => current ? { ...current, status: "calculated", updatedAt: revision.createdAt } : current);
      setEditorInput(input);
      setResult(calculation);
      setRevisions((current) => [revision, ...current]);
      await refreshProjects();
    } catch (reason) {
      await handleFailure("calculation_error", "calculation_or_save_failed", reason, "Não foi possível executar o cálculo.");
    } finally {
      setBusy(false);
    }
  }

  function openRevision(revision: RevisionRecord) {
    setEditorInput(revision.input);
    setResult(revision.result);
  }

  if (loading) return <div className="loading-screen">Carregando ambiente seguro…</div>;
  if (!user) return <AuthScreen />;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">PS</div><div><strong>POOLSTRUCT</strong><small>Estruturas de piscinas</small></div></div>
      <div className="account"><span>{user.email}</span>{!localMode && <button className="text-button" onClick={() => void signOut()}>Sair</button>}</div>
    </header>
    {localMode && <div className="local-banner"><strong>Modo local ativo.</strong> Configure as variáveis do Supabase para autenticação, RLS e sincronização em nuvem.</div>}
    <div className="workspace">
      <ProjectSidebar projects={projects} activeProjectId={activeProject?.id ?? null} onSelect={(project) => void selectProject(project)} onCreate={createProject} onArchive={archiveProject} />
      <main className="main-content">
        {error && <div className="error-banner" role="alert"><strong>{error.message}</strong><small>Código do incidente: {error.correlationId}</small></div>}
        {!activeProject ? <section className="welcome-card"><p className="eyebrow">Fase 4 · pronta para homologação</p><h1>Do modelo estrutural à memória de cálculo.</h1><p>Crie um projeto para dimensionar paredes e laje, registrar revisões imutáveis e emitir um relatório rastreável.</p><div className="welcome-features"><span>Motor determinístico</span><span>Histórico com SHA-256</span><span>CI e E2E automatizados</span></div></section> : <>
          <section className="project-header"><div><p className="eyebrow">Projeto ativo</p><h1>{activeProject.name}</h1><p>{activeProject.location || "Local não informado"}</p></div><span className="project-state">{activeProject.status === "calculated" ? "Calculado" : "Rascunho"}</span></section>
          <div className="content-grid"><div className="primary-column"><CalculationEditor initialInput={editorInput} busy={busy} onCalculate={calculate} />{result && <ResultDashboard result={result} />}</div><RevisionHistory project={activeProject} revisions={revisions} onOpen={openRevision} /></div>
        </>}
      </main>
    </div>
  </div>;
}
