import type {
  NormativeProfile,
  TraceStep,
  WallPanelError,
  WallPanelInput,
  WallPanelOutcome
} from "./types.js";
import { validateProfile } from "./validation.js";

const MOMENT_COEFFICIENTS = [
  [0.3, 0.043],
  [0.5, 0.061],
  [0.75, 0.077],
  [1, 0.087],
  [1.25, 0.093],
  [1.5, 0.098],
  [1.75, 0.101],
  [2, 0.104]
] as const;

const FIELD_LIMITS: Readonly<
  Record<keyof WallPanelInput, readonly [number, number]>
> = {
  panelLengthMm: [100, 100_000],
  panelHeightMm: [100, 20_000],
  wallThicknessMm: [50, 5_000],
  saturatedSoilUnitWeightKNM3: [1, 50],
  soilFrictionAngleDegrees: [1, 60],
  effectiveHeightFactor: [0.1, 2],
  ultimateLoadFactor: [1, 3],
  orthogonalityCoefficient: [0.01, 2]
};

function validateInput(input: WallPanelInput): WallPanelError[] {
  const errors: WallPanelError[] = [];
  for (const field of Object.keys(FIELD_LIMITS) as (keyof WallPanelInput)[]) {
    const value = input[field];
    const [minimum, maximum] = FIELD_LIMITS[field];
    if (!Number.isFinite(value)) {
      errors.push({ field, code: "NOT_FINITE", message: `${field} deve ser finito.` });
    } else if (value < minimum || value > maximum) {
      errors.push({
        field,
        code: "OUT_OF_RANGE",
        message: `${field} deve estar entre ${minimum} e ${maximum}.`
      });
    }
  }
  return errors;
}

export function activeEarthPressureCoefficient(frictionAngleDegrees: number): number {
  const angleRadians = ((45 - frictionAngleDegrees / 2) * Math.PI) / 180;
  return Math.tan(angleRadians) ** 2;
}

/**
 * Dominio de h/L da tabela E.2 da ABNT NBR 16868-1 usada para painel apoiado em
 * tres bordos e livre no topo. Abaixo do minimo o painel e tratado como balanco
 * vertical; acima do maximo nao ha coeficiente tabelado e o calculo e recusado.
 */
export const PANEL_RATIO_DOMAIN = Object.freeze({ minimum: 0.3, maximum: 2 });

export function momentCoefficientForRatio(heightToLengthRatio: number): number | null {
  if (heightToLengthRatio < PANEL_RATIO_DOMAIN.minimum || heightToLengthRatio > PANEL_RATIO_DOMAIN.maximum) return null;

  for (let index = 1; index < MOMENT_COEFFICIENTS.length; index += 1) {
    const lower = MOMENT_COEFFICIENTS[index - 1];
    const upper = MOMENT_COEFFICIENTS[index];
    if (lower && upper && heightToLengthRatio <= upper[0]) {
      const fraction = (heightToLengthRatio - lower[0]) / (upper[0] - lower[0]);
      return lower[1] + fraction * (upper[1] - lower[1]);
    }
  }

  return MOMENT_COEFFICIENTS.at(-1)?.[1] ?? null;
}

