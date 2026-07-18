import { NBR_6136_1_2026_PHYSICAL_REQUIREMENTS, type IntegratedDesignInput } from "@poolstruct/calculation-engine";
import { isIntegratedDesignResult, type StoredDesignResult } from "./compatibility";
import type { ProjectRecord, RevisionRecord } from "./models";

const escapeHtml = (value: string): string => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[character] ?? character));

const number = (value: number, digits = 2): string => new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: digits
}).format(value);

const bar = (diameterMm: number, spacingMm: number): string =>
  `Ø${number(diameterMm, 1)} c/${number(spacingMm, 0)} mm`;

export function buildMemoryHtml(
  project: ProjectRecord,
  revision: RevisionRecord,
  input: IntegratedDesignInput,
  result: StoredDesignResult
): string {
  const integrated = isIntegratedDesignResult(result);
  const checks = result.checks.map((check) => `<tr><td>${escapeHtml(check.id)}</td><td>${escapeHtml(check.message)}</td><td>${check.status}</td></tr>`).join("");
  const masonry = result.masonry;
  const maximumWaterDepthMm = result.hydrostatic.maximumWaterDepthMm ?? input.geometry.waterDepthMm;
  const materialMetrics = integrated
    ? `<div class="metric">Argamassa: ${number(result.masonryMaterials.mortarCompressiveStrengthMPa, 1)} MPa</div><div class="metric">Graute: ${number(result.masonryMaterials.groutCompressiveStrengthMPa, 1)} MPa</div><div class="metric">Prisma: ${number(result.masonryMaterials.prismCharacteristicStrengthMPa, 1)} MPa</div><div class="metric">Eficiência prisma/bloco: ${number(result.masonryMaterials.prismEfficiency, 2)}</div>`
    : `<div class="metric">Argamassa, graute e prisma: <strong>não registrados nesta revisão histórica</strong></div>`;
  const masonrySection = masonry ? `<h2>Alvenaria estrutural e modulação</h2>
 <div class="grid"><div class="metric">Família: <strong>${escapeHtml(masonry.family.label)}</strong></div><div class="metric">Fabricante: ${escapeHtml(masonry.family.manufacturer)}</div><div class="metric">Família NBR 6136: ${escapeHtml(masonry.family.normativeFamily)}</div><div class="metric">Classe / fbk: <strong>${masonry.blockClass} / ${number(masonry.blockStrengthMPa, 1)} MPa</strong></div>${materialMetrics}</div>
 <table><thead><tr><th>Parede-base</th><th>Inteiros</th><th>Meios</th><th>Canaletas</th><th>Fechamento</th></tr></thead><tbody>
 <tr><td>Longa</td><td>${masonry.modulation.longWall.fullBlocks}</td><td>${masonry.modulation.longWall.halfBlocks}</td><td>${masonry.modulation.longWall.channelBlocks}</td><td>${masonry.modulation.longWall.isModular ? "PASS" : "REVISAR"}</td></tr>
 <tr><td>Curta</td><td>${masonry.modulation.shortWall.fullBlocks}</td><td>${masonry.modulation.shortWall.halfBlocks}</td><td>${masonry.modulation.shortWall.channelBlocks}</td><td>${masonry.modulation.shortWall.isModular ? "PASS" : "REVISAR"}</td></tr></tbody></table>
 <h3>Controle do lote — ABNT NBR 6136-2</h3>
 <p>Retração por secagem ≤ ${number(NBR_6136_1_2026_PHYSICAL_REQUIREMENTS.maximumDryingShrinkagePercent, 3)}%. Absorção com agregado normal ≤ ${NBR_6136_1_2026_PHYSICAL_REQUIREMENTS.normalAggregateAbsorptionIndividualPercent}% individual e ≤ ${NBR_6136_1_2026_PHYSICAL_REQUIREMENTS.normalAggregateAbsorptionMeanPercent}% média; com agregado leve, ≤ ${NBR_6136_1_2026_PHYSICAL_REQUIREMENTS.lightweightAggregateAbsorptionIndividualPercent}% individual e ≤ ${NBR_6136_1_2026_PHYSICAL_REQUIREMENTS.lightweightAggregateAbsorptionMeanPercent}% média. Ensaio de absorção inicial de água exigido. Estes limites são requisitos de recebimento do lote e não substituem o certificado do fabricante.</p>` : "";
  const zones = result.hydrostatic.zones ?? [];
  const zonesSection = zones.length > 0 ? `<h2>Zonas de profundidade</h2><table><thead><tr><th>Zona</th><th>Perfil</th><th>Comprimento</th><th>Profundidade</th><th>Inclinação</th><th>Volume</th><th>Pressão no piso</th></tr></thead><tbody>${zones.map((zone) => `<tr><td>${escapeHtml(zone.label)}</td><td>${zone.floorProfile === "SLOPED" ? "Inclinado" : "Horizontal"}</td><td>${number(zone.lengthMm, 0)} mm${zone.floorProfile === "SLOPED" ? `<br><small>real ${number(zone.floorLengthMm, 0)} mm</small>` : ""}</td><td>${zone.floorProfile === "SLOPED" ? `${number(zone.startWaterDepthMm, 0)} → ${number(zone.endWaterDepthMm, 0)} mm` : `${number(zone.waterDepthMm, 0)} mm`}</td><td>${zone.floorProfile === "SLOPED" ? `${number(zone.slopePercent, 2)}%` : "—"}</td><td>${number(zone.volumeM3)} m³</td><td>${zone.floorProfile === "SLOPED" ? `${number(zone.startFloorPressureKPa)} → ${number(zone.endFloorPressureKPa)} kPa` : `${number(zone.floorPressureKPa)} kPa`}</td></tr>`).join("")}</tbody></table>` : "";
  const wallPanels = result.wallPanels ?? [];
  const wallsSection = wallPanels.length > 0 ? `<h2>Paredes individualizadas</h2><table><thead><tr><th>ID</th><th>Painel</th><th>Dimensões</th><th>Armadura horizontal</th><th>Armadura vertical</th><th>Momento governante</th></tr></thead><tbody>${wallPanels.map((wall) => `<tr><td>${escapeHtml(wall.id)}</td><td>${escapeHtml(wall.label)}${wall.kind === "STEP" ? " (degrau)" : ""}</td><td>${number(wall.lengthMm, 0)} × ${number(wall.heightMm, 0)} mm</td><td>${bar(wall.design.parallel.layout.diameterMm, wall.design.parallel.layout.spacingMm)}</td><td>${bar(wall.design.perpendicular.layout.diameterMm, wall.design.perpendicular.layout.spacingMm)}</td><td>${number(Math.max(wall.actions.designMomentParallelKNMPerM, wall.actions.designMomentPerpendicularKNMPerM))} kN·m/m</td></tr>`).join("")}</tbody></table>` : "";
  const slabZones = result.slabZones ?? [];
  const slabsSection = slabZones.length > 0 ? `<h2>Lajes por zona</h2><table><thead><tr><th>Laje</th><th>Trecho</th><th>Cota de água subterrânea</th><th>Inferior X/Y</th><th>Superior X/Y</th><th>Caso</th></tr></thead><tbody>${slabZones.map((slab) => `<tr><td>${escapeHtml(slab.label)}</td><td>${number(slab.zone.floorProfile === "SLOPED" ? slab.zone.floorLengthMm : slab.zone.lengthMm, 0)} × ${number(input.geometry.internalWidthMm, 0)} mm${slab.zone.floorProfile === "SLOPED" ? `<br><small>${number(slab.zone.slopePercent, 2)}%</small>` : ""}</td><td>${number(slab.groundwaterHeadAboveSlabBottomMm, 0)} mm</td><td>${bar(slab.design.bottomX.layout.diameterMm, slab.design.bottomX.layout.spacingMm)} / ${bar(slab.design.bottomY.layout.diameterMm, slab.design.bottomY.layout.spacingMm)}</td><td>${bar(slab.design.topX.layout.diameterMm, slab.design.topX.layout.spacingMm)} / ${bar(slab.design.topY.layout.diameterMm, slab.design.topY.layout.spacingMm)}</td><td>${slab.loadCases.governingFloorCase}</td></tr>`).join("")}</tbody></table>` : "";
  const geotechnicalSection = integrated ? (() => {
    const geo = result.geotechnical;
    return `<h2>Perfil SPT e parâmetros do solo</h2><table><thead><tr><th>Camada</th><th>Cotas</th><th>Solo</th><th>NSPT</th><th>γsat</th><th>φ</th><th>σadm</th><th>Origem</th></tr></thead><tbody>${geo.layers.map((layer) => `<tr><td>${escapeHtml(layer.label)}</td><td>${number(layer.topDepthMm, 0)}–${number(layer.bottomDepthMm, 0)} mm</td><td>${layer.material}</td><td>${layer.nspt}</td><td>${number(layer.saturatedUnitWeightKNM3, 1)} kN/m³</td><td>${number(layer.frictionAngleDegrees, 1)}°</td><td>${number(layer.allowableBearingKPa, 0)} kPa</td><td>${layer.source}</td></tr>`).join("")}</tbody></table>
 <h2>Flutuação global — piscina vazia</h2><div class="grid"><div class="metric">Empuxo de projeto: <strong>${number(geo.flotation.designUpliftKN)} kN</strong></div><div class="metric">Peso estabilizante: <strong>${number(geo.flotation.totalStabilizingWeightKN)} kN</strong></div><div class="metric">FS obtido: <strong>${Number.isFinite(geo.flotation.safetyFactor) ? number(geo.flotation.safetyFactor, 2) : "∞"}</strong></div><div class="metric">FS mínimo: ${number(geo.flotation.requiredSafetyFactor, 2)}</div><div class="metric">Peso estrutural: ${number(geo.flotation.structureWeightKN)} kN</div><div class="metric">Solo permanente / lastro: ${number(geo.flotation.permanentSoilCoverWeightKN + geo.flotation.additionalPermanentBallastKN)} kN</div></div>`;
  })() : `<h2>Compatibilidade histórica</h2><p class="notice">Esta revisão foi calculada antes da integração do perfil SPT, flutuação global, argamassa, graute e prisma. O resultado estrutural original foi preservado e não foi recalculado silenciosamente.</p>`;
  const references = integrated
    ? result.normativeProfile.references.map((reference) => `<li>${escapeHtml(reference)}</li>`).join("")
    : `<li>Perfil histórico ${escapeHtml(result.profileId)} v${escapeHtml(result.profileVersion)}.</li>`;
  const engine = integrated ? result.integrationVersion : result.engineVersion;
  const profile = integrated ? result.normativeProfile : {
    id: result.profileId,
    version: result.profileVersion,
    sourceKind: "historical"
  };

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Memória de cálculo — ${escapeHtml(project.name)}</title><style>
 body{font:14px/1.5 Arial,sans-serif;color:#172a2a;max-width:1100px;margin:40px auto;padding:0 24px}h1,h2{color:#0b5c5b}header{border-bottom:3px solid #16a39d;margin-bottom:28px}.meta,.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 28px}.metric{background:#eef8f7;padding:12px;border-radius:6px}table{width:100%;border-collapse:collapse;margin:12px 0 24px}th,td{padding:8px;border-bottom:1px solid #ccd;text-align:left;vertical-align:top}th{background:#eef8f7}.notice{border-left:4px solid #d9911b;padding:10px;background:#fff8e7}@media print{body{margin:0}.no-print{display:none}}
 </style></head><body><header><p>POOLSTRUCT · ${integrated ? "MEMÓRIA DE CÁLCULO INTEGRADA" : "MEMÓRIA DE CÁLCULO HISTÓRICA"}</p><h1>${escapeHtml(project.name)}</h1></header>
 <section class="meta"><p><strong>Local:</strong> ${escapeHtml(project.location || "Não informado")}</p><p><strong>Revisão:</strong> R${revision.revisionNumber}</p><p><strong>Data:</strong> ${new Date(revision.createdAt).toLocaleString("pt-BR")}</p><p><strong>Hash da entrada:</strong> ${revision.inputHash}</p></section>
 <h2>Geometria</h2><div class="grid"><div class="metric">Comprimento interno: ${number(input.geometry.internalLengthMm / 1000)} m</div><div class="metric">Largura interna: ${number(input.geometry.internalWidthMm / 1000)} m</div><div class="metric">Profundidade máxima: ${number(maximumWaterDepthMm / 1000)} m</div><div class="metric">Parede / laje: ${number(input.geometry.wallThicknessMm)} / ${number(input.geometry.slabThicknessMm)} mm</div></div>
 ${zonesSection}${geotechnicalSection}
 <h2>Resultados globais</h2><div class="grid"><div class="metric">Situação global: <strong>${result.overallStatus}</strong></div><div class="metric">Capacidade aproximada: ${number(result.hydrostatic.approximateCapacityLitres, 0)} L</div><div class="metric">Pressão máxima: ${number(result.hydrostatic.maximumWallPressureKPa)} kPa</div><div class="metric">Paredes / lajes calculadas: ${wallPanels.length || 4} / ${slabZones.length || 1}</div></div>
 ${wallsSection}${slabsSection}${masonrySection}
 <h2>Verificações</h2><table><thead><tr><th>Item</th><th>Descrição</th><th>Status</th></tr></thead><tbody>${checks}</tbody></table>
 <h2>Perfil e rastreabilidade</h2><p>Motor ${escapeHtml(engine)} · Perfil ${escapeHtml(profile.id)} v${escapeHtml(profile.version)} · ${profile.sourceKind}</p><ul>${references}</ul>
 <p class="notice">Documento de pré-dimensionamento. NSPT correlacionado, tensão admissível, nível d'água, flutuação, praia inclinada, argamassa, graute, prisma, degraus e ligações exigem confirmação documental e responsabilidade técnica de profissional habilitado.</p></body></html>`;
}

export function downloadMemoryHtml(project: ProjectRecord, revision: RevisionRecord): void {
  const html = buildMemoryHtml(project, revision, revision.input, revision.result);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-r${revision.revisionNumber}.html`;
  link.click();
  URL.revokeObjectURL(url);
}
