import type { BlockFamily } from "./modulation.js";
import type { Phase1DesignResult, Phase1WallResult } from "./phase1.js";
import type { PoolGeometryInput } from "./types.js";

export interface SteelBarScheduleItem {
  readonly diameterMm: number;
  readonly count: number;
  readonly lengthMm: number;
}

export interface WallQuantityInput {
  readonly id: string;
  readonly occurrences: number;
  readonly lengthMm: number;
  readonly heightMm: number;
  readonly blockLengthMm: number;
  readonly blockHeightMm: number;
  readonly verticalGroutedCells: number;
  readonly horizontalGroutedCourses: number;
  readonly verticalHoleAreaMm2: number;
  readonly horizontalChannelAreaMm2: number;
  readonly steel: readonly SteelBarScheduleItem[];
}

export interface SlabQuantityInput {
  readonly id: string;
  readonly occurrences: number;
  readonly lengthMm: number;
  readonly widthMm: number;
  readonly thicknessMm: number;
  readonly steel: readonly SteelBarScheduleItem[];
}

export interface ElementQuantityResult {
  readonly id: string;
  readonly blocks: number;
  readonly steelKg: number;
  readonly groutOrConcreteM3: number;
}

export interface MaterialQuantitiesResult {
  readonly elements: readonly ElementQuantityResult[];
  readonly totalBlocks: number;
  readonly totalSteelKg: number;
  readonly totalGroutM3: number;
  readonly totalConcreteM3: number;
  readonly wasteFactor: number;
}

export const steelBarMassKg = (
  diameterMm: number,
  lengthMm: number,
  count = 1
): number => {
  if (
    !Number.isFinite(diameterMm) ||
    !Number.isFinite(lengthMm) ||
    !Number.isFinite(count) ||
    diameterMm <= 0 ||
    lengthMm < 0 ||
    count < 0
  ) {
    throw new RangeError("Bitola, comprimento e quantidade de barras devem ser validos.");
  }
  const areaMm2 = Math.PI * diameterMm ** 2 / 4;
  return areaMm2 * (lengthMm / 1_000) * 0.00785 * count;
};

const scheduleMassKg = (items: readonly SteelBarScheduleItem[]): number =>
  items.reduce(
    (total, item) => total + steelBarMassKg(item.diameterMm, item.lengthMm, item.count),
    0
  );

export function calculateMaterialQuantities(
  walls: readonly WallQuantityInput[],
  slabs: readonly SlabQuantityInput[],
  wasteFactor = 1.1
): MaterialQuantitiesResult {
  if (!Number.isFinite(wasteFactor) || wasteFactor < 1 || wasteFactor > 2) {
    throw new RangeError("wasteFactor deve estar entre 1 e 2.");
  }

  const wallResults: ElementQuantityResult[] = walls.map((wall) => {
    for (const [field, value] of Object.entries(wall)) {
      if (field !== "id" && field !== "steel" && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) {
        throw new RangeError(`${wall.id}.${field} deve ser finito e nao negativo.`);
      }
    }
    if (
      wall.occurrences <= 0 ||
      wall.lengthMm <= 0 ||
      wall.heightMm <= 0 ||
      wall.blockLengthMm <= 0 ||
      wall.blockHeightMm <= 0
    ) {
      throw new RangeError(`Geometria e ocorrencias de ${wall.id} devem ser positivas.`);
    }
    const blocksPerCourse = Math.ceil(wall.lengthMm / wall.blockLengthMm);
    const courses = Math.ceil(wall.heightMm / wall.blockHeightMm);
    const rawBlocks = blocksPerCourse * courses * wall.occurrences;
    const verticalGroutM3 =
      wall.verticalGroutedCells *
      wall.verticalHoleAreaMm2 *
      wall.heightMm *
      wall.occurrences /
      1_000_000_000;
    const horizontalGroutM3 =
      wall.horizontalGroutedCourses *
      wall.horizontalChannelAreaMm2 *
      wall.lengthMm *
      wall.occurrences /
      1_000_000_000;

    return {
      id: wall.id,
      blocks: Math.ceil(rawBlocks * wasteFactor),
      steelKg: scheduleMassKg(wall.steel) * wall.occurrences * wasteFactor,
      groutOrConcreteM3: (verticalGroutM3 + horizontalGroutM3) * wasteFactor
    };
  });

  const slabResults: ElementQuantityResult[] = slabs.map((slab) => {
    if (
      slab.occurrences <= 0 ||
      slab.lengthMm <= 0 ||
      slab.widthMm <= 0 ||
      slab.thicknessMm <= 0
    ) {
      throw new RangeError(`Geometria e ocorrencias de ${slab.id} devem ser positivas.`);
    }
    const concreteM3 =
      slab.lengthMm * slab.widthMm * slab.thicknessMm * slab.occurrences / 1_000_000_000;
    return {
      id: slab.id,
      blocks: 0,
      steelKg: scheduleMassKg(slab.steel) * slab.occurrences * wasteFactor,
      groutOrConcreteM3: concreteM3 * wasteFactor
    };
  });
  const elements = [...wallResults, ...slabResults];

  return {
    elements,
    totalBlocks: wallResults.reduce((total, item) => total + item.blocks, 0),
    totalSteelKg: elements.reduce((total, item) => total + item.steelKg, 0),
    totalGroutM3: wallResults.reduce((total, item) => total + item.groutOrConcreteM3, 0),
    totalConcreteM3: slabResults.reduce((total, item) => total + item.groutOrConcreteM3, 0),
    wasteFactor
  };
}

