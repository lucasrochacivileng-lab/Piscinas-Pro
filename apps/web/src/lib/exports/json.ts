import type { ExportBundle } from "./bundle";

export const EXPORT_SCHEMA = "poolstruct.export/1.0.0";

/**
 * Serializacao estavel e rastreavel da revisao com entradas, resultado,
 * quantitativos e custos. Ordem de chaves fixa para diffs e hash reproduziveis.
 */
export function buildProjectJson(bundle: ExportBundle): string {
  const { project, revision, family, priceTable, quantities, costs } = bundle;
  const payload = {
    schema: EXPORT_SCHEMA,
    generatedFrom: "phase8-exports",
    project: {
      id: project.id,
      name: project.name,
      location: project.location,
      status: project.status
    },
    revision: {
      number: revision.revisionNumber,
      createdAt: revision.createdAt,
      inputHash: revision.inputHash,
      input: revision.input,
      result: revision.result
    },
    modulation: {
      familyId: family.id,
      familyVersion: family.version,
      moduleMm: family.moduleMm
    },
    quantities: {
      totalBlocks: quantities.totalBlocks,
      totalSteelKg: quantities.totalSteelKg,
      totalGroutM3: quantities.totalGroutM3,
      totalConcreteM3: quantities.totalConcreteM3,
      wasteFactor: quantities.wasteFactor,
      elements: quantities.elements
    },
    costs: {
      priceTableId: priceTable.id,
      currency: costs.currency,
      lines: costs.lines,
      netBRL: costs.netBRL,
      wasteShareBRL: costs.wasteShareBRL,
      totalBRL: costs.totalBRL
    },
    disclaimer:
      "Pre-dimensionamento academico. Quantitativos e custos ilustrativos; nao substituem projeto executivo, cotacao ou responsabilidade tecnica."
  };
  return JSON.stringify(payload, null, 2);
}
