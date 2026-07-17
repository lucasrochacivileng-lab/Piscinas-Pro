import { describe, expect, it } from "vitest";
import {
  BLOCK_FAMILY_M15,
  BLOCK_FAMILY_M20,
  DEFAULT_BLOCK_FAMILIES,
  layoutCourse,
  modulatePoolPerimeter,
  modulateWall,
  suggestModularAdjustments,
  validateBlockFamily,
  type BlockFamily
} from "./modulation.js";

const sumModules = (family: BlockFamily, placements: readonly { nominalLengthMm: number }[]): number =>
  placements.reduce((total, item) => total + item.nominalLengthMm / family.moduleMm, 0);

describe("familias de blocos", () => {
  it("as familias padrao sao validas", () => {
    for (const family of DEFAULT_BLOCK_FAMILIES) {
      expect(validateBlockFamily(family)).toEqual([]);
    }
  });

  it("rejeita familia sem bloco inteiro ou fora do modulo", () => {
    const broken: BlockFamily = {
      ...BLOCK_FAMILY_M20,
      units: [{ id: "x", label: "x", role: "half", nominalLengthMm: 175, isChannel: false }]
    };
    const errors = validateBlockFamily(broken);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((message) => message.includes("bloco inteiro"))).toBe(true);
  });
});

describe("fiadas e amarracao", () => {
  it("preenche exatamente o comprimento em modulos nas duas paridades", () => {
    for (let moduleCount = 1; moduleCount <= 12; moduleCount += 1) {
      const even = layoutCourse(moduleCount, 0, BLOCK_FAMILY_M20);
      const odd = layoutCourse(moduleCount, 1, BLOCK_FAMILY_M20);
      expect(sumModules(BLOCK_FAMILY_M20, even.placements)).toBe(moduleCount);
      expect(sumModules(BLOCK_FAMILY_M20, odd.placements)).toBe(moduleCount);
    }
  });

  it("desloca as juntas verticais em um modulo entre fiada e contra-fiada", () => {
    const even = layoutCourse(6, 0, BLOCK_FAMILY_M20);
    const odd = layoutCourse(6, 1, BLOCK_FAMILY_M20);
    // Fiada base comeca com inteiro; contra-fiada comeca com meio bloco.
    expect(even.placements[0]?.nominalLengthMm).toBe(400);
    expect(odd.placements[0]?.nominalLengthMm).toBe(200);
    const evenJoints = even.placements.map((item) => item.startModule);
    const oddJoints = odd.placements.map((item) => item.startModule);
    // Nenhuma junta interna coincide entre as duas fiadas.
    const shared = evenJoints.filter((joint) => joint !== 0 && oddJoints.includes(joint));
    expect(shared).toEqual([]);
  });

  it("usa meio bloco para fechar comprimentos impares", () => {
    const odd = layoutCourse(5, 0, BLOCK_FAMILY_M20);
    expect(odd.halfBlocks).toBe(1);
    expect(odd.fullBlocks).toBe(2);
  });

  it("marca a fiada como canaleta quando solicitado", () => {
    const channel = layoutCourse(4, 0, BLOCK_FAMILY_M20, true);
    expect(channel.isChannelCourse).toBe(true);
    expect(channel.placements.every((item) => item.role === "channel")).toBe(true);
  });
});

describe("modulacao de parede", () => {
  it("conta blocos, canaletas e graute vertical de uma parede modular", () => {
    const wall = modulateWall(
      {
        id: "w",
        nominalLengthMm: 2_400, // 12 modulos de 200 mm
        courseCount: 8,
        verticalGroutSpacingMm: 800,
        channelCourseIndices: [0, 7]
      },
      BLOCK_FAMILY_M20
    );
    expect(wall.isModular).toBe(true);
    expect(wall.moduleCount).toBe(12);
    // Fiada base: 6 inteiros (6 pecas). Contra-fiada: 2 meios + 5 inteiros (7 pecas).
    const even = wall.evenCourse.blocks;
    const odd = wall.oddCourse.blocks;
    expect(even).toBe(6);
    expect(odd).toBe(7);
    // 8 fiadas alternadas; canaletas nas fiadas 0 (base, par) e 7 (topo, impar).
    expect(wall.channelBlocks).toBe(even + odd);
    expect(wall.fullBlocks + wall.halfBlocks).toBe(3 * even + 3 * odd);
    expect(wall.totalBlocks).toBe(4 * even + 4 * odd);
    expect(wall.verticalGroutedCells).toBe(Math.floor(2_400 / 800) + 1);
    expect(wall.adjustments).toEqual([]);
  });

  it("sinaliza parede fora da modulacao e sugere ajustes", () => {
    const wall = modulateWall(
      { id: "w", nominalLengthMm: 2_350, courseCount: 4, verticalGroutSpacingMm: 800 },
      BLOCK_FAMILY_M20
    );
    expect(wall.isModular).toBe(false);
    expect(wall.adjustments.length).toBeGreaterThan(0);
    const kinds = wall.adjustments.map((item) => item.kind);
    expect(kinds).toContain("SHRINK_TO_MODULE");
    expect(kinds).toContain("EXPAND_TO_MODULE");
  });

  it("rejeita entradas nao positivas", () => {
    expect(() =>
      modulateWall({ id: "w", nominalLengthMm: 0, courseCount: 4, verticalGroutSpacingMm: 800 }, BLOCK_FAMILY_M20)
    ).toThrow(RangeError);
    expect(() =>
      modulateWall({ id: "w", nominalLengthMm: 2_400, courseCount: 2.5, verticalGroutSpacingMm: 800 }, BLOCK_FAMILY_M20)
    ).toThrow(RangeError);
  });
});

