import type {
  IntegratedDesignInput,
  IntegratedDesignResult,
  Phase1DesignResult,
  PoolDepthZoneInput,
  SptLayerInput
} from "@poolstruct/calculation-engine";
import { DEFAULT_DESIGN_INPUT } from "./defaults";

export type StoredDesignResult = Phase1DesignResult | IntegratedDesignResult;

type LegacyCompatibleInput = Partial<Omit<
  IntegratedDesignInput,
  "geometry" | "masonry" | "geotechnical" | "masonryMaterials"
>> & {
  readonly geometry?: Partial<IntegratedDesignInput["geometry"]>;
  readonly masonry?: Partial<NonNullable<IntegratedDesignInput["masonry"]>>;
  readonly geotechnical?: Partial<Omit<IntegratedDesignInput["geotechnical"], "layers">> & {
    readonly layers?: readonly Partial<SptLayerInput>[];
  };
  readonly masonryMaterials?: Partial<IntegratedDesignInput["masonryMaterials"]>;
};

const finiteOr = (value: number | undefined, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const normalizeDepthZones = (
  geometry: LegacyCompatibleInput["geometry"],
  internalLengthMm: number,
  waterDepthMm: number
): readonly PoolDepthZoneInput[] => {
  if (geometry?.depthZones && geometry.depthZones.length > 0) return geometry.depthZones;
  return [{
    id: "main",
    label: "Fundo principal",
    kind: "MAIN",
    lengthMm: internalLengthMm,
    waterDepthMm
  }];
};

const normalizeLayers = (
  layers: LegacyCompatibleInput["geotechnical"] extends infer T
    ? T extends { readonly layers?: infer L } ? L : never
    : never
): readonly SptLayerInput[] => {
  const defaultLayer = DEFAULT_DESIGN_INPUT.geotechnical.layers[0]!;
  if (!layers || layers.length === 0) return DEFAULT_DESIGN_INPUT.geotechnical.layers;
  return layers.map((layer, index) => ({
    ...defaultLayer,
    ...layer,
    id: typeof layer.id === "string" && layer.id.trim() !== "" ? layer.id : `layer-${index + 1}`,
    label: typeof layer.label === "string" && layer.label.trim() !== "" ? layer.label : `Camada ${index + 1}`
  }));
};

export function normalizeIntegratedDesignInput(value: unknown): IntegratedDesignInput {
  const candidate = (value && typeof value === "object" ? value : {}) as LegacyCompatibleInput;
  const geometryCandidate = candidate.geometry ?? {};
  const internalLengthMm = finiteOr(
    geometryCandidate.internalLengthMm,
    DEFAULT_DESIGN_INPUT.geometry.internalLengthMm
  );
  const waterDepthMm = finiteOr(
    geometryCandidate.waterDepthMm,
    DEFAULT_DESIGN_INPUT.geometry.waterDepthMm
  );
  const slabThicknessMm = finiteOr(
    geometryCandidate.slabThicknessMm,
    DEFAULT_DESIGN_INPUT.geometry.slabThicknessMm
  );
  const geotechnicalCandidate = candidate.geotechnical ?? {};

  return {
    ...DEFAULT_DESIGN_INPUT,
    ...candidate,
    structuralProfileId: typeof candidate.structuralProfileId === "string" && candidate.structuralProfileId.trim() !== ""
      ? candidate.structuralProfileId
      : DEFAULT_DESIGN_INPUT.structuralProfileId,
    geometry: {
      ...DEFAULT_DESIGN_INPUT.geometry,
      ...geometryCandidate,
      internalLengthMm,
      waterDepthMm,
      slabThicknessMm,
      depthZones: normalizeDepthZones(geometryCandidate, internalLengthMm, waterDepthMm)
    },
    masonry: {
      ...DEFAULT_DESIGN_INPUT.masonry!,
      ...(candidate.masonry ?? {})
    },
    geotechnical: {
      ...DEFAULT_DESIGN_INPUT.geotechnical,
      ...geotechnicalCandidate,
      excavationBottomDepthMm: finiteOr(
        geotechnicalCandidate.excavationBottomDepthMm,
        waterDepthMm + slabThicknessMm + 300
      ),
      layers: normalizeLayers(geotechnicalCandidate.layers)
    },
    masonryMaterials: {
      ...DEFAULT_DESIGN_INPUT.masonryMaterials,
      ...(candidate.masonryMaterials ?? {})
    }
  };
}

export function isIntegratedDesignResult(
  result: StoredDesignResult
): result is IntegratedDesignResult {
  return "integrationVersion" in result &&
    "geotechnical" in result &&
    "masonryMaterials" in result &&
    "normativeProfile" in result;
}
