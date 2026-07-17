import type { EngineeringCheck } from "./engineering.js";
import type { PoolGeometryModel } from "./geometry.js";
import type { TraceStep } from "./types.js";

export type SoilMaterial =
  | "SAND"
  | "SILTY_SAND"
  | "SANDY_SILT"
  | "SILT"
  | "SANDY_CLAY"
  | "CLAY";

export interface SptLayerInput {
  readonly id: string;
  readonly label: string;
  readonly topDepthMm: number;
  readonly bottomDepthMm: number;
  readonly nspt: number;
  readonly material: SoilMaterial;
  readonly saturatedUnitWeightKNM3?: number;
  readonly frictionAngleDegrees?: number;
  readonly allowableBearingKPa?: number;
}

export interface GeotechnicalInput {
  readonly groundLevelToWaterLevelMm: number;
  readonly excavationBottomDepthMm: number;
  readonly layers: readonly SptLayerInput[];
  readonly permanentSoilCoverThicknessMm: number;
  readonly permanentSoilCoverUnitWeightKNM3: number;
  readonly additionalPermanentBallastKN: number;
  readonly flotationSafetyFactor: number;
}

export interface EvaluatedSoilLayer extends SptLayerInput {
  readonly saturatedUnitWeightKNM3: number;
  readonly frictionAngleDegrees: number;
  readonly allowableBearingKPa: number;
  readonly source: "USER" | "SPT_CORRELATION" | "MIXED";
}

export interface GlobalFlotationResult {
  readonly waterTableHeadAboveDeepestSlabBottomMm: number;
  readonly displacedVolumeM3: number;
  readonly characteristicUpliftKN: number;
  readonly designUpliftKN: number;
  readonly structureWeightKN: number;
  readonly permanentSoilCoverWeightKN: number;
  readonly additionalPermanentBallastKN: number;
  readonly totalStabilizingWeightKN: number;
  readonly safetyFactor: number;
  readonly requiredSafetyFactor: number;
  readonly status: "PASS" | "FAIL" | "REQUIRES_REVIEW";
}

export interface GeotechnicalResult {
  readonly layers: readonly EvaluatedSoilLayer[];
  readonly wallSoil: EvaluatedSoilLayer;
  readonly bearingSoil: EvaluatedSoilLayer;
  readonly flotation: GlobalFlotationResult;
  readonly checks: readonly EngineeringCheck[];
  readonly trace: readonly TraceStep[];
  readonly warnings: readonly string[];
}

const MATERIAL_BASE = Object.freeze<Record<SoilMaterial, {
  readonly gammaSat: number;
  readonly phiBase: number;
  readonly phiSlope: number;
  readonly bearingFactor: number;
}>>({
  SAND: { gammaSat: 20, phiBase: 27, phiSlope: 0.30, bearingFactor: 14 },
  SILTY_SAND: { gammaSat: 19.5, phiBase: 25, phiSlope: 0.27, bearingFactor: 12 },
  SANDY_SILT: { gammaSat: 19, phiBase: 23, phiSlope: 0.23, bearingFactor: 10 },
  SILT: { gammaSat: 18.5, phiBase: 21, phiSlope: 0.18, bearingFactor: 8 },
  SANDY_CLAY: { gammaSat: 19, phiBase: 20, phiSlope: 0.16, bearingFactor: 9 },
  CLAY: { gammaSat: 18, phiBase: 18, phiSlope: 0.12, bearingFactor: 7 }
});

const finitePositive = (value: number): boolean => Number.isFinite(value) && value > 0;

export function evaluateSptLayer(layer: SptLayerInput): EvaluatedSoilLayer {
  if (!layer.id.trim() || !layer.label.trim()) throw new RangeError("Camada SPT deve possuir id e nome.");
  if (!Number.isFinite(layer.topDepthMm) || !Number.isFinite(layer.bottomDepthMm) || layer.topDepthMm < 0 || layer.bottomDepthMm <= layer.topDepthMm) {
    throw new RangeError(`${layer.label}: cotas da camada SPT são inválidas.`);
  }
  if (!Number.isFinite(layer.nspt) || layer.nspt < 1 || layer.nspt > 50) {
    throw new RangeError(`${layer.label}: NSPT deve estar entre 1 e 50 para a correlação.`);
  }
  const base = MATERIAL_BASE[layer.material];
  const correlatedPhi = Math.min(42, base.phiBase + base.phiSlope * layer.nspt);
  const correlatedBearing = Math.min(600, Math.max(40, base.bearingFactor * layer.nspt));
  const gamma = layer.saturatedUnitWeightKNM3 ?? base.gammaSat;
  const phi = layer.frictionAngleDegrees ?? correlatedPhi;
  const bearing = layer.allowableBearingKPa ?? correlatedBearing;
  if (!finitePositive(gamma) || !finitePositive(phi) || phi >= 50 || !finitePositive(bearing)) {
    throw new RangeError(`${layer.label}: parâmetros geotécnicos derivados ou informados são inválidos.`);
  }
  const overrides = [layer.saturatedUnitWeightKNM3, layer.frictionAngleDegrees, layer.allowableBearingKPa]
    .filter((value) => value !== undefined).length;
  return {
    ...layer,
    saturatedUnitWeightKNM3: gamma,
    frictionAngleDegrees: phi,
    allowableBearingKPa: bearing,
    source: overrides === 0 ? "SPT_CORRELATION" : overrides === 3 ? "USER" : "MIXED"
  };
}

