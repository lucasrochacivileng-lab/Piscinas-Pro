import type {
  CalculationOutcome,
  NormativeProfile,
  PoolGeometryInput,
  TraceStep
} from "./types.js";
import { validateGeometry, validateProfile } from "./validation.js";

const mmToM = (value: number): number => value / 1_000;

export function calculateHydrostaticAction(
  geometry: PoolGeometryInput,
  profile: NormativeProfile
): CalculationOutcome {
  const errors = [...validateGeometry(geometry), ...validateProfile(profile)];
  if (errors.length > 0) return { ok: false, errors };

  const lengthM = mmToM(geometry.internalLengthMm);
  const widthM = mmToM(geometry.internalWidthMm);
  const depthM = mmToM(geometry.waterDepthMm);
  const gammaWater = profile.waterUnitWeightKNM3;

  const waterVolumeM3 = lengthM * widthM * depthM;
  const maximumWallPressureKPa = gammaWater * depthM;
  const wallResultantKNPerM = (gammaWater * depthM ** 2) / 2;
  const wallBaseMomentKNMPerM = (gammaWater * depthM ** 3) / 6;

  const trace: TraceStep[] = [
    {
      id: "water-volume",
      description: "Volume geometrico de agua",
      equation: "V = L * B * h",
      substitutions: { L: lengthM, B: widthM, h: depthM },
      result: waterVolumeM3,
      unit: "m3"
    },
    {
      id: "maximum-wall-pressure",
      description: "Pressao hidrostatica maxima na base da parede",
      equation: "p = gamma_water * h",
      substitutions: { gamma_water: gammaWater, h: depthM },
      result: maximumWallPressureKPa,
      unit: "kPa"
    },
    {
      id: "wall-resultant",
      description: "Resultante horizontal por metro de parede",
      equation: "F = gamma_water * h^2 / 2",
      substitutions: { gamma_water: gammaWater, h: depthM },
      result: wallResultantKNPerM,
      unit: "kN/m"
    },
    {
      id: "wall-base-moment",
      description: "Momento na base por metro de parede em balanco",
      equation: "M = gamma_water * h^3 / 6",
      substitutions: { gamma_water: gammaWater, h: depthM },
      result: wallBaseMomentKNMPerM,
      unit: "kN.m/m"
    }
  ];

  return {
    ok: true,
    value: {
      waterVolumeM3,
      approximateCapacityLitres: waterVolumeM3 * 1_000,
      maximumWallPressureKPa,
      wallResultantKNPerM,
      wallBaseMomentKNMPerM,
      floorPressureKPa: maximumWallPressureKPa,
      trace,
      warnings: [
        "Resultado limitado ao caso de piscina cheia e a acao da agua.",
        "Nao representa dimensionamento ou aprovacao estrutural.",
        ...(profile.status === "draft" ? ["Perfil de parametros ainda nao revisado."] : [])
      ]
    }
  };
}

