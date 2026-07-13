import type { NormativeProfile } from "./types.js";

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
