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

const COMMON_SERVICEABILITY_BOUNDARY = [
  [0, 60],
  [40, 60],
  [55, 20],
  [120, 14]
] as const;

export const SILVA_2022_PHASE1_PROFILE: StructuralDesignProfile = Object.freeze({
  id: "silva-2022-phase1-academic",
  label: "Silva 2022 — acadêmico",
  version: "1.1.0",
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
  minimumGlobalUpliftSafetyFactor: 1.1,
  minimumMortarStrengthMPa: 4,
  minimumGroutStrengthMPa: 15,
  minimumPrismToBlockEfficiency: 0.35,
  maximumPrismToBlockEfficiency: 0.9,
  masonryServiceabilityBoundary: COMMON_SERVICEABILITY_BOUNDARY,
  references: [
    "Silva (2022), PDF p. 21-31 e 39-55. Perfil academico, nao normativo.",
    "Limites de argamassa, graute, prisma e flutuação são parâmetros preliminares desta implementação."
  ]
});

/**
 * Perfil brasileiro preliminar e versionado. O sourceKind indica que a estrutura
 * foi organizada por famílias normativas brasileiras, mas status=draft impede
 * que o software o apresente como conformidade executiva sem revisão licenciada.
 */
export const BRAZIL_2026_PRELIMINARY_PROFILE: StructuralDesignProfile = Object.freeze({
  id: "brazil-2026-preliminary",
  label: "Brasil 2026 — normativo preliminar",
  version: "0.1.0",
  status: "draft",
  sourceKind: "normative",
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
  minimumGlobalUpliftSafetyFactor: 1.1,
  minimumMortarStrengthMPa: 4,
  minimumGroutStrengthMPa: 15,
  minimumPrismToBlockEfficiency: 0.35,
  maximumPrismToBlockEfficiency: 0.9,
  masonryServiceabilityBoundary: COMMON_SERVICEABILITY_BOUNDARY,
  references: [
    "ABNT NBR 6484: sondagens de simples reconhecimento com SPT.",
    "ABNT NBR 6122: projeto e execução de fundações.",
    "ABNT NBR 16868-1: projeto de alvenaria estrutural.",
    "ABNT NBR 6118: projeto de estruturas de concreto.",
    "ABNT NBR 8681: ações e segurança nas estruturas.",
    "ABNT NBR 6136-1: blocos vazados de concreto simples para alvenaria.",
    "Parâmetros numéricos devem ser conferidos na edição licenciada aplicável antes de emissão executiva."
  ]
});

export const STRUCTURAL_DESIGN_PROFILES: readonly StructuralDesignProfile[] = Object.freeze([
  BRAZIL_2026_PRELIMINARY_PROFILE,
  SILVA_2022_PHASE1_PROFILE
]);

export function findStructuralDesignProfile(id: string | undefined): StructuralDesignProfile {
  return STRUCTURAL_DESIGN_PROFILES.find((profile) => profile.id === id) ?? BRAZIL_2026_PRELIMINARY_PROFILE;
}
