import type { EngineeringCheck } from "./engineering.js";
import type { TraceStep } from "./types.js";

export interface MasonryMaterialInput {
  readonly mortarCompressiveStrengthMPa: number;
  readonly groutCompressiveStrengthMPa: number;
  readonly prismCharacteristicStrengthMPa: number;
  readonly groutSlumpMm?: number;
  readonly mortarJointThicknessMm?: number;
  readonly testAgeDays?: number;
  readonly source: "TEST_REPORT" | "SUPPLIER_DECLARATION" | "ACADEMIC_ESTIMATE";
}

export interface MasonryMaterialResult {
  readonly mortarCompressiveStrengthMPa: number;
  readonly groutCompressiveStrengthMPa: number;
  readonly prismCharacteristicStrengthMPa: number;
  readonly prismEfficiency: number;
  readonly groutToBlockStrengthRatio: number;
  readonly mortarToBlockStrengthRatio: number;
  readonly checks: readonly EngineeringCheck[];
  readonly trace: readonly TraceStep[];
  readonly warnings: readonly string[];
}

const positive = (value: number): boolean => Number.isFinite(value) && value > 0;

export function evaluateMasonryMaterials(
  input: MasonryMaterialInput,
  blockStrengthMPa: number
): MasonryMaterialResult {
  if (!positive(blockStrengthMPa)) throw new RangeError("fbk do bloco deve ser positivo.");
  if (!positive(input.mortarCompressiveStrengthMPa) || !positive(input.groutCompressiveStrengthMPa) || !positive(input.prismCharacteristicStrengthMPa)) {
    throw new RangeError("Argamassa, graute e prisma devem possuir resistências positivas e finitas.");
  }
  if (input.mortarJointThicknessMm !== undefined && (!positive(input.mortarJointThicknessMm) || input.mortarJointThicknessMm > 30)) {
    throw new RangeError("Espessura de junta de argamassa inválida.");
  }
  if (input.groutSlumpMm !== undefined && (!positive(input.groutSlumpMm) || input.groutSlumpMm > 350)) {
    throw new RangeError("Abatimento do graute inválido.");
  }
  if (input.testAgeDays !== undefined && (!Number.isInteger(input.testAgeDays) || input.testAgeDays < 1 || input.testAgeDays > 365)) {
    throw new RangeError("Idade de ensaio deve estar entre 1 e 365 dias.");
  }

  const prismEfficiency = input.prismCharacteristicStrengthMPa / blockStrengthMPa;
  const groutToBlockStrengthRatio = input.groutCompressiveStrengthMPa / blockStrengthMPa;
  const mortarToBlockStrengthRatio = input.mortarCompressiveStrengthMPa / blockStrengthMPa;
  const sourceStatus = input.source === "TEST_REPORT" ? "PASS" : "REQUIRES_REVIEW";

  const checks: EngineeringCheck[] = [
    {
      id: "masonry-prism-efficiency",
      status: prismEfficiency >= 0.35 && prismEfficiency <= 1 ? "PASS" : "REQUIRES_REVIEW",
      demand: prismEfficiency,
      resistance: 0.35,
      unit: "ratio",
      message: prismEfficiency >= 0.35 && prismEfficiency <= 1
        ? "Eficiência prisma/bloco em faixa plausível para controle de coerência."
        : "Eficiência prisma/bloco fora da faixa de controle; revisar ensaio, unidade, argamassa e procedimento."
    },
    {
      id: "masonry-grout-strength",
      status: input.groutCompressiveStrengthMPa >= input.prismCharacteristicStrengthMPa ? "PASS" : "REQUIRES_REVIEW",
      demand: input.prismCharacteristicStrengthMPa,
      resistance: input.groutCompressiveStrengthMPa,
      unit: "MPa",
      message: "Resistência do graute comparada à resistência característica do prisma especificado."
    },
    {
      id: "masonry-mortar-strength-balance",
      status: mortarToBlockStrengthRatio >= 0.2 && mortarToBlockStrengthRatio <= 1 ? "PASS" : "REQUIRES_REVIEW",
      demand: mortarToBlockStrengthRatio,
      resistance: 1,
      unit: "ratio",
      message: "Compatibilidade entre resistência da argamassa e do bloco deve ser confirmada no projeto e nos ensaios."
    },
    {
      id: "masonry-material-test-source",
      status: sourceStatus,
      demand: input.source === "TEST_REPORT" ? 1 : 0,
      resistance: 1,
      unit: "document",
      message: input.source === "TEST_REPORT"
        ? "Parâmetros de argamassa, graute e prisma vinculados a relatório de ensaio."
        : "Parâmetros sem relatório de ensaio anexado; manter revisão obrigatória."
    },
    {
      id: "masonry-joint-thickness",
      status: input.mortarJointThicknessMm === undefined
        ? "REQUIRES_REVIEW"
        : input.mortarJointThicknessMm >= 8 && input.mortarJointThicknessMm <= 12
          ? "PASS"
          : "REQUIRES_REVIEW",
      ...(input.mortarJointThicknessMm === undefined ? {} : { demand: input.mortarJointThicknessMm }),
      resistance: 10,
      unit: "mm",
      message: "Espessura nominal da junta deve ser compatível com modulação, execução e especificação do sistema."
    }
  ];

  return {
    mortarCompressiveStrengthMPa: input.mortarCompressiveStrengthMPa,
    groutCompressiveStrengthMPa: input.groutCompressiveStrengthMPa,
    prismCharacteristicStrengthMPa: input.prismCharacteristicStrengthMPa,
    prismEfficiency,
    groutToBlockStrengthRatio,
    mortarToBlockStrengthRatio,
    checks,
    trace: [
      {
        id: "prism-efficiency",
        description: "Eficiência característica do prisma em relação ao bloco",
        equation: "eta_p = f_pk / f_bk",
        substitutions: { f_pk: input.prismCharacteristicStrengthMPa, f_bk: blockStrengthMPa },
        result: prismEfficiency,
        unit: "ratio"
      },
      {
        id: "grout-block-ratio",
        description: "Relação entre resistência do graute e do bloco",
        equation: "r_g = f_gk / f_bk",
        substitutions: { f_gk: input.groutCompressiveStrengthMPa, f_bk: blockStrengthMPa },
        result: groutToBlockStrengthRatio,
        unit: "ratio"
      }
    ],
    warnings: [
      "As verificações de coerência não substituem dosagem, produção, moldagem e ensaios de controle.",
      "O prisma deve representar bloco, argamassa, junta, grauteamento e processo executivo do projeto.",
      "Valores acadêmicos ou de fornecedor não devem liberar projeto executivo sem documentação técnica."
    ]
  };
}
