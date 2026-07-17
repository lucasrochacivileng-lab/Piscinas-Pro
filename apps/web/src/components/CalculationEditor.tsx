import {
  DEFAULT_BLOCK_FAMILIES,
  DEFAULT_MASONRY_SPECIFICATION,
  validateConcreteBlockStrength,
  type ConcreteBlockClass,
  type Phase1DesignInput,
  type PoolDepthZoneInput,
  type PoolDepthZoneKind
} from "@poolstruct/calculation-engine";
import { useEffect, useState, type FormEvent } from "react";

interface Props {
  initialInput: Phase1DesignInput;
  busy: boolean;
  onCalculate(input: Phase1DesignInput): Promise<void>;
}

interface NumberFieldProps {
  label: string;
  value: number;
  unit: string;
  step?: number;
  min?: number;
  onChange(value: number): void;
}

const DEFAULT_STRENGTH_BY_CLASS: Readonly<Record<ConcreteBlockClass, number>> = {
  A: 8,
  B: 4,
  C: 3
};

const ZONE_KIND_LABEL: Readonly<Record<PoolDepthZoneKind, string>> = {
  SHALLOW: "Prainha / rasa",
  INTERMEDIATE: "Intermediária",
  MAIN: "Fundo principal"
};

function NumberField({ label, value, unit, step = 1, min = 0, onChange }: NumberFieldProps) {
  return <label className="number-field"><span>{label}</span><div><input type="number" value={value} min={min} step={step} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} required /><small>{unit}</small></div></label>;
}

const legacyZone = (input: Phase1DesignInput): PoolDepthZoneInput => ({
  id: "main",
  label: "Fundo principal",
  kind: "MAIN",
  lengthMm: input.geometry.internalLengthMm,
  waterDepthMm: input.geometry.waterDepthMm
});

