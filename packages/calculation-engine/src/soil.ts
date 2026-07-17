import type { EngineeringCheck } from "./engineering.js";
import { maximumPoolDepthMm } from "./geometry.js";
import type { PoolGeometryInput, TraceStep } from "./types.js";

export type SoilType = "SAND" | "SILT" | "CLAY" | "FILL" | "ROCK";

export interface SoilEstimateFromSPT {
  readonly nspt: number;
  readonly frictionAngleDegrees: number;
  readonly allowableBearingKgCm2: number;
  readonly allowableBearingKPa: number;
  readonly trace: readonly TraceStep[];
  readonly warnings: readonly string[];
}

export interface SoilLayerInput {
  readonly id: string;
  readonly label: string;
  readonly soilType: SoilType;
  readonly topDepthMm: number;
  readonly bottomDepthMm: number;
  readonly nspt: number;
  readonly saturatedUnitWeightKNM3: number;
  readonly frictionAngleDegrees: number;
}

export interface GeotechnicalInput {
  readonly layers: readonly SoilLayerInput[];
  /** Profundidade do nível d'água medida para baixo a partir do topo da piscina. */
  readonly groundwaterDepthBelowGradeMm: number;
  /** Resistência permanente adicional solidária à estrutura, sem contar água da piscina. */
  readonly additionalPermanentResistanceKN: number;
}

export const DEFAULT_GEOTECHNICAL_INPUT: GeotechnicalInput = Object.freeze({
  layers: Object.freeze([{
    id: "layer-1",
    label: "Solo de apoio",
    soilType: "SAND",
    topDepthMm: 0,
    bottomDepthMm: 5_000,
    nspt: 10,
    saturatedUnitWeightKNM3: 20,
    frictionAngleDegrees: 32
  }]),
  groundwaterDepthBelowGradeMm: 5_000,
  additionalPermanentResistanceKN: 0
});

export interface ResolvedSoilLayer extends SoilLayerInput {
  readonly allowableBearingKPa: number;
}

export interface SoilProfileResult {
  readonly layers: readonly ResolvedSoilLayer[];
  readonly analysisDepthMm: number;
  readonly representativeSaturatedUnitWeightKNM3: number;
  readonly representativeFrictionAngleDegrees: number;
  readonly foundationLayerId: string;
  readonly foundationLayerLabel: string;
  readonly foundationNspt: number;
  readonly foundationAllowableBearingKPa: number;
  readonly groundwaterDepthBelowGradeMm: number;
  readonly groundwaterHeadAboveDeepestSlabBottomMm: number;
  readonly checks: readonly EngineeringCheck[];
  readonly trace: readonly TraceStep[];
  readonly warnings: readonly string[];
}

export function estimateSoilFromSPT(nspt: number): SoilEstimateFromSPT {
  if (!Number.isFinite(nspt) || nspt < 1 || nspt > 50) {
    throw new RangeError("NSPT deve estar entre 1 e 50 para a estimativa academica.");
  }
  const frictionAngleDegrees = 28 + 0.4 * nspt;
  const allowableBearingKgCm2 = nspt / 5;
  const allowableBearingKPa = allowableBearingKgCm2 * 98.0665;

  return {
    nspt,
    frictionAngleDegrees,
    allowableBearingKgCm2,
    allowableBearingKPa,
    trace: [
      {
        id: "soil-friction-from-nspt",
        description: "Estimativa academica do angulo de atrito",
        equation: "phi = 28 + 0.4 * NSPT",
        substitutions: { NSPT: nspt },
        result: frictionAngleDegrees,
        unit: "degrees"
      },
      {
        id: "soil-bearing-from-nspt",
        description: "Estimativa semiempirica de tensao admissivel",
        equation: "sigma_allowable = NSPT / 5",
        substitutions: { NSPT: nspt },
        result: allowableBearingKgCm2,
        unit: "kgf/cm2"
      }
    ],
    warnings: [
      "Correlacao semiempirica de fonte academica; nao substitui investigacao geotecnica.",
      "A tensão admissível serve para triagem e não substitui análise de recalques, ruptura e variabilidade do perfil."
    ]
  };
}

