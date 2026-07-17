import type { IntegratedDesignInput, IntegratedDesignResult } from "@poolstruct/calculation-engine";
import type { StoredDesignResult } from "./compatibility";

export interface AuthUser {
  readonly id: string;
  readonly email: string;
}

export interface ProjectRecord {
  readonly id: string;
  readonly ownerId: string;
  readonly name: string;
  readonly location: string;
  readonly status: "draft" | "calculated" | "archived";
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RevisionRecord {
  readonly id: string;
  readonly projectId: string;
  readonly revisionNumber: number;
  readonly input: IntegratedDesignInput;
  readonly result: StoredDesignResult;
  readonly inputHash: string;
  readonly createdAt: string;
}

export interface NewProject {
  readonly name: string;
  readonly location: string;
}

export interface ProjectRepository {
  listProjects(): Promise<ProjectRecord[]>;
  createProject(project: NewProject): Promise<ProjectRecord>;
  archiveProject(projectId: string): Promise<void>;
  listRevisions(projectId: string): Promise<RevisionRecord[]>;
  saveRevision(
    projectId: string,
    input: IntegratedDesignInput,
    result: IntegratedDesignResult
  ): Promise<RevisionRecord>;
}
