import {
  createEmptyCadGeometryDocument,
  runIntegratedDesign,
  type CadGeometryDocument,
  type IntegratedDesignInput,
  type PoolDepthZoneInput
} from "@poolstruct/calculation-engine";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth/auth-context";
import { AuthScreen } from "./components/AuthScreen";
import { CadGeometryPanel } from "./components/CadGeometryPanel";
import { CalculationEditor } from "./components/CalculationEditor";
import { DrawingPanel } from "./components/DrawingPanel";
import { GeotechnicalPanel } from "./components/GeotechnicalPanel";
import { MasonryPanel } from "./components/MasonryPanel";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { ResultDashboard } from "./components/ResultDashboard";
import { RevisionHistory } from "./components/RevisionHistory";
import { loadCadDraft } from "./lib/cad";
import {
  isIntegratedDesignResult,
  normalizeIntegratedDesignInput,
  type StoredDesignResult
} from "./lib/compatibility";
import { DEFAULT_DESIGN_INPUT } from "./lib/defaults";
import { DRAWING_SHEET } from "./lib/drawing";
import type { NewProject, ProjectRecord, RevisionRecord } from "./lib/models";
import { reportOperationalError, type OperationalEventType } from "./lib/observability";
import { createProjectRepository } from "./lib/repository";

interface ErrorNotice {
  readonly message: string;
  readonly correlationId: string;
}

const EMPTY_CAD = createEmptyCadGeometryDocument();

const zoneDepth = (zone: PoolDepthZoneInput): number => Math.max(
  zone.waterDepthMm,
  zone.startWaterDepthMm ?? zone.waterDepthMm,
  zone.endWaterDepthMm ?? zone.waterDepthMm
);

