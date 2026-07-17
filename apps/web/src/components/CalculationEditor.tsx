import type { Phase1DesignInput } from "@poolstruct/calculation-engine";
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

function NumberField({ label, value, unit, step = 1, min = 0, onChange }: NumberFieldProps) {
  return <label className="number-field"><span>{label}</span><div><input type="number" value={value} min={min} step={step} onChange={(event) => onChange(event.currentTarget.valueAsNumber)} required /><small>{unit}</small></div></label>;
}

export function CalculationEditor({ initialInput, busy, onCalculate }: Props) {
  const [input, setInput] = useState(initialInput);
  useEffect(() => setInput(initialInput), [initialInput]);
  const geometry = input.geometry;
  const setGeometry = (field: keyof Phase1DesignInput["geometry"], value: number) => setInput((current) => ({ ...current, geometry: { ...current.geometry, [field]: value } }));
  const setValue = (field: Exclude<keyof Phase1DesignInput, "geometry">, value: number) => setInput((current) => ({ ...current, [field]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    void onCalculate(input);
  }

  return <form className="editor" onSubmit={submit}>
    <div className="section-title"><div><p className="eyebrow">Propriedades</p><h2>Modelo estrutural</h2></div><button className="primary calculate-button" disabled={busy}>{busy ? "Calculando…" : "Calcular e salvar revisão"}</button></div>
    <fieldset><legend>Geometria da piscina</legend><div className="form-grid">
      <NumberField label="Comprimento interno" value={geometry.internalLengthMm} unit="mm" onChange={(value) => setGeometry("internalLengthMm", value)} />
      <NumberField label="Largura interna" value={geometry.internalWidthMm} unit="mm" onChange={(value) => setGeometry("internalWidthMm", value)} />
      <NumberField label="Lâmina d'água" value={geometry.waterDepthMm} unit="mm" onChange={(value) => setGeometry("waterDepthMm", value)} />
      <NumberField label="Espessura da parede" value={geometry.wallThicknessMm} unit="mm" onChange={(value) => setGeometry("wallThicknessMm", value)} />
      <NumberField label="Espessura da laje" value={geometry.slabThicknessMm} unit="mm" onChange={(value) => setGeometry("slabThicknessMm", value)} />
    </div></fieldset>
    <fieldset><legend>Solo e carregamentos</legend><div className="form-grid">
      <NumberField label="Peso específico do solo saturado" value={input.saturatedSoilUnitWeightKNM3} unit="kN/m³" step={0.1} onChange={(value) => setValue("saturatedSoilUnitWeightKNM3", value)} />
      <NumberField label="Ângulo de atrito" value={input.soilFrictionAngleDegrees} unit="graus" step={0.1} onChange={(value) => setValue("soilFrictionAngleDegrees", value)} />
      <NumberField label="Nível d'água sob a laje" value={input.groundwaterHeadAboveSlabBottomMm} unit="mm" onChange={(value) => setValue("groundwaterHeadAboveSlabBottomMm", value)} />
      <NumberField label="Sobrecarga no fundo" value={input.imposedFloorLoadKPa} unit="kPa" step={0.1} onChange={(value) => setValue("imposedFloorLoadKPa", value)} />
      <NumberField label="Peso específico da alvenaria" value={input.masonryUnitWeightKNM3} unit="kN/m³" step={0.1} onChange={(value) => setValue("masonryUnitWeightKNM3", value)} />
    </div></fieldset>
    <details><summary>Parâmetros de detalhamento</summary><div className="form-grid detail-grid">
      <NumberField label="Fator de altura efetiva" value={input.effectiveWallHeightFactor} unit="—" step={0.05} onChange={(value) => setValue("effectiveWallHeightFactor", value)} />
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
