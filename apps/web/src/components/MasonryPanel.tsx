import type {
  CourseLayout,
  Phase1MasonryResult,
  WallModulationResult
} from "@poolstruct/calculation-engine";
import { StatusBadge } from "./StatusBadge";

const format = (value: number, digits = 0) => new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: digits
}).format(value);

function CourseStrip({ course, label }: { course: CourseLayout; label: string }) {
  return <div className="course-row">
    <span className="course-label">{label}</span>
    <div className={course.isChannelCourse ? "course-strip channel-course" : "course-strip"}>
      {course.placements.map((placement, index) => <span
        className={`block-unit block-${placement.role}`}
        style={{ flexGrow: placement.nominalLengthMm }}
        title={`${placement.label} · módulo ocupado ${placement.nominalLengthMm} mm`}
        key={`${placement.startModule}:${index}`}
      >{placement.role === "channel" ? "U" : placement.role === "half" ? "½" : ""}</span>)}
    </div>
  </div>;
}

function WallCard({ title, wall }: { title: string; wall: WallModulationResult }) {
  const channelCourse: CourseLayout = {
    ...wall.evenCourse,
    isChannelCourse: true,
    placements: wall.evenCourse.placements.map((placement) => ({ ...placement, role: "channel" as const }))
  };
  return <article className="wall-modulation-card">
    <header><div><h3>{title}</h3><small>{format(wall.nominalLengthMm)} mm · {wall.courseCount} fiadas</small></div><StatusBadge status={wall.isModular ? "PASS" : "REQUIRES_REVIEW"} /></header>
    <div className="block-counts">
      <span><strong>{wall.fullBlocks}</strong> inteiros</span>
      <span><strong>{wall.halfBlocks}</strong> meios</span>
      <span><strong>{wall.channelBlocks}</strong> canaletas</span>
      <span><strong>{wall.verticalGroutedCells}</strong> células grauteadas</span>
    </div>
    <CourseStrip course={wall.evenCourse} label="Fiada 1" />
    <CourseStrip course={wall.oddCourse} label="Fiada 2" />
    <CourseStrip course={channelCourse} label="Canaleta" />
    {wall.adjustments.length > 0 && <div className="modular-adjustments"><strong>Ajustes sugeridos</strong>{wall.adjustments.slice(0, 3).map((item) => <p key={`${item.kind}:${item.suggestedNominalLengthMm ?? item.deltaMm}`}>{item.description}</p>)}</div>}
  </article>;
}

export function MasonryPanel({ masonry }: { masonry: Phase1MasonryResult }) {
  const { family, modulation } = masonry;
  return <section className="masonry-panel">
    <div className="section-title"><div><p className="eyebrow">Alvenaria estrutural</p><h2>Modulação dos blocos</h2></div><StatusBadge status={masonry.checks.some((check) => check.status === "REQUIRES_REVIEW") ? "REQUIRES_REVIEW" : "PASS"} /></div>
    <div className="family-summary">
      <div><small>Família selecionada</small><strong>{family.label}</strong><span>{family.normativeFamily} · {family.catalogDocument}</span></div>
      <div><small>Classificação para uso enterrado</small><strong>Classe {masonry.blockClass} · fbk {format(masonry.blockStrengthMPa, 1)} MPa</strong><span>ABNT NBR 6136-1:2026 · abaixo do solo somente Classe A</span></div>
      <div><small>Total do perímetro</small><strong>{modulation.totalBlocks} blocos</strong><span>{modulation.totalChannelBlocks} canaletas · {modulation.totalVerticalGroutedCells} células grauteadas</span></div>
      <div><small>Cintas com canaleta</small><strong>{modulation.grout.channelCourseIndices.map((index) => `F${index + 1}`).join(" · ")}</strong><span>base, topo e espaçamento configurado</span></div>
    </div>
    <div className="masonry-legend"><span><i className="legend-full" />Bloco inteiro</span><span><i className="legend-half" />Meio bloco</span><span><i className="legend-channel" />Canaleta U</span><span><i className="legend-grout" />Célula grauteada</span></div>
    <div className="wall-modulation-grid"><WallCard title="Parede longa" wall={modulation.longWall} /><WallCard title="Parede curta" wall={modulation.shortWall} /></div>
    <div className="junction-summary"><strong>Encontros e graute</strong><p>{modulation.junction.notes.join(" ")}</p><p>{modulation.grout.notes.join(" ")}</p></div>
    <div className="checks-list">{masonry.checks.map((check) => <div className="check-row" key={check.id}><StatusBadge status={check.status} /><span>{check.message}</span></div>)}</div>
    {family.status !== "reviewed" && <div className="warning-box"><strong>Validação do lote obrigatória</strong><p>O catálogo define geometria e faixa comercial, mas não substitui certificado e ensaios do lote. Confirme fbk, classe, dimensões, absorção, resistência de prisma, argamassa e graute antes do uso executivo.</p></div>}
  </section>;
}