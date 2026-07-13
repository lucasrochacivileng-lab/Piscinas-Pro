import type { NormativeProfile } from "./types.js";

export const DEMONSTRATION_PROFILE: NormativeProfile = Object.freeze({
  id: "demo-hydrostatic-only",
  version: "0.1.0",
  status: "draft",
  waterUnitWeightKNM3: 9.81,
  references: ["Valor fisico demonstrativo; confirmar no perfil tecnico do projeto."]
});

