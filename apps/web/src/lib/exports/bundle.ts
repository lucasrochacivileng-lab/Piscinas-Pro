import {
  BLOCK_FAMILY_M20,
  DEFAULT_PRICE_TABLE,
  estimateCosts,
  takeoffPoolQuantities,
  type BlockFamily,
  type CostEstimateResult,
  type MaterialQuantitiesResult,
  type PriceTable
} from "@poolstruct/calculation-engine";
import type { ProjectRecord, RevisionRecord } from "../models";

export interface ExportBundle {
  readonly project: ProjectRecord;
  readonly revision: RevisionRecord;
  readonly family: BlockFamily;
  readonly priceTable: PriceTable;
  readonly quantities: MaterialQuantitiesResult;
  readonly costs: CostEstimateResult;
}

/**
 * Deriva quantitativos e custos de uma revisao usando a familia e a tabela de
 * precos academicas padrao. Serve de base unica para todas as exportacoes da
 * Fase 8, mantendo os valores coerentes entre PDF, XLSX, DXF, SVG e JSON.
 */
export function buildExportBundle(
  project: ProjectRecord,
  revision: RevisionRecord,
  family: BlockFamily = BLOCK_FAMILY_M20,
  priceTable: PriceTable = DEFAULT_PRICE_TABLE
): ExportBundle {
  const quantities = takeoffPoolQuantities(revision.input.geometry, revision.result, family);
  const costs = estimateCosts(quantities, priceTable);
  return { project, revision, family, priceTable, quantities, costs };
}

export function exportSlug(project: ProjectRecord): string {
  return (
    project.name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "projeto"
  );
}

export function exportBaseName(project: ProjectRecord, revision: RevisionRecord): string {
  return `${exportSlug(project)}-r${revision.revisionNumber}`;
}