const validateLayer = (layer: SoilLayerInput, index: number): void => {
  if (layer.id.trim() === "" || layer.label.trim() === "") {
    throw new RangeError(`Camada ${index + 1} deve possuir id e nome.`);
  }
  for (const [field, value] of Object.entries({
    topDepthMm: layer.topDepthMm,
    bottomDepthMm: layer.bottomDepthMm,
    nspt: layer.nspt,
    saturatedUnitWeightKNM3: layer.saturatedUnitWeightKNM3,
    frictionAngleDegrees: layer.frictionAngleDegrees
  })) {
    if (!Number.isFinite(value)) throw new RangeError(`${layer.id}.${field} deve ser finito.`);
  }
  if (layer.topDepthMm < 0 || layer.bottomDepthMm <= layer.topDepthMm) {
    throw new RangeError(`${layer.label}: limites de profundidade invalidos.`);
  }
  if (layer.nspt < 1 || layer.nspt > 50) throw new RangeError(`${layer.label}: NSPT deve estar entre 1 e 50.`);
  if (layer.saturatedUnitWeightKNM3 <= 0) throw new RangeError(`${layer.label}: peso especifico deve ser positivo.`);
  if (layer.frictionAngleDegrees <= 0 || layer.frictionAngleDegrees >= 50) {
    throw new RangeError(`${layer.label}: angulo de atrito deve estar entre 0 e 50 graus.`);
  }
};

export function legacyGeotechnicalInput(
  geometry: PoolGeometryInput,
  saturatedSoilUnitWeightKNM3: number,
  soilFrictionAngleDegrees: number,
  groundwaterHeadAboveSlabBottomMm: number
): GeotechnicalInput {
  const baseDepthMm = maximumPoolDepthMm(geometry) + geometry.slabThicknessMm;
  return {
    layers: [{
      id: "legacy-layer",
      label: "Solo legado",
      soilType: "SAND",
      topDepthMm: 0,
      bottomDepthMm: Math.max(5_000, baseDepthMm + 1_000),
      nspt: 10,
      saturatedUnitWeightKNM3,
      frictionAngleDegrees: soilFrictionAngleDegrees
    }],
    groundwaterDepthBelowGradeMm: Math.max(0, baseDepthMm - groundwaterHeadAboveSlabBottomMm),
    additionalPermanentResistanceKN: 0
  };
}