export function App() {
  const { user, loading, localMode, signOut } = useAuth();
  const repository = useMemo(() => user ? createProjectRepository(user.id) : null, [user]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [activeRevision, setActiveRevision] = useState<RevisionRecord | null>(null);
  const [editorInput, setEditorInput] = useState<IntegratedDesignInput>(DEFAULT_DESIGN_INPUT);
  const [result, setResult] = useState<StoredDesignResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorNotice | null>(null);

  const handleFailure = useCallback(async (
    eventType: OperationalEventType,
    messageCode: string,
    reason: unknown,
    fallback: string
  ) => {
    const incident = await reportOperationalError(eventType, messageCode, reason, user?.id);
    setError({ message: fallback, correlationId: incident.correlationId });
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
    if (!repository || !user) return;
    setActiveProject(project);
    setError(null);
    try {
      const records = await repository.listRevisions(project.id);
      setRevisions(records);
      const latest = records[0];
      const normalized = normalizeIntegratedDesignInput(latest?.input ?? DEFAULT_DESIGN_INPUT);
      const draft = loadCadDraft(user.id, project.id);
      setActiveRevision(latest ?? null);
      setEditorInput({ ...normalized, cadGeometry: draft ?? normalized.cadGeometry ?? createEmptyCadGeometryDocument() });
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
        setActiveRevision(null);
        setResult(null);
        setEditorInput(DEFAULT_DESIGN_INPUT);
      }
      await refreshProjects();
    } catch (reason) {
      await handleFailure("repository_error", "project_archive_failed", reason, "Falha ao arquivar projeto.");
    }
  }

  async function calculate(input: IntegratedDesignInput) {
    if (!repository || !activeProject) return;
    setBusy(true);
    setError(null);
    try {
      const normalizedInput = normalizeIntegratedDesignInput(input);
      const calculation = runIntegratedDesign(normalizedInput);
      const revision = await repository.saveRevision(activeProject.id, normalizedInput, calculation);
      setActiveProject((current) => current ? { ...current, status: "calculated", updatedAt: revision.createdAt } : current);
      setEditorInput(normalizedInput);
      setResult(calculation);
      setActiveRevision(revision);
      setRevisions((current) => [revision, ...current]);
      await refreshProjects();
    } catch (reason) {
      await handleFailure("calculation_error", "calculation_or_save_failed", reason, "Não foi possível executar o cálculo.");
    } finally {
      setBusy(false);
    }
  }

  function openRevision(revision: RevisionRecord) {
    const normalized = normalizeIntegratedDesignInput(revision.input);
    setActiveRevision(revision);
    setEditorInput(normalized);
    setResult(revision.result);
  }

  const syncEditorInput = useCallback((input: IntegratedDesignInput) => setEditorInput(input), []);
  const updateCadGeometry = useCallback((cadGeometry: CadGeometryDocument) => {
    setEditorInput((current) => ({ ...current, cadGeometry }));
  }, []);

  const applyCadEnvelope = useCallback((cad: { lengthMm: number; widthMm: number; maximumDepthMm?: number }) => {
    setEditorInput((current) => {
      const targetLengthMm = Math.max(cad.lengthMm, cad.widthMm);
      const targetWidthMm = Math.min(cad.lengthMm, cad.widthMm);
      const existingZones = current.geometry.depthZones && current.geometry.depthZones.length > 0
        ? [...current.geometry.depthZones]
        : [{
          id: "main", label: "Fundo principal", kind: "MAIN" as const,
          lengthMm: current.geometry.internalLengthMm,
          waterDepthMm: current.geometry.waterDepthMm,
          floorProfile: "HORIZONTAL" as const,
          startWaterDepthMm: current.geometry.waterDepthMm,
          endWaterDepthMm: current.geometry.waterDepthMm
        }];
      const total = existingZones.reduce((sum, zone) => sum + zone.lengthMm, 0);
      const factor = total > 0 ? targetLengthMm / total : 1;
      const scaledZones = existingZones.map((zone) => ({ ...zone, lengthMm: Math.max(100, Math.round(zone.lengthMm * factor)) }));
      const scaledTotal = scaledZones.reduce((sum, zone) => sum + zone.lengthMm, 0);
      const last = scaledZones.at(-1);
      if (last) scaledZones[scaledZones.length - 1] = { ...last, lengthMm: Math.max(100, last.lengthMm + targetLengthMm - scaledTotal) };
      if (scaledZones.length === 1 && cad.maximumDepthMm !== undefined) {
        const only = scaledZones[0]!;
        scaledZones[0] = {
          ...only,
          waterDepthMm: cad.maximumDepthMm,
          startWaterDepthMm: cad.maximumDepthMm,
          endWaterDepthMm: cad.maximumDepthMm,
          floorProfile: "HORIZONTAL"
        };
      }
      const maximumDepthMm = Math.max(...scaledZones.map(zoneDepth));
      return {
        ...current,
        geometry: {
          ...current.geometry,
          internalLengthMm: targetLengthMm,
          internalWidthMm: targetWidthMm,
          waterDepthMm: maximumDepthMm,
          depthZones: scaledZones
        }
      };
    });
  }, []);

  if (loading) return <div className="loading-screen">Carregando ambiente seguro…</div>;
  if (!user) return <AuthScreen />;

  const statusClass = result?.overallStatus === "PASS" ? "sb-pass" : result?.overallStatus === "FAIL" ? "sb-fail" : "sb-review";
  const engineLabel = result
    ? isIntegratedDesignResult(result) ? result.integrationVersion : result.engineVersion
    : null;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark">PS</div><div><strong>POOLSTRUCT</strong><small>Pré-dimensionamento estrutural de piscinas</small></div></div>
      <div className="account"><span>{user.email}</span>{!localMode && <button className="text-button" onClick={() => void signOut()}>Sair</button>}</div>
    </header>
    {localMode && <div className="local-banner"><strong>MODO LOCAL</strong> — configure as variáveis do Supabase para autenticação, RLS e sincronização em nuvem.</div>}
    <div className={activeProject ? "workspace with-props" : "workspace"}>
      <aside className="navigator">
        <ProjectSidebar projects={projects} activeProjectId={activeProject?.id ?? null} onSelect={(project) => void selectProject(project)} onCreate={createProject} onArchive={archiveProject} />
        {activeProject && <RevisionHistory project={activeProject} revisions={revisions} onOpen={openRevision} />}
      </aside>
      <main className="main-content">
        {error && <div className="error-banner" role="alert"><strong>{error.message}</strong><small>Código do incidente: {error.correlationId}</small></div>}
        {!activeProject ? <section className="welcome-card"><div>
          <p className="eyebrow">Ambiente de dimensionamento</p>
          <h1>Nenhum projeto aberto</h1>
          <p>Crie ou selecione um projeto no navegador à esquerda para carregar o modelo estrutural, geotécnico, normativo e as revisões imutáveis.</p>
          <div className="welcome-features"><span>Motor determinístico</span><span>CAD 2D calibrado</span><span>SPT por camadas</span><span>Histórico SHA-256</span></div>
        </div></section> : <>
          <section className="project-header"><div><h1>{activeProject.name}</h1><p>{activeProject.location || "Local não informado"}</p></div><span className="project-state">{activeProject.status === "calculated" ? "Calculado" : "Rascunho"}</span></section>
          <CadGeometryPanel
            key={activeProject.id}
            ownerId={user.id}
            projectId={activeProject.id}
            projectName={activeProject.name}
            document={editorInput.cadGeometry ?? EMPTY_CAD}
            onChange={updateCadGeometry}
            onApplyEnvelope={applyCadEnvelope}
          />
          {activeRevision && <DrawingPanel project={activeProject} revision={activeRevision} />}
          {result && <ResultDashboard result={result} />}
          {result && isIntegratedDesignResult(result) && <GeotechnicalPanel result={result} />}
          {result && !isIntegratedDesignResult(result) && <section className="results-panel"><div className="warning-box"><strong>Revisão histórica</strong><p>Esta revisão foi calculada antes da integração geotécnica e normativa. Os dados antigos foram preservados; o editor recebeu valores padrão apenas para uma nova revisão.</p></div></section>}
          {result?.masonry && <MasonryPanel masonry={result.masonry} />}
        </>}
      </main>
      {activeProject && <aside className="props-panel"><CalculationEditor initialInput={editorInput} busy={busy} onInputChange={syncEditorInput} onCalculate={calculate} /></aside>}
    </div>
    <footer className="statusbar">
      <span className="sb-accent">POOLSTRUCT</span>
      <span>{activeProject ? activeProject.name : "sem projeto"}</span>
      <span>{activeRevision ? `R${activeRevision.revisionNumber}` : "R—"}</span>
      <span>{activeRevision ? `SHA ${activeRevision.inputHash.slice(0, 12)}` : "SHA —"}</span>
      {result && <span className={statusClass}>{result.overallStatus}</span>}
      {engineLabel && <span>motor {engineLabel}</span>}
      <span className="grow"></span>
      <span>{DRAWING_SHEET.format} · {DRAWING_SHEET.designation}</span>
      <span>mm · kN · MPa</span>
      <span className="sb-warn">PRÉ-DIMENSIONAMENTO · REVISÃO TÉCNICA OBRIGATÓRIA</span>
    </footer>
  </div>;
}
