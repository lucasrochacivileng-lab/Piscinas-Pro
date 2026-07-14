import type { Phase1DesignResult } from "@poolstruct/calculation-engine";
import { StatusBadge } from "./StatusBadge";

const format = (value: number, digits = 2) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(value);

export function ResultDashboard({ result }: { result: Phase1DesignResult }) {
  return <section className="results-panel">
    <div className="section-title"><div><p className="eyebrow">Último processamento</p><h2>Resultado estrutural</h2></div><StatusBadge status={result.overallStatus} /></div>
    <div className="metrics">
      <article><small>Capacidade</small><strong>{format(result.hydrostatic.approximateCapacityLitres, 0)} L</strong></article>
      <article><small>Pressão máxima</small><strong>{format(result.hydrostatic.maximumWallPressureKPa)} kPa</strong></article>
      <article><small>Momento na base</small><strong>{format(result.hydrostatic.wallBaseMomentKNMPerM)} kN·m/m</strong></article>
      <article><small>Caso da laje</small><strong>{result.loadCases.governingFloorCase === "FULL_POOL_DOWNWARD" ? "Piscina cheia" : "Subpressão"}</strong></article>
    </div>
    <div className="reinforcement-grid">
      <article><h3>Parede longa</h3><p>Paralela: Ø {result.longWall.design.parallel.layout.diameterMm} c/ {result.longWall.design.parallel.layout.spacingMm} mm</p><p>Perpendicular: Ø {result.longWall.design.perpendicular.layout.diameterMm} c/ {result.longWall.design.perpendicular.layout.spacingMm} mm</p></article>
      <article><h3>Parede curta</h3><p>Paralela: Ø {result.shortWall.design.parallel.layout.diameterMm} c/ {result.shortWall.design.parallel.layout.spacingMm} mm</p><p>Perpendicular: Ø {result.shortWall.design.perpendicular.layout.diameterMm} c/ {result.shortWall.design.perpendicular.layout.spacingMm} mm</p></article>
      <article><h3>Laje — face inferior</h3><p>Direção X: Ø {result.slab.bottomX.layout.diameterMm} c/ {result.slab.bottomX.layout.spacingMm} mm</p><p>Direção Y: Ø {result.slab.bottomY.layout.diameterMm} c/ {result.slab.bottomY.layout.spacingMm} mm</p></article>
    </div>
    <h3>Verificações</h3><div className="checks-list">{result.checks.map((check, index) => <div className="check-row" key={`${index}:${check.id}`}><StatusBadge status={check.status} /><span>{check.message}</span></div>)}</div>
    {result.warnings.length > 0 && <div className="warning-box"><strong>Atenção técnica</strong>{result.warnings.map((warning, index) => <p key={`${index}:${warning}`}>{warning}</p>)}</div>}
  </section>;
}
