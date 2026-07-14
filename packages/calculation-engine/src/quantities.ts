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
