import {
  DEFAULT_BLOCK_FAMILIES,
  DEFAULT_MASONRY_SPECIFICATION,
  STRUCTURAL_PROFILE_REGISTRY,
  validateConcreteBlockStrength,
  type ConcreteBlockClass,
  type IntegratedDesignInput,
  type PoolDepthZoneInput,
  type PoolDepthZoneKind,
  type SoilMaterial
} from "@poolstruct/calculation-engine";
import { useEffect, useState, type FormEvent } from "react";

interface Props {
  initialInput: IntegratedDesignInput;
  busy: boolean;
  onCalculate(input: IntegratedDesignInput): Promise<void>;
}

interface NumberFieldProps {
  label: string;
  value: number;
  unit: string;
  step?: number;
  min?: number;
  onChange(value: number): void;
}

const DEFAULT_STRENGTH_BY_CLASS: Readonly<Record<ConcreteBlockClass, number>> = { A: 8, B: 4, C: 3 };
const ZONE_KIND_LABEL: Readonly<Record<PoolDepthZoneKind, string>> = {
  SHALLOW: "Prainha / rasa", INTERMEDIATE: "Intermediária", MAIN: "Fundo principal"
};
const SOIL_LABEL: Readonly<Record<SoilMaterial, string>> = {
  SAND: "Areia", SILTY_SAND: "Areia siltosa", SANDY_SILT: "Silte arenoso",
  SILT: "Silte", SANDY_CLAY: "Argila arenosa", CLAY: "Argila"
};

function NumberField({ label, value, unit, step = 1, min = 0, onChange }: NumberFieldProps) {
  return <label className="number-field"><span>{label}</span><div><input type="number" value={value} min={min} step={step} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} required /><small>{unit}</small></div></label>;
}

const legacyZone = (input: IntegratedDesignInput): PoolDepthZoneInput => ({
  id: "main", label: "Fundo principal", kind: "MAIN",
  lengthMm: input.geometry.internalLengthMm, waterDepthMm: input.geometry.waterDepthMm
});

