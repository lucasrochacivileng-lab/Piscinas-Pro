import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationUrl = new URL("./migrations/20260714004205_phase3_reliability_observability.sql", import.meta.url);
const sql = readFileSync(fileURLToPath(migrationUrl), "utf8").toLowerCase();

describe("migration de confiabilidade da Fase 3", () => {
  it("habilita RLS e isola eventos pelo proprietário", () => {
    expect(sql).toContain("alter table public.operational_events enable row level security");
    expect(sql.match(/create policy/g)).toHaveLength(2);
    expect(sql.match(/\(select auth\.uid\(\)\) = owner_id/g)).toHaveLength(2);
  });

  it("não concede mutação ou acesso ao papel anônimo", () => {
    expect(sql).toContain("revoke all on table public.operational_events from anon");
    expect(sql).toContain("grant select, insert on table public.operational_events to authenticated");
    expect(sql).not.toContain("grant update");
    expect(sql).not.toContain("grant delete");
  });

  it("limita tipos, tamanho de contexto e duplicidade", () => {
    expect(sql).toContain("octet_length(context::text) <= 4096");
    expect(sql).toContain("unique (owner_id, correlation_id)");
    expect(sql).toContain("message_code ~ '^[a-z0-9_]{3,80}$'");
  });

  it("indexa a consulta operacional principal", () => {
    expect(sql).toContain("operational_events_owner_created_at_idx");
    expect(sql).toContain("(owner_id, created_at desc)");
    expect(sql).toContain("operational_events_created_at_idx");
  });

  it("oferece retenção administrativa sem expor execução ao cliente", () => {
    expect(sql).toContain("function private.prune_operational_events");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("retention must be at least 7 days");
    expect(sql).toContain("from public, anon, authenticated");
  });
});