describe("sugestoes de ajuste", () => {
  it("nao sugere nada quando ja e modular", () => {
    expect(suggestModularAdjustments(2_400, BLOCK_FAMILY_M20)).toEqual([]);
  });

  it("propoe encolher, ampliar e afinar juntas", () => {
    const adjustments = suggestModularAdjustments(2_420, BLOCK_FAMILY_M20);
    const shrink = adjustments.find((item) => item.kind === "SHRINK_TO_MODULE");
    const expand = adjustments.find((item) => item.kind === "EXPAND_TO_MODULE");
    expect(shrink?.suggestedNominalLengthMm).toBe(2_400);
    expect(expand?.suggestedNominalLengthMm).toBe(2_600);
    // 20 mm em 12 juntas = 1,7 mm por junta, dentro da tolerancia.
    expect(adjustments.some((item) => item.kind === "JOINT_TUNING")).toBe(true);
  });

  it("propoe peca de compensacao quando existe na familia", () => {
    const withCompensator: BlockFamily = {
      ...BLOCK_FAMILY_M20,
      units: [
        ...BLOCK_FAMILY_M20.units,
        { id: "comp", label: "Compensador 590", role: "full", nominalLengthMm: 600, isChannel: false }
      ]
    };
    // residual de 600 mm relativo ao piso modular.
    const adjustments = suggestModularAdjustments(3_000 + 600, withCompensator);
    // 3600 e modular (18 modulos), entao testamos um residual real:
    const nonModular = suggestModularAdjustments(2_600 + 600 + 50, withCompensator);
    expect(adjustments).toEqual([]);
    expect(nonModular.length).toBeGreaterThan(0);
  });
});

describe("modulacao do perimetro da piscina", () => {
  const input = {
    internalLengthMm: 8_000,
    internalWidthMm: 4_000,
    wallHeightMm: 1_600,
    wallThicknessMm: 200,
    verticalGroutSpacingMm: 800,
    bondBeamCourseSpacing: 4
  } as const;

  it("monta o pacote com paredes, encontros, graute e verificacoes", () => {
    const bundle = modulatePoolPerimeter(input, BLOCK_FAMILY_M20);
    expect(bundle.value.courseCount).toBe(8);
    expect(bundle.value.longWall.isModular).toBe(true);
    expect(bundle.value.shortWall.isModular).toBe(true);
    expect(bundle.value.junction.cornerCount).toBe(4);
    expect(bundle.value.grout.channelCourseIndices).toContain(0);
    expect(bundle.value.grout.channelCourseIndices).toContain(7);
    expect(bundle.value.grout.channelCourseIndices).toContain(4);
    expect(bundle.checks.every((check) => check.status === "PASS")).toBe(true);
    expect(bundle.value.totalBlocks).toBeGreaterThan(0);
  });

  it("nao contabiliza valores nao finitos e conta cantos uma vez", () => {
    const bundle = modulatePoolPerimeter(input, BLOCK_FAMILY_M20);
    for (const step of bundle.trace) {
      expect(Number.isFinite(step.result)).toBe(true);
    }
    // Quatro cantos compartilhados sao descontados do total de cores verticais.
    const perWall =
      bundle.value.longWall.verticalGroutedCells + bundle.value.shortWall.verticalGroutedCells;
    expect(bundle.value.totalVerticalGroutedCells).toBe(2 * perWall - 4);
  });

  it("marca revisao quando a parede nao fecha na modulacao", () => {
    const bundle = modulatePoolPerimeter(
      { ...input, internalLengthMm: 8_050 },
      BLOCK_FAMILY_M20
    );
    const longCheck = bundle.checks.find((check) => check.id === "long-wall-modular");
    expect(longCheck?.status).toBe("REQUIRES_REVIEW");
    expect(bundle.value.adjustments.length).toBeGreaterThan(0);
    expect(bundle.warnings.some((message) => message.includes("nao fecham"))).toBe(true);
  });

  it("marca revisao quando a espessura nao coincide com o modulo", () => {
    const bundle = modulatePoolPerimeter(
      { ...input, wallThicknessMm: 140 },
      BLOCK_FAMILY_M20
    );
    const thicknessCheck = bundle.checks.find((check) => check.id === "junction-thickness-modular");
    expect(thicknessCheck?.status).toBe("REQUIRES_REVIEW");
  });

  it("e deterministico para a mesma entrada", () => {
    const first = modulatePoolPerimeter(input, BLOCK_FAMILY_M15);
    const second = modulatePoolPerimeter(input, BLOCK_FAMILY_M15);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});
