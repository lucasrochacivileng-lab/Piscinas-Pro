import { createEmptyCadGeometryDocument } from "@poolstruct/calculation-engine";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cadDraftKey,
  loadCadDraft,
  saveCadDraft
} from "./cad";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("CAD draft persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  it("carrega somente o rascunho baseado na revisão atual", () => {
    const document = {
      ...createEmptyCadGeometryDocument(),
      paths: [{
        id: "pool",
        label: "Contorno",
        role: "BOUNDARY" as const,
        curve: "POLYLINE" as const,
        closed: true,
        points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }]
      }]
    };
    expect(saveCadDraft("owner", "project", document, {
      baseRevisionId: "revision-2",
      baseInputHash: "hash-2"
    })).toBe(true);

    expect(loadCadDraft("owner", "project", {
      baseRevisionId: "revision-2",
      baseInputHash: "hash-2"
    })?.paths).toHaveLength(1);
    expect(loadCadDraft("owner", "project", {
      baseRevisionId: "revision-3",
      baseInputHash: "hash-3"
    })).toBeNull();
  });

  it("rejeita conteúdo corrompido sem lançar erro", () => {
    localStorage.setItem(cadDraftKey("owner", "project"), "{invalid-json");
    expect(loadCadDraft("owner", "project", {
      baseRevisionId: null,
      baseInputHash: null
    })).toBeNull();
  });

  it("migra rascunho legado somente antes da primeira revisão", () => {
    localStorage.setItem(
      cadDraftKey("owner", "project"),
      JSON.stringify(createEmptyCadGeometryDocument())
    );
    expect(loadCadDraft("owner", "project", {
      baseRevisionId: null,
      baseInputHash: null
    })).not.toBeNull();
    expect(loadCadDraft("owner", "project", {
      baseRevisionId: "revision-1",
      baseInputHash: "hash-1"
    })).toBeNull();
  });
});