function findLayerAtDepth(layers: readonly EvaluatedSoilLayer[], depthMm: number): EvaluatedSoilLayer {
  return layers.find((layer) => depthMm >= layer.topDepthMm && depthMm <= layer.bottomDepthMm) ??
    layers.at(-1) ?? (() => { throw new RangeError("É necessária ao menos uma camada SPT."); })();
}

export function evaluateGeotechnicalModel(
  input: GeotechnicalInput,
  geometry: PoolGeometryModel,
  wallThicknessMm: number,
  slabThicknessMm: number,
  concreteUnitWeightKNM3: number,
  masonryUnitWeightKNM3: number,
  waterUnitWeightKNM3: number,
  actionFactor: number
): GeotechnicalResult {
  if (input.layers.length === 0) throw new RangeError("Informe ao menos uma camada do perfil SPT.");
  if (!Number.isFinite(input.groundLevelToWaterLevelMm) || input.groundLevelToWaterLevelMm < 0) throw new RangeError("Nível d'água do terreno inválido.");
  if (!finitePositive(input.excavationBottomDepthMm) || !finitePositive(input.permanentSoilCoverUnitWeightKNM3) || !finitePositive(input.flotationSafetyFactor)) {
    throw new RangeError("Parâmetros de escavação, cobertura e segurança à flutuação devem ser positivos.");
  }
  if (!Number.isFinite(input.permanentSoilCoverThicknessMm) || input.permanentSoilCoverThicknessMm < 0 || !Number.isFinite(input.additionalPermanentBallastKN) || input.additionalPermanentBallastKN < 0) {
    throw new RangeError("Cobertura e lastro permanente não podem ser negativos.");
  }
  const layers = input.layers.map(evaluateSptLayer).sort((a, b) => a.topDepthMm - b.topDepthMm);
  layers.forEach((layer, index) => {
    const previous = layers[index - 1];
    if (previous && layer.topDepthMm > previous.bottomDepthMm + 1) {
      throw new RangeError(`Há lacuna entre ${previous.label} e ${layer.label} no perfil SPT.`);
    }
  });

  const wallReferenceDepthMm = Math.max(0, input.excavationBottomDepthMm - geometry.maximumWaterDepthMm / 2);
  const wallSoil = findLayerAtDepth(layers, wallReferenceDepthMm);
  const bearingSoil = findLayerAtDepth(layers, input.excavationBottomDepthMm);
  const waterTableHead = Math.max(0, input.excavationBottomDepthMm - input.groundLevelToWaterLevelMm);
  const wallThicknessM = wallThicknessMm / 1_000;
  const slabThicknessM = slabThicknessMm / 1_000;
  const outerLengthM = (geometry.internalLengthMm + 2 * wallThicknessMm) / 1_000;
  const outerWidthM = (geometry.internalWidthMm + 2 * wallThicknessMm) / 1_000;
  const deepestExternalHeightMm = geometry.maximumWaterDepthMm + slabThicknessMm;
  const groundwaterElevationDepthMm = deepestExternalHeightMm - waterTableHead;
  const submergedHeadMm = (waterDepthMm: number): number =>
    Math.max(0, waterDepthMm + slabThicknessMm - groundwaterElevationDepthMm);

  const zoneDisplacedVolumeM3 = geometry.zones.reduce((total, zone) => {
    const startHeadM = submergedHeadMm(zone.startWaterDepthMm) / 1_000;
    const endHeadM = submergedHeadMm(zone.endWaterDepthMm) / 1_000;
    return total + zone.lengthMm / 1_000 * outerWidthM * (startHeadM + endHeadM) / 2;
  }, 0);
  const firstZone = geometry.zones[0];
  const lastZone = geometry.zones.at(-1);
  const endStripVolumeM3 = firstZone && lastZone
    ? wallThicknessM * outerWidthM * (
        submergedHeadMm(firstZone.startWaterDepthMm) + submergedHeadMm(lastZone.endWaterDepthMm)
      ) / 1_000
    : 0;
  const displacedVolumeM3 = zoneDisplacedVolumeM3 + endStripVolumeM3;
  const characteristicUpliftKN = displacedVolumeM3 * waterUnitWeightKNM3;
  const designUpliftKN = characteristicUpliftKN * actionFactor;

  const inclinedSlabVolumeM3 = geometry.zones.reduce(
    (total, zone) => total + zone.floorLengthMm / 1_000 * outerWidthM * slabThicknessM,
    0
  );
  const endSlabVolumeM3 = 2 * wallThicknessM * outerWidthM * slabThicknessM;
  const slabVolumeM3 = inclinedSlabVolumeM3 + endSlabVolumeM3;
  const wallVolumeM3 = geometry.wallPanels.reduce(
    (total, panel) => total +
      panel.lengthMm / 1_000 * (panel.quantityHeightMm ?? panel.heightMm) / 1_000 * wallThicknessM,
    0
  );
  const structureWeightKN = slabVolumeM3 * concreteUnitWeightKNM3 +
    wallVolumeM3 * masonryUnitWeightKNM3;
  const permanentSoilCoverWeightKN = outerLengthM * outerWidthM *
    input.permanentSoilCoverThicknessMm / 1_000 * input.permanentSoilCoverUnitWeightKNM3;
  const totalStabilizingWeightKN = structureWeightKN + permanentSoilCoverWeightKN + input.additionalPermanentBallastKN;
  const safetyFactor = designUpliftKN > 0 ? totalStabilizingWeightKN / designUpliftKN : Number.POSITIVE_INFINITY;
  const flotationStatus = designUpliftKN === 0
    ? "PASS"
    : safetyFactor >= input.flotationSafetyFactor
      ? "PASS"
      : "FAIL";

  const flotation: GlobalFlotationResult = {
    waterTableHeadAboveDeepestSlabBottomMm: waterTableHead,
    displacedVolumeM3,
    characteristicUpliftKN,
    designUpliftKN,
    structureWeightKN,
    permanentSoilCoverWeightKN,
    additionalPermanentBallastKN: input.additionalPermanentBallastKN,
    totalStabilizingWeightKN,
    safetyFactor,
    requiredSafetyFactor: input.flotationSafetyFactor,
    status: flotationStatus
  };

  const checks: EngineeringCheck[] = [
    {
      id: "spt-profile-coverage",
      status: bearingSoil.bottomDepthMm >= input.excavationBottomDepthMm ? "PASS" : "FAIL",
      demand: input.excavationBottomDepthMm,
      resistance: bearingSoil.bottomDepthMm,
      unit: "mm",
      message: "Perfil SPT cobre a cota de apoio da laje mais profunda."
    },
    {
      id: "bearing-pressure-source",
      status: bearingSoil.source === "USER" ? "PASS" : "REQUIRES_REVIEW",
      demand: bearingSoil.allowableBearingKPa,
      resistance: bearingSoil.allowableBearingKPa,
      unit: "kPa",
      message: bearingSoil.source === "USER"
        ? "Tensão admissível informada pelo responsável geotécnico."
        : "Tensão admissível estimada por correlação com NSPT; confirmar em relatório geotécnico."
    },
    {
      id: "global-flotation",
      status: flotationStatus,
      demand: designUpliftKN,
      resistance: totalStabilizingWeightKN / input.flotationSafetyFactor,
      unit: "kN",
      message: designUpliftKN === 0
        ? "Sem submersão externa na cota de fundo informada."
        : `Segurança global à flutuação ${safetyFactor.toFixed(2)}; mínimo adotado ${input.flotationSafetyFactor.toFixed(2)}.`
    },
    {
      id: "spt-correlation-review",
      status: layers.some((layer) => layer.source !== "USER") ? "REQUIRES_REVIEW" : "PASS",
      demand: layers.filter((layer) => layer.source !== "USER").length,
      resistance: 0,
      unit: "layers",
      message: "Correlações de NSPT são auxiliares e não substituem interpretação geotécnica, sondagem e nível d'água medido."
    }
  ];

  return {
    layers,
    wallSoil,
    bearingSoil,
    flotation,
    checks,
    trace: [
      {
        id: "global-uplift",
        description: "Empuxo hidrostático global de projeto na piscina vazia, integrado pelo perfil externo do fundo",
        equation: "Ud = gamma_f * gamma_w * integral(B_ext * h_sub(x) dx)",
        substitutions: { gamma_f: actionFactor, gamma_w: waterUnitWeightKNM3, V_submerso: displacedVolumeM3 },
        result: designUpliftKN,
        unit: "kN"
      },
      {
        id: "global-flotation-factor",
        description: "Fator de segurança global contra flutuação",
        equation: "FS = W_estabilizante / U_d",
        substitutions: { W_estabilizante: totalStabilizingWeightKN, U_d: designUpliftKN },
        result: safetyFactor,
        unit: "ratio"
      }
    ],
    warnings: [
      "O NSPT deve ser transcrito do boletim de sondagem, sem suavização automática.",
      geometry.hasSlopedFloor
        ? "A flutuação global integra o perfil inclinado do fundo e não considera atrito lateral como resistência permanente."
        : "A flutuação global considera piscina vazia e não considera atrito lateral como resistência permanente.",
      "Camadas compressíveis, colapsíveis, expansivas ou com aterro não controlado exigem análise específica."
    ]
  };
}