export interface PoolTakeoffOptions {
  readonly verticalGroutSpacingMm: number;
  readonly verticalHoleAreaMm2: number;
  readonly horizontalChannelAreaMm2: number;
  readonly bondBeamCoursesPerWall: number;
  readonly anchorageMm: number;
  readonly wasteFactor: number;
}

export const DEFAULT_POOL_TAKEOFF_OPTIONS: PoolTakeoffOptions = Object.freeze({
  verticalGroutSpacingMm: 800,
  verticalHoleAreaMm2: 8_000,
  horizontalChannelAreaMm2: 7_000,
  bondBeamCoursesPerWall: 2,
  anchorageMm: 500,
  wasteFactor: 1.1
});

const wallSteelSchedule = (
  lengthMm: number,
  heightMm: number,
  wall: Phase1WallResult,
  anchorageMm: number
): SteelBarScheduleItem[] => [
  {
    diameterMm: wall.design.parallel.layout.diameterMm,
    count: Math.ceil(heightMm / wall.design.parallel.layout.spacingMm) + 1,
    lengthMm: lengthMm + 2 * anchorageMm
  },
  {
    diameterMm: wall.design.perpendicular.layout.diameterMm,
    count: Math.ceil(lengthMm / wall.design.perpendicular.layout.spacingMm) + 1,
    lengthMm: heightMm + 2 * anchorageMm
  }
];

const slabSteelSchedule = (
  lengthMm: number,
  widthMm: number,
  slab: Phase1DesignResult["slab"]
): SteelBarScheduleItem[] => [
  { diameterMm: slab.bottomX.layout.diameterMm, count: Math.ceil(widthMm / slab.bottomX.layout.spacingMm) + 1, lengthMm },
  { diameterMm: slab.bottomY.layout.diameterMm, count: Math.ceil(lengthMm / slab.bottomY.layout.spacingMm) + 1, lengthMm: widthMm },
  { diameterMm: slab.topX.layout.diameterMm, count: Math.ceil(widthMm / slab.topX.layout.spacingMm) + 1, lengthMm },
  { diameterMm: slab.topY.layout.diameterMm, count: Math.ceil(lengthMm / slab.topY.layout.spacingMm) + 1, lengthMm: widthMm }
];

/**
 * Levantamento preliminar por elemento. Em geometrias inclinadas, as paredes
 * laterais usam a altura média de cada segmento e as lajes usam o comprimento
 * real da rampa. Degraus e trechos horizontais permanecem individualizados.
 */
