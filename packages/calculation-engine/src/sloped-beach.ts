import type { EngineeringCheck, StructuralDesignProfile } from "./engineering.js";
import { groundwaterHeadAboveZoneSlabBottomMm } from "./geometry.js";
import { calculatePoolLoadCases } from "./load-cases.js";
import type {
  Phase1DesignInput,
  Phase1DesignResult,
  Phase1SlabZoneResult
} from "./phase1.js";
import { designClampedPoolSlab, type SlabDesignResult } from "./slab-design.js";

const slabDemand = (slab: SlabDesignResult): number => Math.max(
  slab.bottomX.adoptedSteelMm2PerM,
  slab.bottomY.adoptedSteelMm2PerM,
  slab.topX.adoptedSteelMm2PerM,
  slab.topY.adoptedSteelMm2PerM
);

const overall = (checks: readonly EngineeringCheck[]): Phase1DesignResult["overallStatus"] =>
  checks.some((check) => check.governing !== false && check.status === "FAIL")
    ? "FAIL"
    : checks.some((check) => check.governing !== false && check.status === "REQUIRES_REVIEW")
      ? "REQUIRES_REVIEW"
      : "PASS";

const zoneCheckPrefix = (zoneId: string, checkId: string): boolean =>
  checkId.startsWith(`${zoneId}-`);

export function enhanceSlopedBeachDesign(
  input: Phase1DesignInput,
  profile: StructuralDesignProfile,
  base: Phase1DesignResult
): Phase1DesignResult {
  const slopedZones = base.geometryModel.zones.filter(
    (zone) => zone.floorProfile === "SLOPED" && Math.abs(zone.verticalDropMm) > 1
  );
  if (slopedZones.length === 0) return base;

  const slopedIds = new Set(slopedZones.map((zone) => zone.id));
  const slabZones: Phase1SlabZoneResult[] = base.slabZones.map((current) => {
    const zone = current.zone;
    if (!slopedIds.has(zone.id)) return current;

    const groundwaterHead = groundwaterHeadAboveZoneSlabBottomMm(
      input.geometry,
      input.groundwaterHeadAboveSlabBottomMm,
      zone.averageWaterDepthMm
    );
    const zoneLoadCases = calculatePoolLoadCases({
      internalLengthMm: zone.floorLengthMm,
      internalWidthMm: input.geometry.internalWidthMm,
      wallHeightMm: zone.maximumWaterDepthMm,
      wallThicknessMm: input.geometry.wallThicknessMm,
      slabThicknessMm: input.geometry.slabThicknessMm,
      waterDepthMm: zone.averageWaterDepthMm,
      groundwaterHeadAboveSlabBottomMm: groundwaterHead,
      imposedFloorLoadKPa: input.imposedFloorLoadKPa,
      masonryUnitWeightKNM3: input.masonryUnitWeightKNM3
    }, profile);
    const shortSpanMm = Math.min(zone.floorLengthMm, input.geometry.internalWidthMm);
    const trueLongSpanMm = Math.max(zone.floorLengthMm, input.geometry.internalWidthMm);
    const tableLongSpanMm = Math.min(trueLongSpanMm, 2 * shortSpanMm);
    const designBundle = designClampedPoolSlab({
      shortSpanMm,
      longSpanMm: tableLongSpanMm,
      thicknessMm: input.geometry.slabThicknessMm,
      reinforcementCoverMm: input.slabReinforcementCoverMm,
      barDiameterMm: input.slabBarDiameterMm,
      minimumSteelRatio: input.minimumSlabSteelRatio,
      downwardDesignLoadKPa: zoneLoadCases.value.fullPoolDownwardDesignKPa,
      upliftDesignLoadKPa: zoneLoadCases.value.emptyPoolNetUpliftDesignKPa
    }, profile);
    const checks: EngineeringCheck[] = designBundle.checks.map((check) => ({
      ...check,
      id: `${zone.id}-${check.id}`,
      message: `${zone.label}: ${check.message}`
    }));
    if (tableLongSpanMm !== trueLongSpanMm) {
      checks.push({
        id: `${zone.id}-slab-aspect-ratio`,
        status: "REQUIRES_REVIEW",
        demand: shortSpanMm / trueLongSpanMm,
        resistance: 0.5,
        unit: "ratio",
        message: `${zone.label}: relação de vãos inferior a 0,5; revisar o comportamento unidirecional da laje inclinada.`
      });
    }
    checks.push({
      id: `${zone.id}-sloped-slab-model`,
      status: "REQUIRES_REVIEW",
      demand: zone.slopePercent,
      resistance: 0,
      unit: "%",
      message: `${zone.label}: laje inclinada pré-dimensionada com comprimento real de ${zone.floorLengthMm.toFixed(0)} mm e pressão uniforme equivalente à profundidade média. Conferir componente tangencial, continuidade, fissuração, ancoragem e transições no modelo executivo.`
    });

    return {
      id: current.id,
      label: `Laje inclinada — ${zone.label}`,
      zone,
      groundwaterHeadAboveSlabBottomMm: groundwaterHead,
      loadCases: zoneLoadCases.value,
      design: designBundle.value,
      checks
    };
  });

  const governingSlabZone = slabZones.reduce((governing, candidate) =>
    slabDemand(candidate.design) > slabDemand(governing.design) ? candidate : governing
  );
  const retainedChecks = base.checks.filter((check) =>
    !slopedZones.some((zone) => zoneCheckPrefix(zone.id, check.id))
  );
  const checks = [
    ...retainedChecks,
    ...slabZones.filter((zone) => slopedIds.has(zone.zone.id)).flatMap((zone) => zone.checks)
  ];

  return {
    ...base,
    slab: governingSlabZone.design,
    slabZones,
    checks,
    overallStatus: overall(checks),
    warnings: [
      ...base.warnings,
      "Praia inclinada ativa: pressão hidrostática varia linearmente e a laje usa carga uniforme equivalente pela profundidade média.",
      "O pré-dimensionamento da rampa não substitui modelo de placa/casca com geometria, apoios e ligações executivas confirmados."
    ]
  };
}
