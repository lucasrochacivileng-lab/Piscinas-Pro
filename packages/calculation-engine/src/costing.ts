import type { MaterialQuantitiesResult } from "./quantities.js";

/**
 * Fase 7 - Custos academicos a partir dos quantitativos.
 *
 * As quantidades de entrada ja incluem o fator de perdas aplicado no
 * levantamento. O modulo converte quantidades em custo por material, isola a
 * parcela de perdas embutida e compara duas estimativas (por exemplo, familias
 * de blocos ou tabelas de preco distintas). Os precos sao ilustrativos e nao
 * constituem cotacao ou orcamento profissional.
 */

export type CostMaterial = "blocks" | "steel" | "grout" | "concrete";

export interface PriceTable {
  readonly id: string;
  readonly label: string;
  readonly currency: "BRL";
  readonly status: "draft" | "reviewed";
  /** Preco por bloco assentado. */
  readonly blockUnitBRL: number;
  /** Preco por quilograma de aco. */
  readonly steelKgBRL: number;
  /** Preco por metro cubico de graute. */
  readonly groutM3BRL: number;
  /** Preco por metro cubico de concreto. */
  readonly concreteM3BRL: number;
  readonly references: readonly string[];
}

export interface CostLineItem {
  readonly material: CostMaterial;
  readonly label: string;
  readonly quantity: number;
  readonly unit: string;
  readonly unitPriceBRL: number;
  readonly totalBRL: number;
}

export interface CostEstimateResult {
  readonly priceTableId: string;
  readonly currency: "BRL";
  readonly wasteFactor: number;
  readonly lines: readonly CostLineItem[];
  readonly totalBRL: number;
  /** Parcela do total atribuivel as perdas embutidas nos quantitativos. */
  readonly wasteShareBRL: number;
  /** Total sem perdas (base de material liquido). */
  readonly netBRL: number;
  readonly warnings: readonly string[];
}

export interface CostComparisonLine {
  readonly material: CostMaterial;
  readonly baseBRL: number;
  readonly alternativeBRL: number;
  readonly deltaBRL: number;
  readonly deltaPercent: number;
}

export interface CostComparisonResult {
  readonly lines: readonly CostComparisonLine[];
  readonly baseTotalBRL: number;
  readonly alternativeTotalBRL: number;
  readonly deltaBRL: number;
  readonly deltaPercent: number;
  readonly cheaper: "base" | "alternative" | "tie";
}

export const DEFAULT_PRICE_TABLE: PriceTable = Object.freeze({
  id: "academic-price-table-2026",
  label: "Tabela de precos academica (ilustrativa)",
  currency: "BRL",
  status: "draft",
  blockUnitBRL: 6.5,
  steelKgBRL: 9.8,
  groutM3BRL: 520,
  concreteM3BRL: 480,
  references: [
    "Precos ilustrativos para estudo academico; nao substituem cotacao regional ou composicao de custos."
  ]
});

export function validatePriceTable(priceTable: PriceTable): string[] {
  const errors: string[] = [];
  if (priceTable.id.trim() === "") errors.push("A tabela de precos deve ter id.");
  for (const field of ["blockUnitBRL", "steelKgBRL", "groutM3BRL", "concreteM3BRL"] as const) {
    const value = priceTable[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      errors.push(`${field} deve ser finito e nao negativo.`);
    }
  }
  return errors;
}

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

export function estimateCosts(
  quantities: MaterialQuantitiesResult,
  priceTable: PriceTable = DEFAULT_PRICE_TABLE
): CostEstimateResult {
  const priceErrors = validatePriceTable(priceTable);
  if (priceErrors.length > 0) throw new RangeError(priceErrors.join(" "));

  const definitions: readonly {
    material: CostMaterial;
    label: string;
    quantity: number;
    unit: string;
    unitPriceBRL: number;
  }[] = [
    {
      material: "blocks",
      label: "Blocos",
      quantity: quantities.totalBlocks,
      unit: "un",
      unitPriceBRL: priceTable.blockUnitBRL
    },
    {
      material: "steel",
      label: "Aco",
      quantity: quantities.totalSteelKg,
      unit: "kg",
      unitPriceBRL: priceTable.steelKgBRL
    },
    {
      material: "grout",
      label: "Graute",
      quantity: quantities.totalGroutM3,
      unit: "m3",
      unitPriceBRL: priceTable.groutM3BRL
    },
    {
      material: "concrete",
      label: "Concreto",
      quantity: quantities.totalConcreteM3,
      unit: "m3",
      unitPriceBRL: priceTable.concreteM3BRL
    }
  ];

  const lines: CostLineItem[] = definitions.map((definition) => ({
    material: definition.material,
    label: definition.label,
    quantity: definition.quantity,
    unit: definition.unit,
    unitPriceBRL: definition.unitPriceBRL,
    totalBRL: roundCurrency(definition.quantity * definition.unitPriceBRL)
  }));

  const totalBRL = roundCurrency(lines.reduce((total, line) => total + line.totalBRL, 0));
  const netBRL = roundCurrency(totalBRL / quantities.wasteFactor);
  const wasteShareBRL = roundCurrency(totalBRL - netBRL);

  return {
    priceTableId: priceTable.id,
    currency: "BRL",
    wasteFactor: quantities.wasteFactor,
    lines,
    totalBRL,
    wasteShareBRL,
    netBRL,
    warnings: [
      "Estimativa academica; nao inclui mao de obra, BDI, impermeabilizacao nem cotacao regional.",
      ...(priceTable.status === "draft" ? ["Tabela de precos ilustrativa ainda nao revisada."] : [])
    ]
  };
}

const percentDelta = (base: number, alternative: number): number =>
  base === 0 ? (alternative === 0 ? 0 : Number.POSITIVE_INFINITY) : ((alternative - base) / base) * 100;

export function compareCostEstimates(
  base: CostEstimateResult,
  alternative: CostEstimateResult
): CostComparisonResult {
  const materials: readonly CostMaterial[] = ["blocks", "steel", "grout", "concrete"];
  const totalFor = (estimate: CostEstimateResult, material: CostMaterial): number =>
    estimate.lines.find((line) => line.material === material)?.totalBRL ?? 0;

  const lines: CostComparisonLine[] = materials.map((material) => {
    const baseBRL = totalFor(base, material);
    const alternativeBRL = totalFor(alternative, material);
    return {
      material,
      baseBRL,
      alternativeBRL,
      deltaBRL: roundCurrency(alternativeBRL - baseBRL),
      deltaPercent: roundCurrency(percentDelta(baseBRL, alternativeBRL))
    };
  });

  const deltaBRL = roundCurrency(alternative.totalBRL - base.totalBRL);
  return {
    lines,
    baseTotalBRL: base.totalBRL,
    alternativeTotalBRL: alternative.totalBRL,
    deltaBRL,
    deltaPercent: roundCurrency(percentDelta(base.totalBRL, alternative.totalBRL)),
    cheaper: deltaBRL === 0 ? "tie" : deltaBRL < 0 ? "alternative" : "base"
  };
}