export function CalculationEditor({ initialInput, busy, onCalculate }: Props) {
  const [input, setInput] = useState(initialInput);
  useEffect(() => setInput(initialInput), [initialInput]);
  const geometry = input.geometry;
  const zones = geometry.depthZones && geometry.depthZones.length > 0 ? geometry.depthZones : [legacyZone(input)];
  const masonry = input.masonry ?? DEFAULT_MASONRY_SPECIFICATION;
  const blockClass = masonry.blockClass ?? "A";
  const strengthRule = validateConcreteBlockStrength(blockClass, masonry.blockStrengthMPa).rule;

  const setGeometry = (field: Exclude<keyof IntegratedDesignInput["geometry"], "depthZones" | "waterDepthMm">, value: number) => setInput((current) => {
    if (field !== "internalLengthMm") return { ...current, geometry: { ...current.geometry, [field]: value } };
    const currentZones = current.geometry.depthZones && current.geometry.depthZones.length > 0 ? [...current.geometry.depthZones] : [legacyZone(current)];
    const lastIndex = currentZones.length - 1;
    const delta = value - current.geometry.internalLengthMm;
    const last = currentZones[lastIndex];
    if (last) currentZones[lastIndex] = { ...last, lengthMm: Math.max(100, last.lengthMm + delta) };
    return { ...current, geometry: { ...current.geometry, internalLengthMm: currentZones.reduce((sum, zone) => sum + zone.lengthMm, 0), depthZones: currentZones } };
  });
  const setDepthZones = (nextZones: readonly PoolDepthZoneInput[]) => setInput((current) => ({
    ...current,
    geometry: {
      ...current.geometry,
      internalLengthMm: nextZones.reduce((sum, zone) => sum + zone.lengthMm, 0),
      waterDepthMm: Math.max(...nextZones.map((zone) => zone.waterDepthMm)),
      depthZones: nextZones
    }
  }));
  const updateZone = (index: number, patch: Partial<PoolDepthZoneInput>) => setDepthZones(zones.map((zone, zoneIndex) => zoneIndex === index ? { ...zone, ...patch } : zone));
  const addZone = () => {
    const current = [...zones];
    const sourceIndex = current.length - 1;
    const source = current[sourceIndex];
    if (!source || source.lengthMm < 400) return;
    const insertedLength = Math.max(200, Math.floor(source.lengthMm / 3 / 100) * 100);
    current[sourceIndex] = { ...source, kind: "MAIN", label: source.kind === "MAIN" ? source.label : "Fundo principal", lengthMm: source.lengthMm - insertedLength };
    current.splice(sourceIndex, 0, {
      id: `zone-${Date.now()}`, label: current.length === 1 ? "Prainha" : `Trecho ${current.length}`,
      kind: current.length === 1 ? "SHALLOW" : "INTERMEDIATE", lengthMm: insertedLength,
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
  const setValue = (field: Exclude<keyof IntegratedDesignInput, "geometry" | "masonry" | "geotechnical" | "masonryMaterials" | "structuralProfileId">, value: number) => setInput((current) => ({ ...current, [field]: value }));
  const setMasonry = (field: keyof typeof masonry, value: string | number) => setInput((current) => ({ ...current, masonry: { ...(current.masonry ?? DEFAULT_MASONRY_SPECIFICATION), [field]: value } }));
  const setBlockClass = (nextClass: ConcreteBlockClass) => setInput((current) => {
    const currentMasonry = current.masonry ?? DEFAULT_MASONRY_SPECIFICATION;
    return { ...current, masonry: { ...currentMasonry, blockClass: nextClass, blockStrengthMPa: validateConcreteBlockStrength(nextClass, currentMasonry.blockStrengthMPa).valid ? currentMasonry.blockStrengthMPa : DEFAULT_STRENGTH_BY_CLASS[nextClass] } };
  });
  const setGeo = (field: Exclude<keyof IntegratedDesignInput["geotechnical"], "layers">, value: number) => setInput((current) => ({ ...current, geotechnical: { ...current.geotechnical, [field]: value } }));
  const updateLayer = (index: number, patch: Partial<IntegratedDesignInput["geotechnical"]["layers"][number]>) => setInput((current) => ({
    ...current,
    geotechnical: { ...current.geotechnical, layers: current.geotechnical.layers.map((layer, layerIndex) => layerIndex === index ? { ...layer, ...patch } : layer) }
  }));
  const addLayer = () => setInput((current) => {
    const layers = [...current.geotechnical.layers];
    const previous = layers.at(-1);
    const topDepthMm = previous?.bottomDepthMm ?? 0;
    layers.push({ id: `layer-${Date.now()}`, label: `Camada ${layers.length + 1}`, topDepthMm, bottomDepthMm: topDepthMm + 3000, nspt: 10, material: "SILTY_SAND" });
    return { ...current, geotechnical: { ...current.geotechnical, layers } };
  });
  const removeLayer = (index: number) => setInput((current) => ({ ...current, geotechnical: { ...current.geotechnical, layers: current.geotechnical.layers.filter((_, layerIndex) => layerIndex !== index) } }));
  const setMaterial = (field: keyof IntegratedDesignInput["masonryMaterials"], value: string | number) => setInput((current) => ({ ...current, masonryMaterials: { ...current.masonryMaterials, [field]: value } }));

  function submit(event: FormEvent) { event.preventDefault(); void onCalculate(input); }

  return <form className="editor" onSubmit={submit}>
    <div className="section-title"><div><p className="eyebrow">Propriedades</p><h2>Modelo integrado</h2></div><button className="primary calculate-button" disabled={busy}>{busy ? "Calculando…" : "Calcular e salvar revisão"}</button></div>

    <fieldset><legend>Perfil normativo</legend><label className="select-field"><span>Perfil estrutural</span><select value={input.structuralProfileId} onChange={(event) => setInput((current) => ({ ...current, structuralProfileId: event.currentTarget.value }))}>
      {STRUCTURAL_PROFILE_REGISTRY.map((profile) => <option key={profile.id} value={profile.id}>{profile.sourceKind === "normative" ? "Normativo" : "Acadêmico"} · {profile.id} v{profile.version}</option>)}
    </select></label></fieldset>

    <fieldset><legend>Geometria da piscina</legend><div className="form-grid">
      <NumberField label="Comprimento interno" value={geometry.internalLengthMm} unit="mm" min={100} onChange={(value) => setGeometry("internalLengthMm", value)} />
      <NumberField label="Largura interna" value={geometry.internalWidthMm} unit="mm" onChange={(value) => setGeometry("internalWidthMm", value)} />
      <label className="number-field"><span>Profundidade máxima</span><div><input type="number" value={geometry.waterDepthMm} readOnly /><small>mm</small></div></label>
      <NumberField label="Espessura da parede" value={geometry.wallThicknessMm} unit="mm" onChange={(value) => setGeometry("wallThicknessMm", value)} />
      <NumberField label="Espessura da laje" value={geometry.slabThicknessMm} unit="mm" onChange={(value) => setGeometry("slabThicknessMm", value)} />
    </div>
    <div className="depth-zones-editor"><div className="section-title"><div><p className="eyebrow">Perfil longitudinal</p><h3>Zonas de profundidade</h3></div><button type="button" className="secondary" onClick={addZone}>Adicionar zona</button></div>
      {zones.map((zone, index) => <article className="depth-zone-card" key={zone.id}><header><strong>Z{index + 1}</strong><span>{ZONE_KIND_LABEL[zone.kind]}</span>{zones.length > 1 && <button type="button" className="text-button" onClick={() => removeZone(index)}>Remover</button>}</header><div className="form-grid">
        <label className="select-field"><span>Tipo</span><select value={zone.kind} onChange={(event) => updateZone(index, { kind: event.currentTarget.value as PoolDepthZoneKind })}><option value="SHALLOW">Prainha / rasa</option><option value="INTERMEDIATE">Intermediária</option><option value="MAIN">Fundo principal</option></select></label>
        <label className="number-field"><span>Nome</span><div><input type="text" value={zone.label} onChange={(event) => updateZone(index, { label: event.currentTarget.value })} required /></div></label>
        <NumberField label="Comprimento" value={zone.lengthMm} unit="mm" min={100} onChange={(value) => updateZone(index, { lengthMm: value })} />
        <NumberField label="Profundidade d'água" value={zone.waterDepthMm} unit="mm" min={100} onChange={(value) => updateZone(index, { waterDepthMm: value })} />
      </div></article>)}
    </div></fieldset>

    <fieldset><legend>Perfil SPT e flutuação</legend><div className="form-grid">
      <NumberField label="Profundidade do nível d'água" value={input.geotechnical.groundLevelToWaterLevelMm} unit="mm" onChange={(value) => setGeo("groundLevelToWaterLevelMm", value)} />
      <NumberField label="Cota do fundo da escavação" value={input.geotechnical.excavationBottomDepthMm} unit="mm" min={100} onChange={(value) => setGeo("excavationBottomDepthMm", value)} />
      <NumberField label="Cobertura permanente de solo" value={input.geotechnical.permanentSoilCoverThicknessMm} unit="mm" onChange={(value) => setGeo("permanentSoilCoverThicknessMm", value)} />
      <NumberField label="Peso específico da cobertura" value={input.geotechnical.permanentSoilCoverUnitWeightKNM3} unit="kN/m³" step={0.1} onChange={(value) => setGeo("permanentSoilCoverUnitWeightKNM3", value)} />
      <NumberField label="Lastro permanente adicional" value={input.geotechnical.additionalPermanentBallastKN} unit="kN" step={0.1} onChange={(value) => setGeo("additionalPermanentBallastKN", value)} />
      <NumberField label="FS mínimo à flutuação" value={input.geotechnical.flotationSafetyFactor} unit="—" step={0.05} min={1} onChange={(value) => setGeo("flotationSafetyFactor", value)} />
    </div>
    <div className="depth-zones-editor"><div className="section-title"><div><p className="eyebrow">Sondagem</p><h3>Camadas do solo</h3></div><button type="button" className="secondary" onClick={addLayer}>Adicionar camada</button></div>
      {input.geotechnical.layers.map((layer, index) => <article className="depth-zone-card" key={layer.id}><header><strong>S{index + 1}</strong><span>{SOIL_LABEL[layer.material]}</span>{input.geotechnical.layers.length > 1 && <button type="button" className="text-button" onClick={() => removeLayer(index)}>Remover</button>}</header><div className="form-grid">
        <label className="number-field"><span>Nome</span><div><input type="text" value={layer.label} onChange={(event) => updateLayer(index, { label: event.currentTarget.value })} required /></div></label>
        <label className="select-field"><span>Material</span><select value={layer.material} onChange={(event) => updateLayer(index, { material: event.currentTarget.value as SoilMaterial })}>{Object.entries(SOIL_LABEL).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <NumberField label="Cota inicial" value={layer.topDepthMm} unit="mm" onChange={(value) => updateLayer(index, { topDepthMm: value })} />
        <NumberField label="Cota final" value={layer.bottomDepthMm} unit="mm" min={100} onChange={(value) => updateLayer(index, { bottomDepthMm: value })} />
        <NumberField label="NSPT" value={layer.nspt} unit="golpes" min={1} onChange={(value) => updateLayer(index, { nspt: value })} />
      </div></article>)}
    </div></fieldset>

    <fieldset><legend>Alvenaria, argamassa, graute e prisma</legend><div className="block-specification">
      <label className="select-field"><span>Família de blocos</span><select value={masonry.blockFamilyId} onChange={(event) => setMasonry("blockFamilyId", event.currentTarget.value)}>{DEFAULT_BLOCK_FAMILIES.map((family) => <option value={family.id} key={family.id}>{family.label}</option>)}</select></label>
      <label className="select-field"><span>Classe do bloco</span><select value={blockClass} onChange={(event) => setBlockClass(event.currentTarget.value as ConcreteBlockClass)}><option value="A">Classe A</option><option value="B">Classe B</option><option value="C">Classe C</option></select></label>
      <NumberField label="fbk especificado" value={masonry.blockStrengthMPa} unit="MPa" step={strengthRule.incrementMPa} min={strengthRule.minimumMPa} onChange={(value) => setMasonry("blockStrengthMPa", value)} />
      <NumberField label="Graute vertical" value={masonry.verticalGroutSpacingMm} unit="mm" step={50} min={100} onChange={(value) => setMasonry("verticalGroutSpacingMm", value)} />
      <NumberField label="Cinta intermediária" value={masonry.bondBeamCourseSpacing} unit="fiadas" min={0} onChange={(value) => setMasonry("bondBeamCourseSpacing", value)} />
      <NumberField label="Resistência da argamassa" value={input.masonryMaterials.mortarCompressiveStrengthMPa} unit="MPa" step={0.1} onChange={(value) => setMaterial("mortarCompressiveStrengthMPa", value)} />
      <NumberField label="Resistência do graute" value={input.masonryMaterials.groutCompressiveStrengthMPa} unit="MPa" step={0.1} onChange={(value) => setMaterial("groutCompressiveStrengthMPa", value)} />
      <NumberField label="Resistência do prisma" value={input.masonryMaterials.prismCharacteristicStrengthMPa} unit="MPa" step={0.1} onChange={(value) => setMaterial("prismCharacteristicStrengthMPa", value)} />
      <NumberField label="Junta de argamassa" value={input.masonryMaterials.mortarJointThicknessMm ?? 10} unit="mm" step={0.5} onChange={(value) => setMaterial("mortarJointThicknessMm", value)} />
      <label className="select-field"><span>Origem dos parâmetros</span><select value={input.masonryMaterials.source} onChange={(event) => setMaterial("source", event.currentTarget.value)}><option value="TEST_REPORT">Relatório de ensaio</option><option value="SUPPLIER_DECLARATION">Declaração do fornecedor</option><option value="ACADEMIC_ESTIMATE">Estimativa acadêmica</option></select></label>
    </div></fieldset>

    <fieldset><legend>Carregamentos e parâmetros legados</legend><div className="form-grid">
      <NumberField label="Sobrecarga de utilização no fundo" value={input.imposedFloorLoadKPa} unit="kPa" step={0.1} onChange={(value) => setValue("imposedFloorLoadKPa", value)} />
      <NumberField label="Peso específico da alvenaria" value={input.masonryUnitWeightKNM3} unit="kN/m³" step={0.1} onChange={(value) => setValue("masonryUnitWeightKNM3", value)} />
    </div><small>O peso específico, o atrito e o nível d'água usados no cálculo são realimentados automaticamente pelo perfil geotécnico.</small></fieldset>

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
    </div></details>
  </form>;
}
