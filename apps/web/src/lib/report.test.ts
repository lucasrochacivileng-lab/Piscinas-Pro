import {
  runIntegratedDesign,
  runPhase1Design,
  SILVA_2022_PHASE1_PROFILE
} from "@poolstruct/calculation-engine";
import { describe, expect, it } from "vitest";
import { normalizeIntegratedDesignInput } from "./compatibility";
import { DEFAULT_DESIGN_INPUT } from "./defaults";
import { buildMemoryHtml } from "./report";

const project = {
  id: "project", ownerId: "owner", name: "Piscina <Norte>", location: "Rua A & B",
  status: "calculated" as const, createdAt: "2026-07-13T12:00:00.000Z", updatedAt: "2026-07-13T12:00:00.000Z"
};

describe("buildMemoryHtml", () => {
  it("gera uma memória integrada rastreável e escapa dados do projeto", () => {
    const result = runIntegratedDesign(DEFAULT_DESIGN_INPUT);
    const revision = {
      id: "revision", projectId: project.id, revisionNumber: 2, input: DEFAULT_DESIGN_INPUT,
      result, inputHash: "a".repeat(64), createdAt: "2026-07-13T12:00:00.000Z"
    };

    const html = buildMemoryHtml(project, revision, revision.input, revision.result);

    expect(html).toContain("Piscina &lt;Norte&gt;");
    expect(html).toContain("Rua A &amp; B");
    expect(html).toContain("R2");
    expect(html).toContain("a".repeat(64));
    expect(html).toContain(result.integrationVersion);
    expect(html).toContain("Perfil SPT e parâmetros do solo");
    expect(html).toContain("Flutuação global");
    expect(html).toContain("Argamassa");
    expect(html).toContain(result.masonry!.family.label);
    expect(html).toContain("Controle do lote — ABNT NBR 6136-2");
    expect(html).toContain("0,055%");
    expect(html).toContain("≤ 11% individual");
    expect(html).not.toContain("Piscina <Norte>");
  });

  it("preserva e exporta uma revisão histórica sem inventar resultados geotécnicos", () => {
    const legacyResult = runPhase1Design(DEFAULT_DESIGN_INPUT, SILVA_2022_PHASE1_PROFILE);
    const normalizedInput = normalizeIntegratedDesignInput(DEFAULT_DESIGN_INPUT);
    const revision = {
      id: "legacy", projectId: project.id, revisionNumber: 1, input: normalizedInput,
      result: legacyResult, inputHash: "b".repeat(64), createdAt: "2026-07-12T12:00:00.000Z"
    };

    const html = buildMemoryHtml(project, revision, revision.input, revision.result);

    expect(html).toContain("MEMÓRIA DE CÁLCULO HISTÓRICA");
    expect(html).toContain("não foi recalculado silenciosamente");
    expect(html).toContain(legacyResult.engineVersion);
    expect(html).not.toContain("Perfil SPT e parâmetros do solo");
  });
});
