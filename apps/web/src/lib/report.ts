import type { Phase1DesignInput, Phase1DesignResult } from "@poolstruct/calculation-engine";
import type { ProjectRecord, RevisionRecord } from "./models";

const escapeHtml = (value: string): string => value.replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[character] ?? character));

const number = (value: number, digits = 2): string => new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: digits
}).format(value);

export function buildMemoryHtml(
  project: ProjectRecord,
  revision: RevisionRecord,
  input: Phase1DesignInput,
  result: Phase1DesignResult
): string {
  const checks = result.checks.map((check) => `<tr><td>${escapeHtml(check.id)}</td><td>${escapeHtml(check.message)}</td><td>${check.status}</td></tr>`).join("");
  const masonry = result.masonry;
  const masonrySection = masonry ? `<h2>Alvenaria estrutural e modulação</h2>
<div class="grid"><div class="metric">Família: <strong>${escapeHtml(masonry.family.label)}</strong></div><div class="metric">Fiadas: ${masonry.modulation.courseCount}</div><div class="metric">Blocos no perímetro: ${masonry.modulation.totalBlocks}</div><div class="metric">Canaletas: ${masonry.modulation.totalChannelBlocks}</div><div class="metric">Células grauteadas: ${masonry.modulation.totalVerticalGroutedCells}</div><div class="metric">Cintas: ${masonry.modulation.grout.channelCourseIndices.map((index) => `F${index + 1}`).join(", ")}</div></div>
<table><thead><tr><th>Parede</th><th>Inteiros</th><th>Meios</th><th>Canaletas</th><th>Fechamento</th></tr></thead><tbody>
<tr><td>Longa</td><td>${masonry.modulation.longWall.fullBlocks}</td><td>${masonry.modulation.longWall.halfBlocks}</td><td>${masonry.modulation.longWall.channelBlocks}</td><td>${masonry.modulation.longWall.isModular ? "PASS" : "REVISAR"}</td></tr>
<tr><td>Curta</td><td>${masonry.modulation.shortWall.fullBlocks}</td><td>${masonry.modulation.shortWall.halfBlocks}</td><td>${masonry.modulation.shortWall.channelBlocks}</td><td>${masonry.modulation.shortWall.isModular ? "PASS" : "REVISAR"}</td></tr></tbody></table>
<p class="notice">Família acadêmica. Confirmar fabricante, fbk, resistência de prisma, argamassa e graute antes do uso executivo.</p>` : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Memória de cálculo — ${escapeHtml(project.name)}</title><style>
body{font:14px/1.5 Arial,sans-serif;color:#172a2a;max-width:900px;margin:40px auto;padding:0 24px}h1,h2{color:#0b5c5b}header{border-bottom:3px solid #16a39d;margin-bottom:28px}.meta,.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px 28px}.metric{background:#eef8f7;padding:12px;border-radius:6px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #ccd;text-align:left}.notice{border-left:4px solid #d9911b;padding:10px;background:#fff8e7}@media print{body{margin:0}.no-print{display:none}}
</style></head><body><header><p>POOLSTRUCT · MEMÓRIA DE CÁLCULO</p><h1>${escapeHtml(project.name)}</h1></header>
<section class="meta"><p><strong>Local:</strong> ${escapeHtml(project.location || "Não informado")}</p><p><strong>Revisão:</strong> R${revision.revisionNumber}</p><p><strong>Data:</strong> ${new Date(revision.createdAt).toLocaleString("pt-BR")}</p><p><strong>Hash da entrada:</strong> ${revision.inputHash}</p></section>
<h2>Geometria</h2><div class="grid"><div class="metric">Comprimento interno: ${number(input.geometry.internalLengthMm / 1000)} m</div><div class="metric">Largura interna: ${number(input.geometry.internalWidthMm / 1000)} m</div><div class="metric">Lâmina d'água: ${number(input.geometry.waterDepthMm / 1000)} m</div><div class="metric">Parede / laje: ${number(input.geometry.wallThicknessMm)} / ${number(input.geometry.slabThicknessMm)} mm</div></div>
<h2>Resultados</h2><div class="grid"><div class="metric">Situação global: <strong>${result.overallStatus}</strong></div><div class="metric">Capacidade aproximada: ${number(result.hydrostatic.approximateCapacityLitres, 0)} L</div><div class="metric">Pressão máxima: ${number(result.hydrostatic.maximumWallPressureKPa)} kPa</div><div class="metric">Momento na base: ${number(result.hydrostatic.wallBaseMomentKNMPerM)} kN·m/m</div></div>
${masonrySection}
<h2>Verificações</h2><table><thead><tr><th>Item</th><th>Descrição</th><th>Status</th></tr></thead><tbody>${checks}</tbody></table>
<h2>Rastreabilidade</h2><p>Motor ${escapeHtml(result.engineVersion)} · Perfil ${escapeHtml(result.profileId)} v${escapeHtml(result.profileVersion)}</p>
<p class="notice">Documento de pré-dimensionamento acadêmico. A revisão e a responsabilidade técnica de engenheiro habilitado permanecem obrigatórias.</p></body></html>`;
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
