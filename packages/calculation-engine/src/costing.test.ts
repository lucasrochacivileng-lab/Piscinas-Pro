import { describe, expect, it } from "vitest";
import {
  compareCostEstimates,
  DEFAULT_PRICE_TABLE,
  estimateCosts,
  validatePriceTable,
  type PriceTable
} from "./costing.js";
import type { MaterialQuantitiesResult } from "./quantities.js";

const quantities = (overrides: Partial<MaterialQuantitiesResult> = {}): MaterialQuantitiesResult => ({
  elements: [],
  totalBlocks: 1_000,
  totalSteelKg: 500,
  totalGroutM3: 2,
  totalConcreteM3: 5,
  wasteFactor: 1.1,
  ...overrides
});

describe("estimativa de custos", () => {
  it("calcula custo por material, total, perdas e liquido", () => {
    const estimate = estimateCosts(quantities(), DEFAULT_PRICE_TABLE);
    const blocks = estimate.lines.find((line) => line.material === "blocks");
    expect(blocks?.totalBRL).toBe(1_000 * DEFAULT_PRICE_TABLE.blockUnitBRL);
    const expectedTotal =
      1_000 * DEFAULT_PRICE_TABLE.blockUnitBRL +
      500 * DEFAULT_PRICE_TABLE.steelKgBRL +
      2 * DEFAULT_PRICE_TABLE.groutM3BRL +
      5 * DEFAULT_PRICE_TABLE.concreteM3BRL;
    expect(estimate.totalBRL).toBeCloseTo(expectedTotal, 2);
    // Perdas: total = liquido * 1,1, logo liquido = total / 1,1.
    expect(estimate.netBRL).toBeCloseTo(expectedTotal / 1.1, 2);
    expect(estimate.wasteShareBRL).toBeCloseTo(expectedTotal - expectedTotal / 1.1, 2);
    expect(estimate.currency).toBe("BRL");
  });

  it("cobre os quatro materiais pedidos", () => {
    const estimate = estimateCosts(quantities());
    expect(estimate.lines.map((line) => line.material)).toEqual([
      "blocks",
      "steel",
      "grout",
      "concrete"
    ]);
  });

  it("rejeita tabela de precos invalida", () => {
    const broken: PriceTable = { ...DEFAULT_PRICE_TABLE, steelKgBRL: -1 };
    expect(validatePriceTable(broken).length).toBeGreaterThan(0);
    expect(() => estimateCosts(quantities(), broken)).toThrow(RangeError);
  });
});

describe("comparacao de estimativas", () => {
  it("aponta a alternativa mais barata e o delta percentual", () => {
    const base = estimateCosts(quantities(), DEFAULT_PRICE_TABLE);
    const cheaperTable: PriceTable = {
      ...DEFAULT_PRICE_TABLE,
      id: "alternativa",
      blockUnitBRL: DEFAULT_PRICE_TABLE.blockUnitBRL * 0.8
    };
    const alternative = estimateCosts(quantities(), cheaperTable);
    const comparison = compareCostEstimates(base, alternative);
    expect(comparison.cheaper).toBe("alternative");
    expect(comparison.deltaBRL).toBeLessThan(0);
    const blocksLine = comparison.lines.find((line) => line.material === "blocks");
    expect(blocksLine?.deltaPercent).toBeCloseTo(-20, 5);
  });

  it("reconhece empate entre tabelas iguais", () => {
    const base = estimateCosts(quantities());
    const alternative = estimateCosts(quantities());
    const comparison = compareCostEstimates(base, alternative);
    expect(comparison.cheaper).toBe("tie");
    expect(comparison.deltaBRL).toBe(0);
  });

  it("compara familias distintas pela variacao de blocos", () => {
    const base = estimateCosts(quantities({ totalBlocks: 1_000 }));
    const alternative = estimateCosts(quantities({ totalBlocks: 1_400 }));
    const comparison = compareCostEstimates(base, alternative);
    expect(comparison.cheaper).toBe("base");
    expect(comparison.deltaBRL).toBeGreaterThan(0);
  });
});