export function calculateWallPanelActions(
  input: WallPanelInput,
  profile: NormativeProfile
): WallPanelOutcome {
  const profileErrors: WallPanelError[] = validateProfile(profile).map((error) => ({
    field: "profile",
    code: error.code,
    message: error.message
  }));
  const errors: WallPanelError[] = [
    ...validateInput(input),
    ...profileErrors
  ];
  if (errors.length > 0) return { ok: false, errors };

  const lengthM = input.panelLengthMm / 1_000;
  const heightM = input.panelHeightMm / 1_000;
  const thicknessM = input.wallThicknessMm / 1_000;
  const heightToLengthRatio = heightM / lengthM;
  const usesCantileverMethod = heightToLengthRatio < PANEL_RATIO_DOMAIN.minimum;
  const momentCoefficient = usesCantileverMethod
    ? 1 / 6
    : momentCoefficientForRatio(heightToLengthRatio);

  if (momentCoefficient === null) {
    return {
      ok: false,
      errors: [{
        field: "heightToLengthRatio",
        code: "UNSUPPORTED_RATIO",
        message: "A relacao h/L acima de 2,0 esta fora do dominio dos metodos academicos implementados."
      }]
    };
  }

  const activeCoefficient = activeEarthPressureCoefficient(input.soilFrictionAngleDegrees);
  const maximumSoilPressureKPa =
    input.saturatedSoilUnitWeightKNM3 * activeCoefficient * heightM;
  const maximumWaterPressureKPa = profile.waterUnitWeightKNM3 * heightM;
  const waterGoverns = maximumWaterPressureKPa >= maximumSoilPressureKPa;
  const governingMaximumPressureKPa = waterGoverns
    ? maximumWaterPressureKPa
    : maximumSoilPressureKPa;
  const governingAveragePressureKPa = governingMaximumPressureKPa / 2;
  const designMomentParallelKNMPerM = usesCantileverMethod
    ? input.ultimateLoadFactor * governingMaximumPressureKPa * heightM ** 2 / 6
    : input.ultimateLoadFactor *
      momentCoefficient *
      governingAveragePressureKPa *
      lengthM ** 2;
  const designMomentPerpendicularKNMPerM = usesCantileverMethod
    ? 0
    : input.orthogonalityCoefficient * designMomentParallelKNMPerM;
  const effectiveHeightM = input.effectiveHeightFactor * heightM;
  const slendernessRatio = effectiveHeightM / thicknessM;

  const trace: TraceStep[] = [
    {
      id: "active-earth-pressure-coefficient",
      description: "Coeficiente de empuxo ativo de Rankine",
      equation: "Ka = tan^2(45 degrees - phi / 2)",
      substitutions: { phi: input.soilFrictionAngleDegrees },
      result: activeCoefficient,
      unit: "dimensionless"
    },
    {
      id: "maximum-soil-pressure",
      description: "Pressao maxima do solo saturado",
      equation: "p_soil = gamma_sat * Ka * h",
      substitutions: {
        gamma_sat: input.saturatedSoilUnitWeightKNM3,
        Ka: activeCoefficient,
        h: heightM
      },
      result: maximumSoilPressureKPa,
      unit: "kPa"
    },
    {
      id: "governing-average-pressure",
      description: "Pressao media equivalente do caso triangular governante",
      equation: "p_average = p_max / 2",
      substitutions: { p_max: governingMaximumPressureKPa },
      result: governingAveragePressureKPa,
      unit: "kPa"
    },
    {
      id: "parallel-design-moment",
      description: "Momento de calculo com tracao paralela as fiadas",
      equation: usesCantileverMethod
        ? "M_parallel = gamma_f * p_max * h^2 / 6"
        : "M_parallel = gamma_f * alpha * p_average * L^2",
      substitutions: usesCantileverMethod
        ? {
            gamma_f: input.ultimateLoadFactor,
            p_max: governingMaximumPressureKPa,
            h: heightM
          }
        : {
            gamma_f: input.ultimateLoadFactor,
            alpha: momentCoefficient,
            p_average: governingAveragePressureKPa,
            L: lengthM
          },
      result: designMomentParallelKNMPerM,
      unit: "kN.m/m"
    },
    {
      id: "perpendicular-design-moment",
      description: "Momento de calculo com tracao perpendicular as fiadas",
      equation: "M_perpendicular = mu * M_parallel",
      substitutions: {
        mu: input.orthogonalityCoefficient,
        M_parallel: designMomentParallelKNMPerM
      },
      result: designMomentPerpendicularKNMPerM,
      unit: "kN.m/m"
    }
  ];

  return {
    ok: true,
    value: {
      analysisMethod: usesCantileverMethod ? "VERTICAL_CANTILEVER" : "TWO_WAY_TABLE",
      activeEarthPressureCoefficient: activeCoefficient,
      maximumSoilPressureKPa,
      maximumWaterPressureKPa,
      governingCase: waterGoverns ? "FULL_POOL_WATER" : "EMPTY_POOL_SATURATED_SOIL",
      governingMaximumPressureKPa,
      governingAveragePressureKPa,
      effectiveHeightM,
      slendernessRatio,
      heightToLengthRatio,
      momentCoefficient,
      designMomentParallelKNMPerM,
      designMomentPerpendicularKNMPerM,
      trace,
      warnings: [
        "Modelo simplificado baseado em fonte academica secundaria.",
        usesCantileverMethod
          ? "Painel tratado como balanco vertical porque h/L < 0,3."
          : "A hipotese de painel apoiado em tres bordas e livre no topo deve ser confirmada no projeto.",
        "O caso governante e selecionado sem considerar contraforte simultaneo na face oposta.",
        ...(profile.status === "draft" ? ["Perfil tecnico ainda nao revisado."] : [])
      ]
    }
  };
}