export function CalculationEditor({ initialInput, busy, onCalculate }: Props) {
  const [input, setInput] = useState(initialInput);
  useEffect(() => setInput(initialInput), [initialInput]);
  const geometry = input.geometry;
  const zones = geometry.depthZones && geometry.depthZones.length > 0
    ? geometry.depthZones
    : [legacyZone(input)];
  const setGeometry = (
    field: Exclude<keyof Phase1DesignInput["geometry"], "depthZones" | "waterDepthMm">,
    value: number
  ) => setInput((current) => {
    if (field !== "internalLengthMm") {
      return { ...current, geometry: { ...current.geometry, [field]: value } };
    }
    const currentZones = current.geometry.depthZones && current.geometry.depthZones.length > 0
      ? [...current.geometry.depthZones]
      : [legacyZone(current)];
    const lastIndex = currentZones.length - 1;
    const delta = value - current.geometry.internalLengthMm;
    const last = currentZones[lastIndex];
    if (last) currentZones[lastIndex] = { ...last, lengthMm: Math.max(100, last.lengthMm + delta) };
    const adjustedLength = currentZones.reduce((sum, zone) => sum + zone.lengthMm, 0);
    return {
      ...current,
      geometry: { ...current.geometry, internalLengthMm: adjustedLength, depthZones: currentZones }
    };
  });
  const setDepthZones = (nextZones: readonly PoolDepthZoneInput[]) => setInput((current) => {
    const internalLengthMm = nextZones.reduce((sum, zone) => sum + zone.lengthMm, 0);
    const waterDepthMm = Math.max(...nextZones.map((zone) => zone.waterDepthMm));
    return {
      ...current,
      geometry: { ...current.geometry, internalLengthMm, waterDepthMm, depthZones: nextZones }
    };
  });
  const updateZone = (index: number, patch: Partial<PoolDepthZoneInput>) => {
    const next = zones.map((zone, zoneIndex) => zoneIndex === index ? { ...zone, ...patch } : zone);
    setDepthZones(next);
  };
  const addZone = () => {
    const current = [...zones];
    const sourceIndex = current.length - 1;
    const source = current[sourceIndex];
    if (!source || source.lengthMm < 400) return;
    const insertedLength = Math.max(200, Math.floor(source.lengthMm / 3 / 100) * 100);
    current[sourceIndex] = {
      ...source,
      kind: "MAIN",
      label: source.kind === "MAIN" ? source.label : "Fundo principal",
      lengthMm: source.lengthMm - insertedLength
    };
    current.splice(sourceIndex, 0, {
      id: `zone-${Date.now()}`,
      label: current.length === 1 ? "Prainha" : `Trecho ${current.length}`,
      kind: current.length === 1 ? "SHALLOW" : "INTERMEDIATE",
      lengthMm: insertedLength,
      waterDepthMm: current.length === 1 ? Math.min(400, source.waterDepthMm) : source.waterDepthMm
    });
    setDepthZones(current);
  };
  const removeZone = (index: number) => {
    if (zones.length <= 1) return;
    const next = [...zones];
    const removed = next[index];
    if (!removed) return;
    next.splice(index, 1);
    const targetIndex = index === 0 ? 0 : index - 1;
    const target = next[targetIndex];
    if (target) next[targetIndex] = { ...target, lengthMm: target.lengthMm + removed.lengthMm };
    if (next.length === 1 && next[0]) next[0] = { ...next[0], kind: "MAIN", label: "Fundo principal" };
    setDepthZones(next);
  };
  const masonry = input.masonry ?? DEFAULT_MASONRY_SPECIFICATION;
  const blockClass = masonry.blockClass ?? "A";
  const strengthRule = validateConcreteBlockStrength(blockClass, masonry.blockStrengthMPa).rule;
  const setValue = (field: Exclude<keyof Phase1DesignInput, "geometry" | "masonry">, value: number) => setInput((current) => ({ ...current, [field]: value }));
  const setMasonry = (field: keyof typeof masonry, value: string | number) => setInput((current) => ({
    ...current,
    masonry: { ...(current.masonry ?? DEFAULT_MASONRY_SPECIFICATION), [field]: value }
  }));
  const setBlockClass = (nextClass: ConcreteBlockClass) => setInput((current) => {
    const currentMasonry = current.masonry ?? DEFAULT_MASONRY_SPECIFICATION;
    const keepStrength = validateConcreteBlockStrength(nextClass, currentMasonry.blockStrengthMPa).valid;
    return {
      ...current,
      masonry: {
        ...currentMasonry,
        blockClass: nextClass,
        blockStrengthMPa: keepStrength
          ? currentMasonry.blockStrengthMPa
          : DEFAULT_STRENGTH_BY_CLASS[nextClass]
      }
    };
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    void onCalculate(input);
  }

  return <form className="editor" onSubmit={submit}>
    <div className="section-title"><div><p className="eyebrow">Propriedades</p><h2>Modelo estrutural</h2></div><button className="primary calculate-button" disabled={busy}>{busy ? "Calculando…" : "Calcular e salvar revisão"}</button></div>
    <fieldset><legend>Geometria da piscina</legend><div className="form-grid">
      <NumberField label="Comprimento interno" value={geometry.internalLengthMm} unit="mm" min={100} onChange={(value) => setGeometry("internalLengthMm", value)} />
      <NumberField label="Largura interna" value={geometry.internalWidthMm} unit="mm" onChange={(value) => setGeometry("internalWidthMm", value)} />
      <label className="number-field"><span>Profundidade máxima</span><div><input type="number" value={geometry.waterDepthMm} readOnly /><small>mm</small></div></label>
      <NumberField label="Espessura da parede" value={geometry.wallThicknessMm} unit="mm" onChange={(value) => setGeometry("wallThicknessMm", value)} />
      <NumberField label="Espessura da laje" value={geometry.slabThicknessMm} unit="mm" onChange={(value) => setGeometry("slabThicknessMm", value)} />
    </div>
    <div className="depth-zones-editor">
      <div className="section-title"><div><p className="eyebrow">Perfil longitudinal</p><h3>Zonas de profundidade</h3></div><button type="button" className="secondary" onClick={addZone}>Adicionar zona</button></div>
      <p className="field-help">As zonas são sequenciais no sentido do comprimento. Diferenças de cota geram automaticamente paredes de degrau.</p>
      {zones.map((zone, index) => <article className="depth-zone-card" key={zone.id}>
        <header><strong>Z{index + 1}</strong><span>{ZONE_KIND_LABEL[zone.kind]}</span>{zones.length > 1 && <button type="button" className="text-button" onClick={() => removeZone(index)}>Remover</button>}</header>
        <div className="form-grid">
          <label className="select-field"><span>Tipo</span><select value={zone.kind} onChange={(event) => updateZone(index, { kind: event.currentTarget.value as PoolDepthZoneKind })}>
            <option value="SHALLOW">Prainha / rasa</option><option value="INTERMEDIATE">Intermediária</option><option value="MAIN">Fundo principal</option>
          </select></label>
          <label className="number-field"><span>Nome</span><div><input type="text" value={zone.label} onChange={(event) => updateZone(index, { label: event.currentTarget.value })} required /></div></label>
          <NumberField label="Comprimento" value={zone.lengthMm} unit="mm" min={100} onChange={(value) => updateZone(index, { lengthMm: value })} />
          <NumberField label="Profundidade d'água" value={zone.waterDepthMm} unit="mm" min={100} onChange={(value) => updateZone(index, { waterDepthMm: value })} />
        </div>
      </article>)}
      <small>Soma dos trechos: {zones.reduce((sum, zone) => sum + zone.lengthMm, 0)} mm · {zones.length} zona(s) · {Math.max(...zones.map((zone) => zone.waterDepthMm))} mm de profundidade máxima.</small>
    </div></fieldset>
    <fieldset><legend>Alvenaria estrutural e modulação</legend><div className="block-specification">
      <label className="select-field"><span>Família de blocos</span><select value={masonry.blockFamilyId} onChange={(event) => setMasonry("blockFamilyId", event.currentTarget.value)}>
        {DEFAULT_BLOCK_FAMILIES.map((family) => <option value={family.id} key={family.id}>{family.label}</option>)}
      </select></label>
      <label className="select-field"><span>Classe do bloco</span><select value={blockClass} onChange={(event) => setBlockClass(event.currentTarget.value as ConcreteBlockClass)}>
        <option value="A">Classe A</option><option value="B">Classe B</option><option value="C">Classe C</option>
      </select></label>
      <NumberField label="fbk especificado" value={masonry.blockStrengthMPa} unit="MPa" step={strengthRule.incrementMPa} min={strengthRule.minimumMPa} onChange={(value) => setMasonry("blockStrengthMPa", value)} />
      <NumberField label="Graute vertical" value={masonry.verticalGroutSpacingMm} unit="mm" step={50} min={100} onChange={(value) => setMasonry("verticalGroutSpacingMm", value)} />
      <NumberField label="Cinta intermediária" value={masonry.bondBeamCourseSpacing} unit="fiadas" min={0} onChange={(value) => setMasonry("bondBeamCourseSpacing", value)} />
    </div>
    <div className="block-family-preview">{DEFAULT_BLOCK_FAMILIES.filter((family) => family.id === masonry.blockFamilyId).map((family) => <div key={family.id}>
      <strong>{family.label}</strong><span>{family.manufacturer} · família normativa {family.normativeFamily} · largura {family.nominalWidthMm} mm</span><span>fiada {family.courseHeightMm} mm · junta {family.jointThicknessMm} mm · malha básica {family.coordinationGridMm} mm</span><span>{family.units.map((unit) => unit.label).join(" · ")}</span>
      <small>ABNT NBR 6136-1:2026: Classe A ≥ 8 MPa em incrementos de 2 MPa; Classe B entre 4 e 6 MPa em incrementos de 2 MPa; Classe C ≥ 3 MPa em incrementos de 1 MPa.</small>
      {blockClass !== "A" && <small>Piscina enterrada: a utilização abaixo do nível do solo exige Classe A.</small>}
      {Math.abs(geometry.wallThicknessMm - family.nominalWidthMm) > 1 && <small>Espessura incompatível: ajuste a parede para {family.nominalWidthMm} mm ou escolha outra família.</small>}
      {family.status === "catalog" && <small>Catálogo: {family.catalogDocument} · faixa declarada {family.catalogStrengthRangeMPa[0]}–{family.catalogStrengthRangeMPa[1]} MPa. Dimensões internas e aceitação dependem do lote fornecido.</small>}
      {family.status === "draft" && <small>Família acadêmica: os dados resistentes do fabricante ainda precisam ser confirmados.</small>}
    </div>)}</div></fieldset>
    <fieldset><legend>Solo e carregamentos</legend><div className="form-grid">
      <NumberField label="Peso específico do solo saturado" value={input.saturatedSoilUnitWeightKNM3} unit="kN/m³" step={0.1} onChange={(value) => setValue("saturatedSoilUnitWeightKNM3", value)} />
      <NumberField label="Ângulo de atrito" value={input.soilFrictionAngleDegrees} unit="graus" step={0.1} onChange={(value) => setValue("soilFrictionAngleDegrees", value)} />
      <NumberField label="Nível d'água sobre a base mais profunda" value={input.groundwaterHeadAboveSlabBottomMm} unit="mm" onChange={(value) => setValue("groundwaterHeadAboveSlabBottomMm", value)} />
      <NumberField label="Sobrecarga de utilização no fundo" value={input.imposedFloorLoadKPa} unit="kPa" step={0.1} onChange={(value) => setValue("imposedFloorLoadKPa", value)} />
      <NumberField label="Peso específico da alvenaria" value={input.masonryUnitWeightKNM3} unit="kN/m³" step={0.1} onChange={(value) => setValue("masonryUnitWeightKNM3", value)} />
    </div><small>O nível d'água é referenciado à face inferior da laje da zona mais profunda; o motor converte a carga para cada laje.</small></fieldset>
    <details><summary>Parâmetros de detalhamento</summary><div className="form-grid detail-grid">
      <NumberField label="Fator de altura efetiva (hef/h)" value={input.effectiveWallHeightFactor} unit="—" step={0.05} onChange={(value) => setValue("effectiveWallHeightFactor", value)} />
      <NumberField label="Coeficiente de ortogonalidade" value={input.orthogonalityCoefficient} unit="—" step={0.05} onChange={(value) => setValue("orthogonalityCoefficient", value)} />
      <NumberField label="Cobrimento da parede" value={input.reinforcementCoverMm} unit="mm" onChange={(value) => setValue("reinforcementCoverMm", value)} />
      <NumberField label="Diâmetro da barra da parede" value={input.wallBarDiameterMm} unit="mm" step={0.5} onChange={(value) => setValue("wallBarDiameterMm", value)} />
      <NumberField label="Braço de alavanca" value={input.wallLeverArmFactor} unit="—" step={0.05} onChange={(value) => setValue("wallLeverArmFactor", value)} />
      <NumberField label="Resistência à flexão paralela" value={input.flexuralTensileStrengthParallelMPa} unit="MPa" step={0.05} onChange={(value) => setValue("flexuralTensileStrengthParallelMPa", value)} />
      <NumberField label="Resistência à flexão perpendicular" value={input.flexuralTensileStrengthPerpendicularMPa} unit="MPa" step={0.05} onChange={(value) => setValue("flexuralTensileStrengthPerpendicularMPa", value)} />
      <NumberField label="Cobrimento da laje" value={input.slabReinforcementCoverMm} unit="mm" onChange={(value) => setValue("slabReinforcementCoverMm", value)} />
      <NumberField label="Diâmetro da barra da laje" value={input.slabBarDiameterMm} unit="mm" step={0.5} onChange={(value) => setValue("slabBarDiameterMm", value)} />
      <NumberField label="Taxa mínima da laje" value={input.minimumSlabSteelRatio} unit="—" step={0.0001} onChange={(value) => setValue("minimumSlabSteelRatio", value)} />
    </div><small>Para parede sem travamento lateral transversal, engastada na base e livre no topo, o valor inicial é hef/h = 2,0. Degraus usam hef/h = 1,0 e exigem revisão da ligação.</small></details>
  </form>;
}
