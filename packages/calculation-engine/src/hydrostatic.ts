import {
  maximumPoolDepthMm,
  normalizePoolDepthZones,
  poolWaterVolumeM3
} from "./geometry.js";
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

  const widthM = mmToM(geometry.internalWidthMm);
  const maximumDepthMm = maximumPoolDepthMm(geometry);
  const depthM = mmToM(maximumDepthMm);
  const gammaWater = profile.waterUnitWeightKNM3;
  const normalizedZones = normalizePoolDepthZones(geometry);

  const zones = normalizedZones.map((zone) => {
    const zoneDepthM = mmToM(zone.waterDepthMm);
    const volumeM3 = mmToM(zone.lengthMm) * widthM * zoneDepthM;
    return {
      id: zone.id,
      label: zone.label,
      kind: zone.kind,
      lengthMm: zone.lengthMm,
      waterDepthMm: zone.waterDepthMm,
      volumeM3,
      floorPressureKPa: gammaWater * zoneDepthM
    };
  });
  const waterVolumeM3 = poolWaterVolumeM3(geometry);
  const maximumWallPressureKPa = gammaWater * depthM;
  const wallResultantKNPerM = (gammaWater * depthM ** 2) / 2;
  const wallBaseMomentKNMPerM = (gammaWater * depthM ** 3) / 6;

  const trace: TraceStep[] = [
    {
      id: "water-volume-zones",
      description: "Volume geométrico de água pela soma das zonas de profundidade",
      equation: "V = sum(L_i * B * h_i)",
      substitutions: {
        B: widthM,
        zones: zones.length
      },
      result: waterVolumeM3,
      unit: "m3"
    },
    {
      id: "maximum-wall-pressure",
      description: "Pressao hidrostatica maxima na maior profundidade",
      equation: "p = gamma_water * h_max",
      substitutions: { gamma_water: gammaWater, h_max: depthM },
      result: maximumWallPressureKPa,
      unit: "kPa"
    },
    {
      id: "wall-resultant",
      description: "Resultante horizontal por metro da parede mais profunda",
      equation: "F = gamma_water * h_max^2 / 2",
      substitutions: { gamma_water: gammaWater, h_max: depthM },
      result: wallResultantKNPerM,
      unit: "kN/m"
    },
    {
      id: "wall-base-moment",
      description: "Momento na base por metro da parede mais profunda em balanco",
      equation: "M = gamma_water * h_max^3 / 6",
      substitutions: { gamma_water: gammaWater, h_max: depthM },
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
      maximumWaterDepthMm: maximumDepthMm,
      zones,
      trace,
      warnings: [
        zones.length > 1
          ? "Volume e pressões calculados por zonas; o resumo de parede usa a maior profundidade."
          : "Resultado limitado ao caso de piscina cheia e a acao da agua.",
        "Nao representa dimensionamento ou aprovacao estrutural.",
        ...(profile.status === "draft" ? ["Perfil de parametros ainda nao revisado."] : [])
      ]
    }
  };
}
