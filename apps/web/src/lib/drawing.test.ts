import { runPhase1Design, SILVA_2022_PHASE1_PROFILE } from "@poolstruct/calculation-engine";
import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN_INPUT } from "./defaults";
import { buildTechnicalDrawingSvg, drawingFilename, DRAWING_SHEET } from "./drawing";
import type { ProjectRecord, RevisionRecord } from "./models";

const result = runPhase1Design(DEFAULT_DESIGN_INPUT, SILVA_2022_PHASE1_PROFILE);
const project: ProjectRecord = {
  id: "project", ownerId: "owner", name: "Piscina Águas <Norte>", location: "Rua A & B",
  status: "calculated", createdAt: "2026-07-13T12:00:00.000Z", updatedAt: "2026-07-13T12:00:00.000Z"
};
const revision: RevisionRecord = {
  id: "revision", projectId: project.id, revisionNumber: 3, input: DEFAULT_DESIGN_INPUT,
  result, inputHash: "a".repeat(64), createdAt: "2026-07-13T12:00:00.000Z"
};

describe("buildTechnicalDrawingSvg", () => {
  it("gera uma prancha A3 determinística com as quatro vistas técnicas", () => {
    const first = buildTechnicalDrawingSvg(project, revision);
    const second = buildTechnicalDrawingSvg(project, revision);

    expect(first).toBe(second);
    expect(first).toContain(`width="${DRAWING_SHEET.widthMm}mm" height="${DRAWING_SHEET.heightMm}mm"`);
    expect(first).toContain('id="planta"');
    expect(first).toContain('id="corte-a-a"');
    expect(first).toContain('id="elevacao-parede-longa"');
    expect(first).toContain('class="channel-fill"');
    expect(first).toContain(result.masonry!.family.label);
    expect(first).toContain('id="quadro-armaduras"');
  });

  it("leva geometria, cotas e armaduras calculadas para o desenho", () => {
    const svg = buildTechnicalDrawingSvg(project, revision);

    expect(svg).toContain("8.000");
    expect(svg).toContain("4.000");
    expect(svg).toContain(`Ø${result.longWall.design.parallel.layout.diameterMm}`);
    expect(svg).toContain(`c/${result.slab.bottomX.layout.spacingMm} mm`);
    expect(svg).toContain(`${result.masonry!.modulation.courseCount} fiadas`);
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });

  it("escapa metadados do projeto e registra a revisão", () => {
    const svg = buildTechnicalDrawingSvg(project, revision);

    expect(svg).toContain("Piscina Águas &lt;Norte&gt;");
    expect(svg).toContain("Rua A &amp; B");
    expect(svg).not.toContain("Piscina Águas <Norte>");
    expect(svg).toContain("R3");
    expect(svg).toContain("NÃO EXECUTAR SEM REVISÃO");
  });

  it("gera nome de arquivo portátil sem acentos", () => {
    expect(drawingFilename(project, revision)).toBe("piscina-aguas-norte-r3-ps-01.svg");
  });
});
