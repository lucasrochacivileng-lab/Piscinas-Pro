import type { CalculationBundle, EngineeringCheck } from "./engineering.js";
import type { TraceStep } from "./types.js";

/**
 * Fase 6 - Modulacao academica de alvenaria estrutural.
 *
 * O modulo distribui blocos em fiadas com amarracao em contra-fiada (running
 * bond), resolve os encontros de canto de uma piscina retangular, posiciona o
 * graute vertical e as fiadas de canaleta e propoe ajustes quando o comprimento
 * nao coincide com a coordenacao modular da familia de blocos.
 *
 * Todas as dimensoes de entrada sao nominais em milimetros (bloco real + junta).
 * O resultado e um pre-dimensionamento academico e nao substitui o detalhamento
 * de amarracao, ancoragem, emendas e compatibilizacao por engenheiro habilitado.
 */

export type BlockRole =
  | "full"
  | "half"
  | "channel"
  | "half-channel"
  | "compensator"
  | "l-bond"
  | "t-bond"
  | "j-block"
  | "special";

export interface BlockUnit {
  readonly id: string;
  readonly label: string;
  readonly role: BlockRole;
  /** Comprimento nominal (bloco + junta vertical), multiplo do modulo. */
  readonly nominalLengthMm: number;
  /** Dimensao real da peca sem a junta vertical. */
  readonly actualLengthMm?: number;
  /** Canaleta em U para cinta/verga e graute horizontal. */
  readonly isChannel: boolean;
}

export interface BlockFamily {
  readonly id: string;
  readonly label: string;
  readonly version: string;
  readonly status: "draft" | "catalog" | "reviewed";
  readonly manufacturer: string;
  readonly material: "concrete";
  /** Designacao dimensional da Tabela 1 da ABNT NBR 6136. */
  readonly normativeFamily: string;
  /** Menor incremento de coordenacao admitido pela familia. */
  readonly coordinationGridMm: number;
  /** Modulo de coordenacao horizontal e vertical (meio bloco nominal). */
  readonly moduleMm: number;
  /** Altura nominal da fiada (bloco + junta horizontal). */
  readonly courseHeightMm: number;
  /** Largura nominal do bloco (espessura de parede coordenada). */
  readonly nominalWidthMm: number;
  readonly jointThicknessMm: number;
  readonly catalogStrengthRangeMPa: readonly [number, number];
  readonly catalogDocument: string;
  readonly units: readonly BlockUnit[];
  readonly references: readonly string[];
}

export interface CoursePlacement {
  readonly role: "full" | "half" | "channel";
  readonly unitId: string;
  readonly label: string;
  readonly nominalLengthMm: number;
  /** Posicao de inicio da peca, em modulos a partir da extremidade esquerda. */
  readonly startModule: number;
}

export interface CourseLayout {
  /** 0 = fiada base (impar), 1 = contra-fiada (par) com deslocamento de 1 modulo. */
  readonly parity: 0 | 1;
  readonly moduleCount: number;
  readonly isChannelCourse: boolean;
  readonly placements: readonly CoursePlacement[];
  readonly fullBlocks: number;
  readonly halfBlocks: number;
  readonly blocks: number;
}

export type ModularAdjustmentKind =
  | "SHRINK_TO_MODULE"
  | "EXPAND_TO_MODULE"
  | "COMPENSATOR_UNIT"
  | "JOINT_TUNING";

export interface ModularAdjustment {
  readonly kind: ModularAdjustmentKind;
  readonly description: string;
  readonly suggestedNominalLengthMm?: number;
  readonly deltaMm?: number;
}

export interface WallModulationInput {
  readonly id: string;
  readonly nominalLengthMm: number;
  readonly courseCount: number;
  readonly verticalGroutSpacingMm: number;
  /** Indices de fiada (0 = base) que recebem canaleta. */
  readonly channelCourseIndices?: readonly number[];
}

