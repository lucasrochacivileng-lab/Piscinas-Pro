import { describe, expect, it } from "vitest";
import { runIntegratedDesign } from "@poolstruct/calculation-engine";
import { DEFAULT_DESIGN_INPUT } from "./defaults";
import { buildMemoryHtml } from "./report";

describe("buildMemoryHtml", () => {
  it("gera uma memória integrada rastreável e escapa dados do projeto", () => {
    const result = runIntegratedDesign(DEFAULT_DESIGN_INPUT);
    const project = {
      id: "project", ownerId: "owner", name: "Piscina <Norte>", location: "Rua A & B",
      status: "calculated" as const, createdAt: "2026-07-13T12:00:00.000Z", updatedAt: "2026-07-13T12:00:00.000Z"
    };
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
    expect(html).not.toContain("Piscina <Norte>");
  });
});
