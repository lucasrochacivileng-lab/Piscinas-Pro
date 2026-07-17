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

/**
 * Perfil brasileiro rastreável para revisão normativa. Os coeficientes devem ser
 * confirmados pelo responsável técnico contra as edições licenciadas aplicáveis
 * ao projeto antes da emissão executiva.
 */
export const BRAZIL_2026_NORMATIVE_REVIEW_PROFILE: StructuralDesignProfile = Object.freeze({
  id: "brazil-2026-normative-review",
  version: "1.0.0",
  status: "reviewed",
  sourceKind: "normative",
  waterUnitWeightKNM3: 10,
  concreteUnitWeightKNM3: 25,
  concreteCharacteristicStrengthMPa: 30,
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
    "ABNT NBR 6118:2026 — Projeto de estruturas de concreto.",
    "ABNT NBR 16868-1 — Alvenaria estrutural — Projeto.",
    "ABNT NBR 6136-1:2026 — Blocos vazados de concreto simples para alvenaria.",
    "ABNT NBR 6484 — Solo — Sondagens de simples reconhecimento com SPT.",
    "ABNT NBR 6122 — Projeto e execução de fundações.",
    "Confirmar vigência, emendas e requisitos nas edições licenciadas adotadas no contrato."
  ]
});

export const STRUCTURAL_PROFILE_REGISTRY = Object.freeze([
  SILVA_2022_PHASE1_PROFILE,
  BRAZIL_2026_NORMATIVE_REVIEW_PROFILE
] as const);

export function findStructuralProfile(profileId: string): StructuralDesignProfile | undefined {
  return STRUCTURAL_PROFILE_REGISTRY.find((profile) => profile.id === profileId);
}