export function takeoffPoolQuantities(
  geometry: PoolGeometryInput,
  result: Phase1DesignResult,
  family: BlockFamily,
  options: PoolTakeoffOptions = DEFAULT_POOL_TAKEOFF_OPTIONS
): MaterialQuantitiesResult {
  const { internalLengthMm, internalWidthMm, waterDepthMm, wallThicknessMm, slabThicknessMm } = geometry;
  for (const [label, value] of Object.entries({ ...geometry, ...options })) {
    if (typeof value === "number" && (!Number.isFinite(value) || value <= 0)) {
      throw new RangeError(`${label} deve ser positivo e finito para o levantamento.`);
    }
  }
  const fullUnit = family.units.find((unit) => unit.role === "full");
  if (!fullUnit) throw new RangeError("A familia de blocos precisa de bloco inteiro.");
  const blockLengthMm = fullUnit.nominalLengthMm;
  const blockHeightMm = family.courseHeightMm;

  const makeWallInput = (
    id: string,
    lengthMm: number,
    heightMm: number,
    wall: Phase1WallResult,
    occurrences = 1
  ): WallQuantityInput => ({
    id,
    occurrences,
    lengthMm,
    heightMm,
    blockLengthMm,
    blockHeightMm,
    verticalGroutedCells: Math.ceil(lengthMm / options.verticalGroutSpacingMm) + 1,
    horizontalGroutedCourses: Math.max(1, options.bondBeamCoursesPerWall),
    verticalHoleAreaMm2: options.verticalHoleAreaMm2,
    horizontalChannelAreaMm2: options.horizontalChannelAreaMm2,
    steel: wallSteelSchedule(lengthMm, heightMm, wall, options.anchorageMm)
  });

  const geometricPanelsById = new Map(
    (result.geometryModel?.wallPanels ?? []).map((panel) => [panel.id, panel] as const)
  );
  const hasIndividualWalls = Array.isArray(result.wallPanels) && result.wallPanels.length > 0;
  const walls: WallQuantityInput[] = hasIndividualWalls
    ? result.wallPanels.map((wall) => {
        const geometricPanel = geometricPanelsById.get(wall.id);
        return makeWallInput(
          wall.id,
          wall.lengthMm,
          geometricPanel?.quantityHeightMm ?? wall.heightMm,
          wall
        );
      })
    : [
        makeWallInput("parede-longa", internalLengthMm + 2 * wallThicknessMm, waterDepthMm, result.longWall, 2),
        makeWallInput("parede-curta", internalWidthMm, waterDepthMm, result.shortWall, 2)
      ];

  const slabWidthMm = internalWidthMm + 2 * wallThicknessMm;
  const hasSlabZones = Array.isArray(result.slabZones) && result.slabZones.length > 0;
  const slabs: SlabQuantityInput[] = hasSlabZones
    ? result.slabZones.map((slabZone, index) => {
        const first = index === 0;
        const last = index === result.slabZones.length - 1;
        const physicalZoneLengthMm = slabZone.zone.floorLengthMm ?? slabZone.zone.lengthMm;
        const lengthMm = physicalZoneLengthMm +
          (first ? wallThicknessMm : 0) +
          (last ? wallThicknessMm : 0);
        return {
          id: slabZone.id,
          occurrences: 1,
          lengthMm,
          widthMm: slabWidthMm,
          thicknessMm: slabThicknessMm,
          steel: slabSteelSchedule(lengthMm, slabWidthMm, slabZone.design)
        };
      })
    : [{
        id: "laje-fundo",
        occurrences: 1,
        lengthMm: internalLengthMm + 2 * wallThicknessMm,
        widthMm: slabWidthMm,
        thicknessMm: slabThicknessMm,
        steel: slabSteelSchedule(internalLengthMm + 2 * wallThicknessMm, slabWidthMm, result.slab)
      }];

  return calculateMaterialQuantities(walls, slabs, options.wasteFactor);
}
