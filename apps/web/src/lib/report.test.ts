import { BRAZIL_2026_PRELIMINARY_PROFILE, runIntegratedDesign } from "@poolstruct/calculation-engine";
import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN_INPUT } from "./defaults";
import { buildMemoryHtml } from "./report";

describe("buildMemoryHtml", () => {
  it("gera memória rastreável com geotecnia, flutuação e materiais", () => {
    const result = runIntegratedDesign(DEFAULT_DESIGN_INPUT, BRAZIL_2026_PRELIMINARY_PROFILE);
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
    expect(html).toContain("Perfil geotécnico e NSPT");
    expect(html).toContain("Equilíbrio global à flutuação");
    expect(html).toContain("Alvenaria estrutural e materiais");
    expect(html).toContain(result.masonry!.family.label);
    expect(html).toContain("Eficiência prisma/bloco");
    expect(html).not.toContain("Piscina <Norte>");
    expect(html).not.toMatch(/NaN|undefined|Infinity/);
  });
});
