import type { Phase1DesignResult } from "@poolstruct/calculation-engine";
import { StatusBadge } from "./StatusBadge";

const format = (value: number, digits = 2) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(value);
const bar = (diameterMm: number, spacingMm: number) => `Ø ${format(diameterMm, 1)} c/ ${format(spacingMm, 0)} mm`;

export function ResultDashboard({ result }: { result: Phase1DesignResult }) {
  const wallPanels = result.wallPanels ?? [];
  const slabZones = result.slabZones ?? [];
  return <section className="results-panel">
    <div className="section-title"><div><p className="eyebrow">Último processamento</p><h2>Resultado estrutural</h2></div><StatusBadge status={result.overallStatus} /></div>
    <div className="metrics">
      <article><small>Capacidade</small><strong>{format(result.hydrostatic.approximateCapacityLitres, 0)} L</strong></article>
      <article><small>Pressão máxima</small><strong>{format(result.hydrostatic.maximumWallPressureKPa)} kPa</strong></article>
      <article><small>Profundidades</small><strong>{result.hydrostatic.zones?.length ?? 1} zona(s)</strong></article>
      <article><small>Paredes calculadas</small><strong>{wallPanels.length || 4}</strong></article>
    </div>
    {result.hydrostatic.zones && result.hydrostatic.zones.length > 1 && <><h3>Zonas de profundidade</h3><div className="reinforcement-grid">
      {result.hydrostatic.zones.map((zone) => <article key={zone.id}><h3>{zone.label}</h3><p>{format(zone.lengthMm, 0)} mm de comprimento</p><p>{format(zone.waterDepthMm, 0)} mm de profundidade</p><p>{format(zone.volumeM3, 2)} m³ de água</p></article>)}
    </div></>}
    <h3>Paredes individualizadas</h3><div className="reinforcement-grid">
      {wallPanels.length > 0 ? wallPanels.map((wall) => <article key={wall.id}>
        <h3>{wall.label}</h3><p>{format(wall.lengthMm, 0)} × {format(wall.heightMm, 0)} mm · {wall.kind === "STEP" ? "degrau" : "perímetro"}</p>
        <p>Horizontal: {bar(wall.design.parallel.layout.diameterMm, wall.design.parallel.layout.spacingMm)}</p>
        <p>Vertical: {bar(wall.design.perpendicular.layout.diameterMm, wall.design.perpendicular.layout.spacingMm)}</p>
      </article>) : <>
        <article><h3>Parede longa governante</h3><p>Horizontal: {bar(result.longWall.design.parallel.layout.diameterMm, result.longWall.design.parallel.layout.spacingMm)}</p><p>Vertical: {bar(result.longWall.design.perpendicular.layout.diameterMm, result.longWall.design.perpendicular.layout.spacingMm)}</p></article>
        <article><h3>Parede curta governante</h3><p>Horizontal: {bar(result.shortWall.design.parallel.layout.diameterMm, result.shortWall.design.parallel.layout.spacingMm)}</p><p>Vertical: {bar(result.shortWall.design.perpendicular.layout.diameterMm, result.shortWall.design.perpendicular.layout.spacingMm)}</p></article>
      </>}
    </div>
    <h3>Lajes por profundidade</h3><div className="reinforcement-grid">
      {slabZones.length > 0 ? slabZones.map((slabZone) => <article key={slabZone.id}>
        <h3>{slabZone.label}</h3><p>Inferior X: {bar(slabZone.design.bottomX.layout.diameterMm, slabZone.design.bottomX.layout.spacingMm)}</p><p>Inferior Y: {bar(slabZone.design.bottomY.layout.diameterMm, slabZone.design.bottomY.layout.spacingMm)}</p><p>Superior X/Y: {bar(slabZone.design.topX.layout.diameterMm, slabZone.design.topX.layout.spacingMm)} / {bar(slabZone.design.topY.layout.diameterMm, slabZone.design.topY.layout.spacingMm)}</p>
      </article>) : <article><h3>Laje governante</h3><p>Inferior X: {bar(result.slab.bottomX.layout.diameterMm, result.slab.bottomX.layout.spacingMm)}</p><p>Inferior Y: {bar(result.slab.bottomY.layout.diameterMm, result.slab.bottomY.layout.spacingMm)}</p></article>}
    </div>
    <h3>Verificações</h3><div className="checks-list">{result.checks.map((check, index) => <div className="check-row" key={`${index}:${check.id}`}><StatusBadge status={check.status} /><span>{check.message}</span></div>)}</div>
    {result.warnings.length > 0 && <div className="warning-box"><strong>Atenção técnica</strong>{result.warnings.map((warning, index) => <p key={`${index}:${warning}`}>{warning}</p>)}</div>}
  </section>;
}
