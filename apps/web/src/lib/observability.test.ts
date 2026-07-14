import { afterEach, describe, expect, it, vi } from "vitest";
import { reportOperationalError } from "./observability";

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); }
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("observabilidade operacional", () => {
  it("registra correlação sem persistir a mensagem bruta do erro", async () => {
    const storage = createStorage();
    vi.stubGlobal("localStorage", storage);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const incident = await reportOperationalError(
      "calculation_error",
      "calculation_failed",
      new Error("entrada estrutural confidencial")
    );
    const persisted = storage.getItem("poolstruct:operational-events") ?? "";

    expect(incident.correlationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(persisted).toContain("calculation_failed");
    expect(persisted).toContain("Error");
    expect(persisted).not.toContain("entrada estrutural confidencial");
  });

  it("limita o buffer local aos 50 eventos mais recentes", async () => {
    const storage = createStorage();
    vi.stubGlobal("localStorage", storage);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    for (let index = 0; index < 55; index += 1) {
      await reportOperationalError("ui_error", `ui_failure_${index}`, new Error("falha"));
    }
    const events = JSON.parse(storage.getItem("poolstruct:operational-events") ?? "[]") as unknown[];
    expect(events).toHaveLength(50);
  });
});
