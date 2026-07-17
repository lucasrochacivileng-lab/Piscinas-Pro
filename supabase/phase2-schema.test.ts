import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationUrl = new URL("./migrations/20260714000330_phase2_product_schema.sql", import.meta.url);
const sql = readFileSync(fileURLToPath(migrationUrl), "utf8").toLowerCase();
const tables = ["projects", "project_revisions", "calculation_runs", "audit_events"];

describe("migration da Fase 2", () => {
  it.each(tables)("habilita RLS em %s", (table) => {
    expect(sql).toContain(`alter table public.${table} enable row level security`);
  });

  it("restringe todas as políticas ao usuário autenticado", () => {
    expect(sql.match(/create policy/g)).toHaveLength(9);
    expect(sql.match(/to authenticated/g)?.length).toBeGreaterThanOrEqual(9);
    expect(sql).not.toMatch(/\nto public\s/);
  });

  it("revoga acesso anônimo e concede apenas os privilégios necessários", () => {
    for (const table of tables) expect(sql).toContain(`revoke all on table public.${table} from anon`);
    expect(sql).toContain("grant select, insert, update, delete on table public.projects to authenticated");
    expect(sql).not.toContain("grant update on table public.project_revisions");
    expect(sql).not.toContain("grant delete on table public.calculation_runs");
  });

  it("salva revisão e execução atomicamente como security invoker", () => {
    expect(sql).toContain("function public.save_calculation_revision");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("for update");
    expect(sql).toContain("unique (project_id, revision_number)");
  });

  it("registra auditoria sem expor a função privada", () => {
    expect(sql).toContain("function private.log_poolstruct_audit");
    expect(sql).toContain("security definer");
    expect(sql).toContain("revoke all on function private.log_poolstruct_audit() from public, anon, authenticated");
    expect(sql.match(/create trigger .*_audit/g)).toHaveLength(3);
  });
});
