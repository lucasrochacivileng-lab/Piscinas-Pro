import type { IntegratedDesignResult } from "@poolstruct/calculation-engine";
import { StatusBadge } from "./StatusBadge";

interface Props {
  readonly result: IntegratedDesignResult;
}

const number = (value: number, digits = 2): string => new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: digits
}).format(value);

export function GeotechnicalPanel({ result }: Props) {
  const geo = result.geotechnical;
  const materials = result.masonryMaterials;
  const flotationCheck = geo.checks.find((check) => check.id === "global-flotation");

  return <section className="results-panel geotechnical-panel">
    <div className="section-title"><div><p className="eyebrow">Fase geotécnica e normativa</p><h2>SPT, flutuação e materiais</h2></div><span className="drawing-badge">{result.normativeProfile.id} · v{result.normativeProfile.version}</span></div>
    <div className="metrics">
      <article><small>Camada da parede</small><strong>NSPT {geo.wallSoil.nspt}</strong><span>{geo.wallSoil.label}</span></article>
      <article><small>Ângulo de atrito</small><strong>{number(geo.wallSoil.frictionAngleDegrees, 1)}°</strong><span>{geo.wallSoil.source}</span></article>
      <article><small>Tensão admissível</small><strong>{number(geo.bearingSoil.allowableBearingKPa, 0)} kPa</strong><span>{geo.bearingSoil.label}</span></article>
      <article><small>Segurança à flutuação</small><strong>{Number.isFinite(geo.flotation.safetyFactor) ? number(geo.flotation.safetyFactor, 2) : "∞"}</strong><span>mínimo {number(geo.flotation.requiredSafetyFactor, 2)}</span></article>
    </div>
    <div className="reinforcement-grid">
      <article><h3>Empuxo global</h3><p>Submersão: {number(geo.flotation.waterTableHeadAboveDeepestSlabBottomMm, 0)} mm</p><p>Volume deslocado: {number(geo.flotation.displacedVolumeM3)} m³</p><p>Empuxo de projeto: {number(geo.flotation.designUpliftKN)} kN</p></article>
      <article><h3>Pesos estabilizantes</h3><p>Estrutura: {number(geo.flotation.structureWeightKN)} kN</p><p>Cobertura de solo: {number(geo.flotation.permanentSoilCoverWeightKN)} kN</p><p>Lastro adicional: {number(geo.flotation.additionalPermanentBallastKN)} kN</p></article>
      <article><h3>Argamassa, graute e prisma</h3><p>Argamassa: {number(materials.mortarCompressiveStrengthMPa, 1)} MPa</p><p>Graute: {number(materials.groutCompressiveStrengthMPa, 1)} MPa</p><p>Prisma: {number(materials.prismCharacteristicStrengthMPa, 1)} MPa · η={number(materials.prismEfficiency, 2)}</p></article>
    </div>
    <h3>Perfil SPT</h3>
    <div className="checks-list">
      {geo.layers.map((layer) => <div className="check-row" key={layer.id}>
        <span className="status status-pass">NSPT {layer.nspt}</span>
        <span><strong>{layer.label}</strong> · {number(layer.topDepthMm, 0)}–{number(layer.bottomDepthMm, 0)} mm · γsat {number(layer.saturatedUnitWeightKNM3, 1)} kN/m³ · φ {number(layer.frictionAngleDegrees, 1)}° · σadm {number(layer.allowableBearingKPa, 0)} kPa</span>
      </div>)}
    </div>
    {flotationCheck && <div className="check-row"><StatusBadge status={flotationCheck.status} /><span>{flotationCheck.message}</span></div>}
    <div className="warning-box"><p>SPT e correlações são auxiliares. A emissão executiva depende do boletim de sondagem, interpretação geotécnica e documentação dos ensaios de argamassa, graute e prisma.</p></div>
  </section>;
}
