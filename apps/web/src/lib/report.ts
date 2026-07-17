import type { IntegratedDesignInput, IntegratedDesignResult } from "@poolstruct/calculation-engine";
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
  result: IntegratedDesignResult
): string {
  const checks = result.checks.map((check) => `<tr><td>${escapeHtml(check.id)}</td><td>${escapeHtml(check.message)}</td><td>${check.status}</td></tr>`).join("");
  const masonry = result.masonry;
  const maximumWaterDepthMm = result.hydrostatic.maximumWaterDepthMm ?? input.geometry.waterDepthMm;
  const materialRows = masonry && "mortarStrengthMPa" in masonry
    ? `<div class="metric">Argamassa: <strong>${number(masonry.mortarStrengthMPa, 1)} MPa</strong></div><div class="metric">Graute: <strong>${number(masonry.groutStrengthMPa, 1)} MPa</strong></div><div class="metric">Prisma: <strong>${number(masonry.prismStrengthMPa, 1)} MPa</strong></div><div class="metric">Eficiência prisma/bloco: <strong>${number(masonry.prismToBlockEfficiency, 2)}</strong></div>`
    : "";
  const masonrySection = masonry ? `<h2>Alvenaria estrutural e materiais</h2>
  <div class="grid"><div class="metric">Família: <strong>${escapeHtml(masonry.family.label)}</strong></div><div class="metric">Classe / fbk: <strong>${masonry.blockClass} / ${number(masonry.blockStrengthMPa, 1)} MPa</strong></div>${materialRows}<div class="metric">Fiadas máximas: ${masonry.modulation.courseCount}</div><div class="metric">Blocos no perímetro-base: ${masonry.modulation.totalBlocks}</div><div class="metric">Canaletas: ${masonry.modulation.totalChannelBlocks}</div><div class="metric">Células grauteadas: ${masonry.modulation.totalVerticalGroutedCells}</div></div>
  <p class="notice">Bloco, argamassa, graute e prisma devem corresponder ao mesmo sistema de alvenaria e ao plano de controle tecnológico da obra.</p>` : "";
  const zones = result.hydrostatic.zones ?? [];
  const zonesSection = zones.length > 0 ? `<h2>Zonas de profundidade</h2><table><thead><tr><th>Zona</th><th>Tipo</th><th>Comprimento</th><th>Profundidade</th><th>Volume</th><th>Pressão no fundo</th></tr></thead><tbody>${zones.map((zone) => `<tr><td>${escapeHtml(zone.label)}</td><td>${zone.kind}</td><td>${number(zone.lengthMm, 0)} mm</td><td>${number(zone.waterDepthMm, 0)} mm</td><td>${number(zone.volumeM3)} m³</td><td>${number(zone.floorPressureKPa)} kPa</td></tr>`).join("")}</tbody></table>` : "";
  const wallPanels = result.wallPanels ?? [];
  const wallsSection = wallPanels.length > 0 ? `<h2>Paredes individualizadas</h2><table><thead><tr><th>ID</th><th>Painel</th><th>Dimensões</th><th>Armadura horizontal</th><th>Armadura vertical</th><th>Momento governante</th></tr></thead><tbody>${wallPanels.map((wall) => `<tr><td>${escapeHtml(wall.id)}</td><td>${escapeHtml(wall.label)}${wall.kind === "STEP" ? " (degrau)" : ""}</td><td>${number(wall.lengthMm, 0)} × ${number(wall.heightMm, 0)} mm</td><td>${bar(wall.design.parallel.layout.diameterMm, wall.design.parallel.layout.spacingMm)}</td><td>${bar(wall.design.perpendicular.layout.diameterMm, wall.design.perpendicular.layout.spacingMm)}</td><td>${number(Math.max(wall.actions.designMomentParallelKNMPerM, wall.actions.designMomentPerpendicularKNMPerM))} kN·m/m</td></tr>`).join("")}</tbody></table>` : "";
  const slabZones = result.slabZones ?? [];
  const slabsSection = slabZones.length > 0 ? `<h2>Lajes por zona</h2><table><thead><tr><th>Laje</th><th>Trecho</th><th>Altura de subpressão</th><th>Inferior X/Y</th><th>Superior X/Y</th><th>Caso</th></tr></thead><tbody>${slabZones.map((slab) => `<tr><td>${escapeHtml(slab.label)}</td><td>${number(slab.zone.lengthMm, 0)} × ${number(input.geometry.internalWidthMm, 0)} mm</td><td>${number(slab.groundwaterHeadAboveSlabBottomMm, 0)} mm</td><td>${bar(slab.design.bottomX.layout.diameterMm, slab.design.bottomX.layout.spacingMm)} / ${bar(slab.design.bottomY.layout.diameterMm, slab.design.bottomY.layout.spacingMm)}</td><td>${bar(slab.design.topX.layout.diameterMm, slab.design.topX.layout.spacingMm)} / ${bar(slab.design.topY.layout.diameterMm, slab.design.topY.layout.spacingMm)}</td><td>${slab.loadCases.governingFloorCase}</td></tr>`).join("")}</tbody></table>` : "";
  const geotechnical = result.geotechnical;
  const geotechnicalSection = geotechnical ? `<h2>Perfil geotécnico e NSPT</h2><div class="grid"><div class="metric">Camada de apoio: <strong>${escapeHtml(geotechnical.foundationLayerLabel)}</strong></div><div class="metric">NSPT de apoio: <strong>${geotechnical.foundationNspt}</strong></div><div class="metric">σadm correlacionada: ${number(geotechnical.foundationAllowableBearingKPa, 0)} kPa</div><div class="metric">N.A.: ${number(geotechnical.groundwaterDepthBelowGradeMm, 0)} mm abaixo do topo</div><div class="metric">γsat representativo: ${number(geotechnical.representativeSaturatedUnitWeightKNM3, 1)} kN/m³</div><div class="metric">φ adotado: ${number(geotechnical.representativeFrictionAngleDegrees, 1)}°</div></div><table><thead><tr><th>Camada</th><th>Solo</th><th>Intervalo</th><th>NSPT</th><th>γsat</th><th>φ</th><th>σadm</th></tr></thead><tbody>${geotechnical.layers.map((layer) => `<tr><td>${escapeHtml(layer.label)}</td><td>${layer.soilType}</td><td>${number(layer.topDepthMm, 0)}–${number(layer.bottomDepthMm, 0)} mm</td><td>${layer.nspt}</td><td>${number(layer.saturatedUnitWeightKNM3, 1)} kN/m³</td><td>${number(layer.frictionAngleDegrees, 1)}°</td><td>${number(layer.allowableBearingKPa, 0)} kPa</td></tr>`).join("")}</tbody></table><p class="notice">Correlações com NSPT são triagens semiempíricas e não substituem análise de recalques, ruptura, variabilidade e relatório geotécnico.</p>` : "";
  const flotation = result.flotation;
  const flotationSection = flotation ? `<h2>Equilíbrio global à flutuação</h2><div class="grid"><div class="metric">Subpressão global: <strong>${number(flotation.grossUpliftKN, 1)} kN</strong></div><div class="metric">Resistência permanente: <strong>${number(flotation.totalPermanentResistanceKN, 1)} kN</strong></div><div class="metric">Peso da laje: ${number(flotation.slabWeightKN, 1)} kN</div><div class="metric">Peso das paredes: ${number(flotation.wallWeightKN, 1)} kN</div><div class="metric">FS calculado: <strong>${flotation.safetyFactor === null ? "não aplicável" : number(flotation.safetyFactor, 2)}</strong></div><div class="metric">FS mínimo do perfil: ${number(flotation.requiredSafetyFactor, 2)}</div></div><p class="notice">Atrito lateral e cunhas de solo não foram mobilizados automaticamente. Resistências adicionais só foram consideradas quando declaradas como permanentes e solidárias à estrutura.</p>` : "";
  const profileLabel = result.profileLabel ?? result.profileId;
  const integrationVersion = result.integrationVersion ?? result.engineVersion;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Memória de cálculo — ${escapeHtml(project.name)}</title><style>
  body{font:14px/1.5 Arial,sans-serif;color:#172a2a;max-width:1100px;margin:40px auto;padding:0 24px}h1,h2{color:#0b5c5b}header{border-bottom:3px solid #16a39d;margin-bottom:28px}.meta,.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 28px}.metric{background:#eef8f7;padding:12px;border-radius:6px}table{width:100%;border-collapse:collapse;margin:12px 0 24px}th,td{padding:8px;border-bottom:1px solid #ccd;text-align:left;vertical-align:top}th{background:#eef8f7}.notice{border-left:4px solid #d9911b;padding:10px;background:#fff8e7}@media print{body{margin:0}.no-print{display:none}}
  </style></head><body><header><p>POOLSTRUCT · MEMÓRIA DE CÁLCULO</p><h1>${escapeHtml(project.name)}</h1></header>
  <section class="meta"><p><strong>Local:</strong> ${escapeHtml(project.location || "Não informado")}</p><p><strong>Revisão:</strong> R${revision.revisionNumber}</p><p><strong>Data:</strong> ${new Date(revision.createdAt).toLocaleString("pt-BR")}</p><p><strong>Hash da entrada:</strong> ${revision.inputHash}</p></section>
  <h2>Perfil de cálculo</h2><div class="grid"><div class="metric">Perfil: <strong>${escapeHtml(profileLabel)}</strong></div><div class="metric">Versão: ${escapeHtml(result.profileVersion)}</div><div class="metric">Origem: ${result.profileSourceKind ?? "legada"}</div><div class="metric">Estado: ${result.profileStatus ?? "legado"}</div></div>
  <h2>Geometria</h2><div class="grid"><div class="metric">Comprimento interno: ${number(input.geometry.internalLengthMm / 1000)} m</div><div class="metric">Largura interna: ${number(input.geometry.internalWidthMm / 1000)} m</div><div class="metric">Profundidade máxima: ${number(maximumWaterDepthMm / 1000)} m</div><div class="metric">Parede / laje: ${number(input.geometry.wallThicknessMm)} / ${number(input.geometry.slabThicknessMm)} mm</div></div>
  ${zonesSection}${geotechnicalSection}${flotationSection}
  <h2>Resultados globais</h2><div class="grid"><div class="metric">Situação global: <strong>${result.overallStatus}</strong></div><div class="metric">Capacidade aproximada: ${number(result.hydrostatic.approximateCapacityLitres, 0)} L</div><div class="metric">Pressão máxima: ${number(result.hydrostatic.maximumWallPressureKPa)} kPa</div><div class="metric">Paredes / lajes calculadas: ${wallPanels.length || 4} / ${slabZones.length || 1}</div></div>
  ${wallsSection}${slabsSection}${masonrySection}
  <h2>Verificações</h2><table><thead><tr><th>Item</th><th>Descrição</th><th>Status</th></tr></thead><tbody>${checks}</tbody></table>
  <h2>Rastreabilidade</h2><p>Motor ${escapeHtml(integrationVersion)} · Perfil ${escapeHtml(result.profileId)} v${escapeHtml(result.profileVersion)}</p>
  <p class="notice">Documento de pré-dimensionamento. Sondagem, parâmetros geotécnicos, flutuação, materiais, ligações, juntas e detalhamento exigem revisão e responsabilidade técnica de engenheiro habilitado.</p></body></html>`;
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