export function analyzeSoilProfile(
  input: GeotechnicalInput,
  geometry: PoolGeometryInput
): SoilProfileResult {
  if (!Number.isFinite(input.groundwaterDepthBelowGradeMm) || input.groundwaterDepthBelowGradeMm < 0) {
    throw new RangeError("groundwaterDepthBelowGradeMm deve ser finito e nao negativo.");
  }
  if (!Number.isFinite(input.additionalPermanentResistanceKN) || input.additionalPermanentResistanceKN < 0) {
    throw new RangeError("additionalPermanentResistanceKN deve ser finito e nao negativo.");
  }
  if (input.layers.length === 0 || input.layers.length > 30) {
    throw new RangeError("O perfil geotecnico deve conter entre 1 e 30 camadas.");
  }

  const layers = [...input.layers].sort((a, b) => a.topDepthMm - b.topDepthMm);
  layers.forEach(validateLayer);
  if (new Set(layers.map((layer) => layer.id)).size !== layers.length) {
    throw new RangeError("Os ids das camadas de solo devem ser unicos.");
  }

  const analysisDepthMm = maximumPoolDepthMm(geometry) + geometry.slabThicknessMm;
  const discontinuities: string[] = [];
  layers.forEach((layer, index) => {
    const previous = layers[index - 1];
    if (index === 0 && layer.topDepthMm !== 0) discontinuities.push("O perfil deve iniciar na cota 0.");
    if (previous && Math.abs(previous.bottomDepthMm - layer.topDepthMm) > 1) {
      discontinuities.push(`Existe lacuna ou sobreposição entre ${previous.label} e ${layer.label}.`);
    }
  });
  const lastLayer = layers.at(-1);
  const coversBase = Boolean(lastLayer && lastLayer.bottomDepthMm >= analysisDepthMm);
  const intersected = layers.filter((layer) => layer.topDepthMm < analysisDepthMm && layer.bottomDepthMm > 0);
  if (intersected.length === 0) throw new RangeError("Nenhuma camada intercepta a profundidade da piscina.");

  const weightedThicknessMm = intersected.reduce((sum, layer) =>
    sum + Math.max(0, Math.min(layer.bottomDepthMm, analysisDepthMm) - Math.max(layer.topDepthMm, 0)), 0);
  const representativeSaturatedUnitWeightKNM3 = intersected.reduce((sum, layer) => {
    const thickness = Math.max(0, Math.min(layer.bottomDepthMm, analysisDepthMm) - Math.max(layer.topDepthMm, 0));
    return sum + layer.saturatedUnitWeightKNM3 * thickness;
  }, 0) / weightedThicknessMm;
  // A menor resistência ao cisalhamento entre as camadas interceptadas é adotada
  // conservadoramente no modelo simplificado de empuxo único.
  const representativeFrictionAngleDegrees = Math.min(...intersected.map((layer) => layer.frictionAngleDegrees));
  const foundationLayer = layers.find((layer) => analysisDepthMm > layer.topDepthMm && analysisDepthMm <= layer.bottomDepthMm) ?? lastLayer;
  if (!foundationLayer) throw new RangeError("Nao foi possivel identificar a camada de apoio.");
  const resolvedLayers: ResolvedSoilLayer[] = layers.map((layer) => ({
    ...layer,
    allowableBearingKPa: estimateSoilFromSPT(layer.nspt).allowableBearingKPa
  }));
  const foundationAllowableBearingKPa = estimateSoilFromSPT(foundationLayer.nspt).allowableBearingKPa;
  const groundwaterHeadAboveDeepestSlabBottomMm = Math.max(0, analysisDepthMm - input.groundwaterDepthBelowGradeMm);
  const fillPresent = intersected.some((layer) => layer.soilType === "FILL");
  const rockPresent = intersected.some((layer) => layer.soilType === "ROCK");

  const checks: EngineeringCheck[] = [
    {
      id: "soil-profile-continuity",
      status: discontinuities.length === 0 ? "PASS" : "FAIL",
      demand: discontinuities.length,
      resistance: 0,
      unit: "discontinuities",
      message: discontinuities.length === 0 ? "Camadas do perfil SPT são contínuas." : discontinuities.join(" ")
    },
    {
      id: "soil-profile-foundation-coverage",
      status: coversBase ? "PASS" : "FAIL",
      demand: analysisDepthMm,
      resistance: lastLayer?.bottomDepthMm ?? 0,
      unit: "mm",
      message: coversBase ? "Perfil SPT cobre a cota inferior da laje." : "Perfil SPT não alcança a cota inferior da laje."
    },
    {
      id: "soil-spt-bearing-correlation",
      status: "REQUIRES_REVIEW",
      governing: false,
      demand: foundationLayer.nspt,
      resistance: foundationAllowableBearingKPa,
      unit: "kPa",
      message: "Tensão admissível inferida do NSPT é apenas triagem semiempírica; confirmar capacidade e recalques no estudo geotécnico."
    },
    ...(fillPresent ? [{
      id: "soil-fill-layer",
      status: "REQUIRES_REVIEW" as const,
      demand: 1,
      resistance: 0,
      unit: "layer",
      message: "Há aterro no trecho analisado; confirmar controle de compactação, origem e parâmetros de projeto."
    }] : []),
    ...(rockPresent ? [{
      id: "soil-rock-spt-limit",
      status: "REQUIRES_REVIEW" as const,
      demand: 1,
      resistance: 0,
      unit: "layer",
      message: "Camada classificada como rocha exige investigação e parâmetros próprios; correlações de NSPT não são suficientes."
    }] : [])
  ];

  return {
    layers: resolvedLayers,
    analysisDepthMm,
    representativeSaturatedUnitWeightKNM3,
    representativeFrictionAngleDegrees,
    foundationLayerId: foundationLayer.id,
    foundationLayerLabel: foundationLayer.label,
    foundationNspt: foundationLayer.nspt,
    foundationAllowableBearingKPa,
    groundwaterDepthBelowGradeMm: input.groundwaterDepthBelowGradeMm,
    groundwaterHeadAboveDeepestSlabBottomMm,
    checks,
    trace: [
      {
        id: "soil-representative-unit-weight",
        description: "Peso específico saturado médio ponderado pelas espessuras interceptadas",
        equation: "gamma_rep = sum(gamma_i * dz_i) / sum(dz_i)",
        substitutions: { depth: analysisDepthMm, layers: intersected.length },
        result: representativeSaturatedUnitWeightKNM3,
        unit: "kN/m3"
      },
      {
        id: "groundwater-head-at-base",
        description: "Altura de água sobre a face inferior da laje mais profunda",
        equation: "h_w = max(0, z_base - z_water)",
        substitutions: { z_base: analysisDepthMm, z_water: input.groundwaterDepthBelowGradeMm },
        result: groundwaterHeadAboveDeepestSlabBottomMm,
        unit: "mm"
      }
    ],
    warnings: [
      "O modelo de empuxo usa peso específico médio e o menor ângulo de atrito das camadas interceptadas.",
      "Coesão não é mobilizada no empuxo, de forma conservadora.",
      "NSPT, classificação visual e nível d'água devem ser conferidos no boletim de sondagem."
    ]
  };
}