export interface WallModulationResult {
  readonly id: string;
  readonly nominalLengthMm: number;
  readonly moduleMm: number;
  readonly rawModuleCount: number;
  readonly moduleCount: number;
  readonly isModular: boolean;
  readonly courseCount: number;
  readonly evenCourse: CourseLayout;
  readonly oddCourse: CourseLayout;
  readonly fullBlocks: number;
  readonly halfBlocks: number;
  readonly channelBlocks: number;
  readonly totalBlocks: number;
  readonly verticalGroutedCells: number;
  readonly adjustments: readonly ModularAdjustment[];
}

export interface JunctionPlan {
  readonly cornerCount: number;
  readonly bondPattern: "alternating-l-corner";
  readonly evenCourseRunningDirection: "long" | "short";
  readonly oddCourseRunningDirection: "long" | "short";
  readonly groutedCorners: number;
  readonly lBondUnit?: BlockUnit;
  readonly tBondUnit?: BlockUnit;
  readonly notes: readonly string[];
}

export interface GroutPlan {
  readonly verticalGroutSpacingMm: number;
  readonly verticalGroutedCells: number;
  readonly channelCourseIndices: readonly number[];
  readonly channelBlocks: number;
  readonly notes: readonly string[];
}

export interface PoolModulationInput {
  readonly internalLengthMm: number;
  readonly internalWidthMm: number;
  readonly wallHeightMm: number;
  readonly wallThicknessMm: number;
  readonly verticalGroutSpacingMm: number;
  /** Uma fiada de canaleta a cada N fiadas, alem da base e do topo. */
  readonly bondBeamCourseSpacing?: number;
}

export interface PoolModulationResult {
  readonly familyId: string;
  readonly familyVersion: string;
  readonly moduleMm: number;
  readonly courseHeightMm: number;
  readonly courseCount: number;
  readonly longWall: WallModulationResult;
  readonly shortWall: WallModulationResult;
  readonly junction: JunctionPlan;
  readonly grout: GroutPlan;
  readonly totalBlocks: number;
  readonly totalChannelBlocks: number;
  readonly totalVerticalGroutedCells: number;
  readonly adjustments: readonly ModularAdjustment[];
}

const MODULE_TOLERANCE = 1e-6;

