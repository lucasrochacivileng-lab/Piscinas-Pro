export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          location: string;
          status: "draft" | "calculated" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          location?: string;
          status?: "draft" | "calculated" | "archived";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          location?: string;
          status?: "draft" | "calculated" | "archived";
        };
        Relationships: [];
      };
      project_revisions: {
        Row: {
          id: string;
          project_id: string;
          owner_id: string;
          revision_number: number;
          input_snapshot: Json;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      calculation_runs: {
        Row: {
          id: string;
          project_id: string;
          revision_id: string;
          owner_id: string;
          engine_version: string;
          profile_id: string;
          profile_version: string;
          overall_status: "PASS" | "FAIL" | "REQUIRES_REVIEW";
          input_hash: string;
          result_summary: Json;
          full_result: Json;
          warnings: Json;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: number;
          owner_id: string;
          actor_id: string | null;
          entity_type: "project" | "project_revision" | "calculation_run";
          entity_id: string;
          action: "insert" | "update" | "delete";
          metadata: Json;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      operational_events: {
        Row: {
          id: string;
          owner_id: string;
          correlation_id: string;
          event_type: "ui_error" | "repository_error" | "calculation_error" | "recovery_drill";
          severity: "warning" | "error";
          message_code: string;
          context: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          correlation_id: string;
          event_type: "ui_error" | "repository_error" | "calculation_error" | "recovery_drill";
          severity: "warning" | "error";
          message_code: string;
          context?: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      save_calculation_revision: {
        Args: {
          target_project_id: string;
          new_input_snapshot: Json;
          new_engine_version: string;
          new_profile_id: string;
          new_profile_version: string;
          new_overall_status: string;
          new_input_hash: string;
          new_result_summary: Json;
          new_full_result: Json;
          new_warnings: Json;
        };
        Returns: Array<{
          revision_id: string;
          run_id: string;
          revision_number: number;
        }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
