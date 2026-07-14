import type { TraceStep } from "./types.js";

export interface SoilEstimateFromSPT {
  readonly nspt: number;
  readonly frictionAngleDegrees: number;
  readonly allowableBearingKgCm2: number;
  readonly allowableBearingKPa: number;
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
      "A tensao admissivel nao e usada automaticamente no dimensionamento da laje."
    ]
  };
}