function requireFinitePositive(label: string, value: number): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} deve ser positivo e finito.`);
  }
}

function unitByRole(family: BlockFamily, role: BlockRole): BlockUnit | undefined {
  return family.units.find((unit) => unit.role === role);
}

function channelUnitForLength(family: BlockFamily, nominalLengthMm: number): BlockUnit | undefined {
  return family.units.find(
    (unit) => unit.isChannel && Math.abs(unit.nominalLengthMm - nominalLengthMm) <= MODULE_TOLERANCE
  );
}

export function validateBlockFamily(family: BlockFamily): string[] {
  const errors: string[] = [];
  if (family.id.trim() === "" || family.version.trim() === "") {
    errors.push("A familia de blocos deve ter id e versao.");
  }
  for (const field of ["coordinationGridMm", "moduleMm", "courseHeightMm", "nominalWidthMm", "jointThicknessMm"] as const) {
    const value = family[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      errors.push(`${field} deve ser positivo e finito.`);
    }
  }
  const full = unitByRole(family, "full");
  const half = unitByRole(family, "half");
  if (!full) errors.push("A familia deve conter um bloco inteiro (role full).");
  if (!half) errors.push("A familia deve conter um meio bloco (role half).");
  if (full && Math.abs(full.nominalLengthMm - 2 * family.moduleMm) > MODULE_TOLERANCE) {
    errors.push("O bloco inteiro deve medir dois modulos nominais.");
  }
  if (half && Math.abs(half.nominalLengthMm - family.moduleMm) > MODULE_TOLERANCE) {
    errors.push("O meio bloco deve medir um modulo nominal.");
  }
  if (!channelUnitForLength(family, full?.nominalLengthMm ?? 0)) {
    errors.push("A familia deve conter canaleta inteira compatível com o bloco inteiro.");
  }
  if (!channelUnitForLength(family, half?.nominalLengthMm ?? 0)) {
    errors.push("A familia deve conter meia canaleta compatível com o meio bloco.");
  }
  for (const unit of family.units) {
    const modules = unit.nominalLengthMm / family.coordinationGridMm;
    if (!Number.isFinite(modules) || Math.abs(modules - Math.round(modules)) > MODULE_TOLERANCE) {
      errors.push(`A peca ${unit.id} deve ser multiplo inteiro da malha de coordenacao.`);
    }
  }
  return errors;
}

/**
 * Distribui uma fiada por amarracao. A fiada base (parity 0) inicia com blocos
 * inteiros; a contra-fiada (parity 1) inicia com meio bloco, deslocando as
 * juntas verticais em um modulo para garantir a amarracao.
 */
export function layoutCourse(
  moduleCount: number,
  parity: 0 | 1,
  family: BlockFamily,
  isChannelCourse = false
): CourseLayout {
  if (!Number.isInteger(moduleCount) || moduleCount <= 0) {
    throw new RangeError("moduleCount deve ser um inteiro positivo.");
  }
  const full = unitByRole(family, "full");
  const half = unitByRole(family, "half");
  if (!full || !half) {
    throw new RangeError("A familia precisa de bloco inteiro e meio bloco.");
  }
  const placements: CoursePlacement[] = [];
  let position = 0;
  let remaining = moduleCount;
  const place = (unit: BlockUnit, modules: number): void => {
    const placedUnit = isChannelCourse
      ? channelUnitForLength(family, unit.nominalLengthMm)
      : unit;
    if (!placedUnit) {
      throw new RangeError(`Canaleta ausente para o comprimento nominal ${unit.nominalLengthMm} mm.`);
    }
    placements.push({
      role: isChannelCourse ? "channel" : unit.role === "half" ? "half" : "full",
      unitId: placedUnit.id,
      label: placedUnit.label,
      nominalLengthMm: placedUnit.nominalLengthMm,
      startModule: position
    });
    position += modules;
    remaining -= modules;
  };
  if (parity === 1 && remaining >= 1) {
    place(half, 1);
  }
  while (remaining >= 2) {
    place(full, 2);
  }
  if (remaining === 1) {
    place(half, 1);
  }
  const fullBlocks = placements.filter((item) => item.nominalLengthMm === full.nominalLengthMm).length;
  const halfBlocks = placements.length - fullBlocks;
  return {
    parity,
    moduleCount,
    isChannelCourse,
    placements,
    fullBlocks,
    halfBlocks,
    blocks: placements.length
  };
}

/**
 * Propoe ajustes quando o comprimento nominal nao fecha na coordenacao modular.
 */
export function suggestModularAdjustments(
  nominalLengthMm: number,
  family: BlockFamily
): ModularAdjustment[] {
  requireFinitePositive("nominalLengthMm", nominalLengthMm);
  const raw = nominalLengthMm / family.moduleMm;
  const rounded = Math.round(raw);
  if (Math.abs(raw - rounded) <= MODULE_TOLERANCE) {
    return [];
  }
  const lowerModules = Math.floor(raw);
  const upperModules = Math.ceil(raw);
  const lowerLengthMm = lowerModules * family.moduleMm;
  const upperLengthMm = upperModules * family.moduleMm;
  const residualMm = nominalLengthMm - lowerLengthMm;
  const adjustments: ModularAdjustment[] = [
    {
      kind: "SHRINK_TO_MODULE",
      description: `Reduzir para ${lowerLengthMm} mm (${lowerModules} modulos) e fechar na modulacao.`,
      suggestedNominalLengthMm: lowerLengthMm,
      deltaMm: lowerLengthMm - nominalLengthMm
    },
    {
      kind: "EXPAND_TO_MODULE",
      description: `Ampliar para ${upperLengthMm} mm (${upperModules} modulos) e fechar na modulacao.`,
      suggestedNominalLengthMm: upperLengthMm,
      deltaMm: upperLengthMm - nominalLengthMm
    }
  ];
  const compensator = family.units.find(
    (unit) => unit.role === "compensator" && Math.abs(unit.nominalLengthMm - residualMm) <= MODULE_TOLERANCE
  );
  if (compensator) {
    adjustments.push({
      kind: "COMPENSATOR_UNIT",
      description: `Absorver ${residualMm} mm com a peca de compensacao ${compensator.label}.`,
      suggestedNominalLengthMm: nominalLengthMm,
      deltaMm: 0
    });
  }
  const jointCount = Math.max(1, lowerModules);
  const perJointMm = residualMm / jointCount;
  if (perJointMm <= 3) {
    adjustments.push({
      kind: "JOINT_TUNING",
      description: `Distribuir ${residualMm.toFixed(1)} mm em ${jointCount} juntas (${perJointMm.toFixed(1)} mm por junta, dentro da tolerancia de assentamento).`,
      deltaMm: residualMm
    });
  }
  return adjustments;
}

export function modulateWall(
  input: WallModulationInput,
  family: BlockFamily
): WallModulationResult {
  const familyErrors = validateBlockFamily(family);
  if (familyErrors.length > 0) throw new RangeError(familyErrors.join(" "));
  requireFinitePositive(`${input.id}.nominalLengthMm`, input.nominalLengthMm);
  requireFinitePositive(`${input.id}.verticalGroutSpacingMm`, input.verticalGroutSpacingMm);
  if (!Number.isInteger(input.courseCount) || input.courseCount <= 0) {
    throw new RangeError(`${input.id}.courseCount deve ser um inteiro positivo.`);
  }

  const rawModuleCount = input.nominalLengthMm / family.moduleMm;
  const moduleCount = Math.max(1, Math.round(rawModuleCount));
  const isModular = Math.abs(rawModuleCount - moduleCount) <= MODULE_TOLERANCE;
  const evenCourse = layoutCourse(moduleCount, 0, family);
  const oddCourse = layoutCourse(moduleCount, 1, family);

  const channelSet = new Set(
    (input.channelCourseIndices ?? []).filter(
      (index) => Number.isInteger(index) && index >= 0 && index < input.courseCount
    )
  );

  let fullBlocks = 0;
  let halfBlocks = 0;
  let channelBlocks = 0;
  for (let index = 0; index < input.courseCount; index += 1) {
    const base = index % 2 === 0 ? evenCourse : oddCourse;
    if (channelSet.has(index)) {
      channelBlocks += base.blocks;
    } else {
      fullBlocks += base.fullBlocks;
      halfBlocks += base.halfBlocks;
    }
  }
  const totalBlocks = fullBlocks + halfBlocks + channelBlocks;
  const verticalGroutedCells = Math.floor(input.nominalLengthMm / input.verticalGroutSpacingMm) + 1;
  const adjustments = isModular ? [] : suggestModularAdjustments(input.nominalLengthMm, family);

  return {
    id: input.id,
    nominalLengthMm: input.nominalLengthMm,
    moduleMm: family.moduleMm,
    rawModuleCount,
    moduleCount,
    isModular,
    courseCount: input.courseCount,
    evenCourse,
    oddCourse,
    fullBlocks,
    halfBlocks,
    channelBlocks,
    totalBlocks,
    verticalGroutedCells,
    adjustments
  };
}

function channelCourseIndices(courseCount: number, spacing: number): number[] {
  const indices = new Set<number>([0, courseCount - 1]);
  if (Number.isInteger(spacing) && spacing > 0) {
    for (let index = spacing; index < courseCount - 1; index += spacing) {
      indices.add(index);
    }
  }
  return [...indices].sort((left, right) => left - right);
}

export function modulatePoolPerimeter(
  input: PoolModulationInput,
  family: BlockFamily
): CalculationBundle<PoolModulationResult> {
  const familyErrors = validateBlockFamily(family);
  if (familyErrors.length > 0) throw new RangeError(familyErrors.join(" "));
  requireFinitePositive("internalLengthMm", input.internalLengthMm);
  requireFinitePositive("internalWidthMm", input.internalWidthMm);
  requireFinitePositive("wallHeightMm", input.wallHeightMm);
  requireFinitePositive("wallThicknessMm", input.wallThicknessMm);
  requireFinitePositive("verticalGroutSpacingMm", input.verticalGroutSpacingMm);

  const courseCount = Math.ceil(input.wallHeightMm / family.courseHeightMm);
  const channelIndices = channelCourseIndices(courseCount, input.bondBeamCourseSpacing ?? 0);

  // Linhas de assentamento pelo eixo das paredes; os cantos sao contados uma
  // unica vez pela alternancia de amarracao (metodo de eixo, academico).
  const longNominalMm = input.internalLengthMm + input.wallThicknessMm;
  const shortNominalMm = input.internalWidthMm + input.wallThicknessMm;

  const longWall = modulateWall(
    {
      id: "long-wall",
      nominalLengthMm: longNominalMm,
      courseCount,
      verticalGroutSpacingMm: input.verticalGroutSpacingMm,
      channelCourseIndices: channelIndices
    },
    family
  );
  const shortWall = modulateWall(
    {
      id: "short-wall",
      nominalLengthMm: shortNominalMm,
      courseCount,
      verticalGroutSpacingMm: input.verticalGroutSpacingMm,
      channelCourseIndices: channelIndices
    },
    family
  );

  const thicknessIsModular =
    Math.abs(input.wallThicknessMm - family.nominalWidthMm) <= 1;
  const groutSpacingModules = input.verticalGroutSpacingMm / family.moduleMm;
  const groutSpacingIsModular =
    Math.abs(groutSpacingModules - Math.round(groutSpacingModules)) <= MODULE_TOLERANCE;
  const lBondUnit = family.units.find((unit) => unit.role === "l-bond");
  const tBondUnit = family.units.find((unit) => unit.role === "t-bond");

  const junction: JunctionPlan = {
    cornerCount: 4,
    bondPattern: "alternating-l-corner",
    evenCourseRunningDirection: "long",
    oddCourseRunningDirection: "short",
    groutedCorners: 4,
    ...(lBondUnit ? { lBondUnit } : {}),
    ...(tBondUnit ? { tBondUnit } : {}),
    notes: [
      "Cada canto alterna a parede passante entre fiada e contra-fiada para amarrar o encontro em L.",
      lBondUnit
        ? `A família oferece ${lBondUnit.label} para encontro em L.`
        : "O catálogo não declara bloco L para esta família; detalhar o canto por alternância de fiadas.",
      tBondUnit
        ? `A família oferece ${tBondUnit.label} para encontro em T.`
        : "Bloco T não aplicável ao perímetro retangular simples e não declarado nesta família.",
      thicknessIsModular
        ? "A espessura de parede coincide com a coordenacao modular; o encontro fecha sem peca especial."
        : "A espessura de parede nao e multipla do modulo; o encontro exige peca de amarracao ou ajuste geometrico."
    ]
  };

  const perimeterWalls = 2;
  const totalVerticalGroutedCells =
    perimeterWalls * (longWall.verticalGroutedCells + shortWall.verticalGroutedCells) -
    junction.cornerCount; // cantos compartilhados sao contados uma vez
  const totalChannelBlocks = perimeterWalls * (longWall.channelBlocks + shortWall.channelBlocks);
  const totalBlocks = perimeterWalls * (longWall.totalBlocks + shortWall.totalBlocks);

  const grout: GroutPlan = {
    verticalGroutSpacingMm: input.verticalGroutSpacingMm,
    verticalGroutedCells: totalVerticalGroutedCells,
    channelCourseIndices: channelIndices,
    channelBlocks: totalChannelBlocks,
    notes: [
      "Cantos recebem graute vertical continuo em todas as fiadas.",
      "Fiadas de canaleta na base e no topo recebem graute horizontal (cinta)."
    ]
  };

  const adjustments = [...longWall.adjustments, ...shortWall.adjustments];

  const checks: EngineeringCheck[] = [
    {
      id: "long-wall-modular",
      status: longWall.isModular ? "PASS" : "REQUIRES_REVIEW",
      demand: longWall.rawModuleCount,
      resistance: longWall.moduleCount,
      unit: "modulos",
      message: "Comprimento da parede longa fecha na coordenacao modular."
    },
    {
      id: "short-wall-modular",
      status: shortWall.isModular ? "PASS" : "REQUIRES_REVIEW",
      demand: shortWall.rawModuleCount,
      resistance: shortWall.moduleCount,
      unit: "modulos",
      message: "Comprimento da parede curta fecha na coordenacao modular."
    },
    {
      id: "junction-thickness-modular",
      status: thicknessIsModular ? "PASS" : "REQUIRES_REVIEW",
      demand: input.wallThicknessMm,
      resistance: family.nominalWidthMm,
      unit: "mm",
      message: "Espessura da parede compativel com a largura nominal da familia de blocos."
    },
    {
      id: "vertical-grout-spacing-modular",
      status: groutSpacingIsModular ? "PASS" : "REQUIRES_REVIEW",
      demand: groutSpacingModules,
      resistance: Math.round(groutSpacingModules),
      unit: "modulos",
      message: "Espaçamento do graute vertical coincide com a malha de células dos blocos."
    }
  ];

  const trace: TraceStep[] = [
    {
      id: "course-count",
      description: "Numero de fiadas pela altura da parede",
      equation: "n_fiadas = ceil(H / h_fiada)",
      substitutions: { H: input.wallHeightMm, h_fiada: family.courseHeightMm },
      result: courseCount,
      unit: "fiadas"
    },
    {
      id: "long-wall-modules",
      description: "Modulos da parede longa pelo eixo",
      equation: "m = (L_int + t) / modulo",
      substitutions: {
        L_int: input.internalLengthMm,
        t: input.wallThicknessMm,
        modulo: family.moduleMm
      },
      result: longWall.rawModuleCount,
      unit: "modulos"
    },
    {
      id: "short-wall-modules",
      description: "Modulos da parede curta pelo eixo",
      equation: "m = (W_int + t) / modulo",
      substitutions: {
        W_int: input.internalWidthMm,
        t: input.wallThicknessMm,
        modulo: family.moduleMm
      },
      result: shortWall.rawModuleCount,
      unit: "modulos"
    }
  ];

  const warnings: string[] = [
    "Modulacao academica pelo metodo de eixo; a contagem de cantos e aproximada.",
    "Amarracao, ancoragem de armaduras, emendas e impermeabilizacao permanecem sob responsabilidade de engenheiro habilitado.",
    ...(family.status === "draft" ? ["Familia de blocos academica ainda nao revisada."] : [])
  ];
  if (adjustments.length > 0) {
    warnings.push("Uma ou mais paredes nao fecham na modulacao; consulte as sugestoes de ajuste.");
  }

  return {
    value: {
      familyId: family.id,
      familyVersion: family.version,
      moduleMm: family.moduleMm,
      courseHeightMm: family.courseHeightMm,
      courseCount,
      longWall,
      shortWall,
      junction,
      grout,
      totalBlocks,
      totalChannelBlocks,
      totalVerticalGroutedCells,
      adjustments
    },
    checks,
    trace,
    warnings
  };
}

/** Familia academica 39 (bloco 390x190x190, modulo longitudinal 200 mm). */
export const BLOCK_FAMILY_M20: BlockFamily = Object.freeze({
  id: "academic-block-family-m20",
  label: "Família 39 x 19 x 19 (módulo 200 mm)",
  version: "1.0.0",
  status: "draft",
  manufacturer: "Genérico acadêmico",
  material: "concrete",
  normativeFamily: "20 x 40",
  coordinationGridMm: 100,
  moduleMm: 200,
  courseHeightMm: 200,
  nominalWidthMm: 190,
  jointThicknessMm: 10,
  catalogStrengthRangeMPa: [0, 0] as const,
  catalogDocument: "Sem catálogo comercial",
  units: Object.freeze([
    Object.freeze({ id: "m20-full", label: "Bloco inteiro 390", role: "full", nominalLengthMm: 400, isChannel: false }),
    Object.freeze({ id: "m20-half", label: "Meio bloco 190", role: "half", nominalLengthMm: 200, isChannel: false }),
    Object.freeze({ id: "m20-channel", label: "Canaleta 390", role: "channel", nominalLengthMm: 400, isChannel: true }),
    Object.freeze({ id: "m20-half-channel", label: "Meia canaleta 190", role: "half-channel", nominalLengthMm: 200, isChannel: true })
  ]) as readonly BlockUnit[],
  references: [
    "Familia modular academica compativel com Silva (2022); dimensoes nominais para modulacao."
  ]
});

/** Familia academica 29 (bloco 290x190x140, modulo longitudinal 150 mm). */
export const BLOCK_FAMILY_M15: BlockFamily = Object.freeze({
  id: "academic-block-family-m15",
  label: "Família 29 x 19 x 14 (módulo 150 mm)",
  version: "1.0.0",
  status: "draft",
  manufacturer: "Genérico acadêmico",
  material: "concrete",
  normativeFamily: "15 x 30",
  coordinationGridMm: 50,
  moduleMm: 150,
  courseHeightMm: 200,
  nominalWidthMm: 140,
  jointThicknessMm: 10,
  catalogStrengthRangeMPa: [0, 0] as const,
  catalogDocument: "Sem catálogo comercial",
  units: Object.freeze([
    Object.freeze({ id: "m15-full", label: "Bloco inteiro 290", role: "full", nominalLengthMm: 300, isChannel: false }),
    Object.freeze({ id: "m15-half", label: "Meio bloco 140", role: "half", nominalLengthMm: 150, isChannel: false }),
    Object.freeze({ id: "m15-channel", label: "Canaleta 290", role: "channel", nominalLengthMm: 300, isChannel: true }),
    Object.freeze({ id: "m15-half-channel", label: "Meia canaleta 140", role: "half-channel", nominalLengthMm: 150, isChannel: true })
  ]) as readonly BlockUnit[],
  references: [
    "Familia modular academica compativel com Silva (2022); dimensoes nominais para modulacao."
  ]
});

function catalogFamily(input: Omit<BlockFamily, "version" | "status" | "material" | "courseHeightMm" | "jointThicknessMm">): BlockFamily {
  return Object.freeze({
    ...input,
    version: "1.0.0",
    status: "catalog",
    material: "concrete",
    courseHeightMm: 200,
    jointThicknessMm: 10,
    units: Object.freeze(input.units.map((unit) => Object.freeze(unit)))
  });
}

const standardUnits = (prefix: string, fullActualMm: number, halfActualMm: number, moduleMm: number): BlockUnit[] => [
  { id: `${prefix}-full`, label: `Bloco inteiro ${fullActualMm}`, role: "full", nominalLengthMm: 2 * moduleMm, actualLengthMm: fullActualMm, isChannel: false },
  { id: `${prefix}-half`, label: `Meio bloco ${halfActualMm}`, role: "half", nominalLengthMm: moduleMm, actualLengthMm: halfActualMm, isChannel: false },
  { id: `${prefix}-channel`, label: `Canaleta ${fullActualMm}`, role: "channel", nominalLengthMm: 2 * moduleMm, actualLengthMm: fullActualMm, isChannel: true },
  { id: `${prefix}-half-channel`, label: `Meia canaleta ${halfActualMm}`, role: "half-channel", nominalLengthMm: moduleMm, actualLengthMm: halfActualMm, isChannel: true },
  { id: `${prefix}-comp-a`, label: "Compensador 90", role: "compensator", nominalLengthMm: 100, actualLengthMm: 90, isChannel: false },
  { id: `${prefix}-comp-b`, label: "Compensador 40", role: "compensator", nominalLengthMm: 50, actualLengthMm: 40, isChannel: false }
];

export const JB_BLOCK_FAMILY_15X40 = catalogFamily({
  id: "jb-blocks-15x40",
  label: "JB Blocos · 14 × 19 × 39",
  manufacturer: "JB Blocos",
  normativeFamily: "15 x 40",
  coordinationGridMm: 50,
  moduleMm: 200,
  nominalWidthMm: 140,
  catalogStrengthRangeMPa: [4, 20],
  catalogDocument: "catalogo-jbblocos.pdf",
  units: [
    ...standardUnits("jb15x40", 390, 190, 200),
    { id: "jb15x40-l", label: "Amarração L 340", role: "l-bond", nominalLengthMm: 350, actualLengthMm: 340, isChannel: false },
    { id: "jb15x40-t", label: "Amarração T 540", role: "t-bond", nominalLengthMm: 550, actualLengthMm: 540, isChannel: false }
  ],
  references: ["Catálogo JB Blocos, linhas estruturais Classes A e B.", "ABNT NBR 6136:2016, Tabelas 1 e 3.", "TQS Alvest, Editor de Fabricantes de Blocos."]
});

export const JB_BLOCK_FAMILY_20X40 = catalogFamily({
  id: "jb-blocks-20x40",
  label: "JB Blocos · 19 × 19 × 39",
  manufacturer: "JB Blocos",
  normativeFamily: "20 x 40",
  coordinationGridMm: 50,
  moduleMm: 200,
  nominalWidthMm: 190,
  catalogStrengthRangeMPa: [4, 20],
  catalogDocument: "catalogo-jbblocos.pdf",
  units: standardUnits("jb20x40", 390, 190, 200),
  references: ["Catálogo JB Blocos, linhas estruturais Classes A e B.", "ABNT NBR 6136:2016, Tabelas 1 e 3.", "TQS Alvest, Editor de Fabricantes de Blocos."]
});

export const BLB_BLOCK_FAMILY_15X30 = catalogFamily({
  id: "blb-blocks-15x30",
  label: "BLB · 14 × 19 × 29",
  manufacturer: "BLB Blocos",
  normativeFamily: "15 x 30",
  coordinationGridMm: 50,
  moduleMm: 150,
  nominalWidthMm: 140,
  catalogStrengthRangeMPa: [4, 22],
  catalogDocument: "Catalogo-blocos.pdf",
  units: standardUnits("blb15x30", 290, 140, 150),
  references: ["Catálogo BLB, Linha 14 e resistência comercial de 4 MPa a 22 MPa.", "ABNT NBR 6136:2016, Tabelas 1 e 3.", "TQS Alvest, Editor de Fabricantes de Blocos."]
});

export const BLB_BLOCK_FAMILY_15X40 = catalogFamily({
  id: "blb-blocks-15x40",
  label: "BLB · 14 × 19 × 39",
  manufacturer: "BLB Blocos",
  normativeFamily: "15 x 40",
  coordinationGridMm: 50,
  moduleMm: 200,
  nominalWidthMm: 140,
  catalogStrengthRangeMPa: [4, 22],
  catalogDocument: "Catalogo-blocos.pdf",
  units: [
    ...standardUnits("blb15x40", 390, 190, 200),
    { id: "blb15x40-special-290", label: "Especial 290", role: "special", nominalLengthMm: 300, actualLengthMm: 290, isChannel: false },
    { id: "blb15x40-special-440", label: "Especial 440", role: "special", nominalLengthMm: 450, actualLengthMm: 440, isChannel: false },
    { id: "blb15x40-special-540", label: "Especial 540", role: "t-bond", nominalLengthMm: 550, actualLengthMm: 540, isChannel: false }
  ],
  references: ["Catálogo BLB, Linha 14 e resistência comercial de 4 MPa a 22 MPa.", "ABNT NBR 6136:2016, Tabelas 1 e 3.", "TQS Alvest, Editor de Fabricantes de Blocos."]
});

export const BLB_BLOCK_FAMILY_20X40 = catalogFamily({
  id: "blb-blocks-20x40",
  label: "BLB · 19 × 19 × 39",
  manufacturer: "BLB Blocos",
  normativeFamily: "20 x 40",
  coordinationGridMm: 50,
  moduleMm: 200,
  nominalWidthMm: 190,
  catalogStrengthRangeMPa: [4, 22],
  catalogDocument: "Catalogo-blocos.pdf",
  units: standardUnits("blb20x40", 390, 190, 200),
  references: ["Catálogo BLB, Linha 19 e resistência comercial de 4 MPa a 22 MPa.", "ABNT NBR 6136:2016, Tabelas 1 e 3.", "TQS Alvest, Editor de Fabricantes de Blocos."]
});

export const DEFAULT_BLOCK_FAMILIES: readonly BlockFamily[] = Object.freeze([
  JB_BLOCK_FAMILY_20X40,
  JB_BLOCK_FAMILY_15X40,
  BLB_BLOCK_FAMILY_20X40,
  BLB_BLOCK_FAMILY_15X40,
  BLB_BLOCK_FAMILY_15X30,
  BLOCK_FAMILY_M20,
  BLOCK_FAMILY_M15
]);
