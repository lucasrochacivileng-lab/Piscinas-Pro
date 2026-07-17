import type { NormativeProfile } from "./types.js";
import type { StructuralDesignProfile } from "./engineering.js";

export const DEMONSTRATION_PROFILE: NormativeProfile = Object.freeze({
  id: "demo-hydrostatic-only",
  version: "0.1.0",
  status: "draft",
  waterUnitWeightKNM3: 9.81,
  references: ["Valor fisico demonstrativo; confirmar no perfil tecnico do projeto."]
});

export const SILVA_2022_ACADEMIC_PROFILE: NormativeProfile = Object.freeze({
  id: "silva-2022-academic-example",
  version: "1.0.0",
  status: "draft",
  waterUnitWeightKNM3: 10,
  references: [
    "SILVA, Ronald Lopes. Desenvolvimento de ferramentas computacionais para dimensionamento e detalhamento de piscinas em alvenaria estrutural. UFPB, 2022, PDF p. 47-55."
  ]
});

export const SILVA_2022_PHASE1_PROFILE: StructuralDesignProfile = Object.freeze({
  id: "silva-2022-phase1-academic",
  version: "1.0.0",
  status: "draft",
  sourceKind: "academic",
  waterUnitWeightKNM3: 10,
  concreteUnitWeightKNM3: 25,
  concreteCharacteristicStrengthMPa: 25,
  actionFactor: 1.4,
  masonryResistanceFactor: 2,
  concreteResistanceFactor: 1.4,
  steelResistanceFactor: 1.15,
  steelYieldStrengthMPa: 500,
  minimumWallSteelRatio: 0.001,
  maximumWallBarSpacingThicknessFactor: 6,
  unreinforcedSlendernessLimit: 24,
  reinforcedSlendernessLimit: 30,
  masonryShearBaseMPa: 0.35,
  masonryShearRhoFactorMPa: 17.5,
  masonryShearMaximumMPa: 0.7,
  maximumMainSlabSpacingMm: 200,
  maximumMainSlabSpacingThicknessFactor: 2,
  masonryServiceabilityBoundary: [
    [0, 60],
    [40, 60],
    [55, 20],
    [120, 14]
  ] as const,
  references: [
    "Silva (2022), PDF p. 21-31 e 39-55. Perfil academico, nao normativo."
  ]
});
