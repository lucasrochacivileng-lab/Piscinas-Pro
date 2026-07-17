import type { IntegratedDesignInput, IntegratedDesignResult } from "@poolstruct/calculation-engine";
import type { Json } from "./database.types";
import { sha256 } from "./hash";
import type { NewProject, ProjectRecord, ProjectRepository, RevisionRecord } from "./models";
import { supabase } from "./supabase";

interface LocalDatabase {
  projects: ProjectRecord[];
  revisions: RevisionRecord[];
}

const toJson = (value: unknown): Json => value as Json;

const resultSummary = (result: IntegratedDesignResult): Json => ({
  overallStatus: result.overallStatus,
  capacityLitres: result.hydrostatic.approximateCapacityLitres,
  maximumWallPressureKPa: result.hydrostatic.maximumWallPressureKPa,
  checks: result.checks.length,
  integrationVersion: result.integrationVersion ?? null,
  flotationSafetyFactor: result.flotation?.safetyFactor ?? null,
  foundationNspt: result.geotechnical?.foundationNspt ?? null
});

const mapProject = (row: {
  id: string;
  owner_id: string;
  name: string;
  location: string;
  status: "draft" | "calculated" | "archived";
  created_at: string;
  updated_at: string;
}): ProjectRecord => ({
  id: row.id,
  ownerId: row.owner_id,
  name: row.name,
  location: row.location,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export class LocalProjectRepository implements ProjectRepository {
  private readonly storageKey: string;

  constructor(private readonly ownerId: string) {
    this.storageKey = `poolstruct:phase2:${ownerId}`;
  }

  private read(): LocalDatabase {
    const raw = localStorage.getItem(this.storageKey);
    return raw ? JSON.parse(raw) as LocalDatabase : { projects: [], revisions: [] };
  }

  private write(database: LocalDatabase): void {
    localStorage.setItem(this.storageKey, JSON.stringify(database));
  }

  async listProjects(): Promise<ProjectRecord[]> {
    return this.read().projects.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async createProject(project: NewProject): Promise<ProjectRecord> {
    const database = this.read();
    const now = new Date().toISOString();
    const record: ProjectRecord = {
      id: crypto.randomUUID(),
      ownerId: this.ownerId,
      name: project.name.trim(),
      location: project.location.trim(),
      status: "draft",
      createdAt: now,
      updatedAt: now
    };
    database.projects.push(record);
    this.write(database);
    return record;
  }

  async archiveProject(projectId: string): Promise<void> {
    const database = this.read();
    database.projects = database.projects.map((project) => project.id === projectId
      ? { ...project, status: "archived", updatedAt: new Date().toISOString() }
      : project);
    this.write(database);
  }

  async listRevisions(projectId: string): Promise<RevisionRecord[]> {
    return this.read().revisions
      .filter((revision) => revision.projectId === projectId)
      .sort((left, right) => right.revisionNumber - left.revisionNumber);
  }

  async saveRevision(
    projectId: string,
    input: IntegratedDesignInput,
    result: IntegratedDesignResult
  ): Promise<RevisionRecord> {
    const database = this.read();
    const project = database.projects.find((item) => item.id === projectId);
    if (!project) throw new Error("Projeto não encontrado.");
    const revisionNumber = database.revisions
      .filter((revision) => revision.projectId === projectId)
      .reduce((maximum, revision) => Math.max(maximum, revision.revisionNumber), 0) + 1;
    const record: RevisionRecord = {
      id: crypto.randomUUID(),
      projectId,
      revisionNumber,
      input,
      result,
      inputHash: await sha256(input),
      createdAt: new Date().toISOString()
    };
    database.revisions.push(record);
    database.projects = database.projects.map((item) => item.id === projectId
      ? { ...item, status: "calculated", updatedAt: record.createdAt }
      : item);
    this.write(database);
    return record;
  }
}

export class SupabaseProjectRepository implements ProjectRepository {
  constructor(private readonly ownerId: string) {
    if (!supabase) throw new Error("Supabase não configurado.");
  }

  async listProjects(): Promise<ProjectRecord[]> {
    const { data, error } = await supabase!.from("projects").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    return data.map(mapProject);
  }

  async createProject(project: NewProject): Promise<ProjectRecord> {
    const { data, error } = await supabase!.from("projects").insert({
      owner_id: this.ownerId,
      name: project.name.trim(),
      location: project.location.trim()
    }).select().single();
    if (error) throw error;
    return mapProject(data);
  }

  async archiveProject(projectId: string): Promise<void> {
    const { error } = await supabase!.from("projects").update({ status: "archived" }).eq("id", projectId);
    if (error) throw error;
  }

  async listRevisions(projectId: string): Promise<RevisionRecord[]> {
    const [revisionsResponse, runsResponse] = await Promise.all([
      supabase!.from("project_revisions").select("*").eq("project_id", projectId).order("revision_number", { ascending: false }),
      supabase!.from("calculation_runs").select("*").eq("project_id", projectId)
    ]);
    if (revisionsResponse.error) throw revisionsResponse.error;
    if (runsResponse.error) throw runsResponse.error;
    const runs = new Map(runsResponse.data.map((run) => [run.revision_id, run]));
    return revisionsResponse.data.flatMap((revision) => {
      const run = runs.get(revision.id);
      return run ? [{
        id: revision.id,
        projectId: revision.project_id,
        revisionNumber: revision.revision_number,
        input: revision.input_snapshot as unknown as IntegratedDesignInput,
        result: run.full_result as unknown as IntegratedDesignResult,
        inputHash: run.input_hash,
        createdAt: revision.created_at
      }] : [];
    });
  }

  async saveRevision(
    projectId: string,
    input: IntegratedDesignInput,
    result: IntegratedDesignResult
  ): Promise<RevisionRecord> {
    const inputHash = await sha256(input);
    const { data, error } = await supabase!.rpc("save_calculation_revision", {
      target_project_id: projectId,
      new_input_snapshot: toJson(input),
      new_engine_version: result.integrationVersion ?? result.engineVersion,
      new_profile_id: result.profileId,
      new_profile_version: result.profileVersion,
      new_overall_status: result.overallStatus,
      new_input_hash: inputHash,
      new_result_summary: resultSummary(result),
      new_full_result: toJson(result),
      new_warnings: toJson(result.warnings)
    });
    if (error) throw error;
    const saved = data[0];
    if (!saved) throw new Error("A revisão não foi persistida.");
    return {
      id: saved.revision_id,
      projectId,
      revisionNumber: saved.revision_number,
      input,
      result,
      inputHash,
      createdAt: new Date().toISOString()
    };
  }
}

export const createProjectRepository = (ownerId: string): ProjectRepository =>
  supabase ? new SupabaseProjectRepository(ownerId) : new LocalProjectRepository(ownerId);
