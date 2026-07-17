import type { EngineeringCheck, StructuralDesignProfile } from "./engineering.js";
import { maximumPoolDepthMm } from "./geometry.js";
import type { PoolGeometryInput, TraceStep } from "./types.js";

export interface GlobalFlotationInput {
  readonly geometry: PoolGeometryInput;
  readonly groundwaterHeadAboveDeepestSlabBottomMm: number;
  readonly masonryUnitWeightKNM3: number;
  readonly additionalPermanentResistanceKN: number;
}

export interface GlobalFlotationResult {
  readonly externalPlanAreaM2: number;
  readonly grossUpliftKN: number;
  readonly slabWeightKN: number;
  readonly wallWeightKN: number;
  readonly additionalPermanentResistanceKN: number;
  readonly totalPermanentResistanceKN: number;
  readonly netUpliftKN: number;
  readonly safetyFactor: number | null;
  readonly requiredSafetyFactor: number;
  readonly checks: readonly EngineeringCheck[];
  readonly trace: readonly TraceStep[];
  readonly warnings: readonly string[];
}

const finiteNonNegative = (label: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} deve ser finito e nao negativo.`);
  }
};

/**
 * Equilibrio global simplificado da piscina vazia. Considera subpressao na
 * projeção externa da laje e, como resistencia, somente pesos permanentes
 * explicitamente solidarios à estrutura. Atrito lateral e cunhas de solo não
 * são mobilizados automaticamente.
 */
export function calculateGlobalFlotation(
  input: GlobalFlotationInput,
  profile: StructuralDesignProfile
): GlobalFlotationResult {
  finiteNonNegative("groundwaterHeadAboveDeepestSlabBottomMm", input.groundwaterHeadAboveDeepestSlabBottomMm);
  finiteNonNegative("additionalPermanentResistanceKN", input.additionalPermanentResistanceKN);
  if (!Number.isFinite(input.masonryUnitWeightKNM3) || input.masonryUnitWeightKNM3 <= 0) {
    throw new RangeError("masonryUnitWeightKNM3 deve ser positivo e finito.");
  }

  const maximumDepthM = maximumPoolDepthMm(input.geometry) / 1_000;
  const wallThicknessM = input.geometry.wallThicknessMm / 1_000;
  const slabThicknessM = input.geometry.slabThicknessMm / 1_000;
  const internalLengthM = input.geometry.internalLengthMm / 1_000;
  const internalWidthM = input.geometry.internalWidthMm / 1_000;
  const externalLengthM = internalLengthM + 2 * wallThicknessM;
  const externalWidthM = internalWidthM + 2 * wallThicknessM;
  const externalPlanAreaM2 = externalLengthM * externalWidthM;
  const groundwaterHeadM = input.groundwaterHeadAboveDeepestSlabBottomMm / 1_000;

  const grossUpliftKN = profile.waterUnitWeightKNM3 * groundwaterHeadM * externalPlanAreaM2;
  const slabWeightKN = profile.concreteUnitWeightKNM3 * slabThicknessM * externalPlanAreaM2;
  const wallCentrelinePerimeterM = 2 * (internalLengthM + internalWidthM) + 4 * wallThicknessM;
  const wallWeightKN = input.masonryUnitWeightKNM3 * wallCentrelinePerimeterM * wallThicknessM * maximumDepthM;
  const totalPermanentResistanceKN = slabWeightKN + wallWeightKN + input.additionalPermanentResistanceKN;
  const netUpliftKN = Math.max(0, grossUpliftKN - totalPermanentResistanceKN);
  const safetyFactor = grossUpliftKN > 0 ? totalPermanentResistanceKN / grossUpliftKN : null;
  const passes = safetyFactor === null || safetyFactor >= profile.minimumGlobalUpliftSafetyFactor;

  const checks: EngineeringCheck[] = [{
    id: "global-flotation-equilibrium",
    status: passes ? "PASS" : "FAIL",
    demand: grossUpliftKN,
    resistance: totalPermanentResistanceKN / profile.minimumGlobalUpliftSafetyFactor,
    unit: "kN",
    message: passes
      ? "Equilíbrio global à flutuação atende o fator mínimo do perfil selecionado."
      : "Resistência permanente insuficiente para o equilíbrio global à flutuação."
  }];

  return {
    externalPlanAreaM2,
    grossUpliftKN,
    slabWeightKN,
    wallWeightKN,
    additionalPermanentResistanceKN: input.additionalPermanentResistanceKN,
    totalPermanentResistanceKN,
    netUpliftKN,
    safetyFactor,
    requiredSafetyFactor: profile.minimumGlobalUpliftSafetyFactor,
    checks,
    trace: [
      {
        id: "global-uplift-force",
        description: "Força global de subpressão na projeção externa da laje",
        equation: "U = gamma_w * h_w * A_ext",
        substitutions: {
          gamma_w: profile.waterUnitWeightKNM3,
          h_w: groundwaterHeadM,
          A_ext: externalPlanAreaM2
        },
        result: grossUpliftKN,
        unit: "kN"
      },
      {
        id: "global-flotation-factor",
        description: "Fator de segurança global à flutuação; resultado 0 indica ausência de subpressão",
        equation: "FS = R_permanente / U",
        substitutions: {
          R_permanente: totalPermanentResistanceKN,
          U: grossUpliftKN
        },
        result: safetyFactor ?? 0,
        unit: "ratio"
      }
    ],
    warnings: [
      "Atrito lateral, aderência ao solo e cunhas de ruptura não são contabilizados automaticamente.",
      "Lastros ou elementos permanentes adicionais só entram quando informados explicitamente.",
      ...(profile.status === "draft" ? ["O fator mínimo de flutuação pertence a perfil preliminar e deve ser confirmado pelo responsável técnico."] : [])
    ]
  };
}
