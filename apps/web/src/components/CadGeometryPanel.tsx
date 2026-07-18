import {
  calibrateCadGeometry,
  createEmptyCadGeometryDocument,
  isCadPointInsideBoundary,
  measureCadGeometry,
  setCadLongitudinalAxis,
  validateCadGeometry,
  type CadDepthPosition,
  type CadGeometryDocument,
  type CadPath,
  type CadPathCurve,
  type CadPathRole,
  type CadPoint,
  type PoolDepthZoneInput
} from "@poolstruct/calculation-engine";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import { cadPathSvgData, downloadCadGeometryDxf, saveCadDraft } from "../lib/cad";

interface Props {
  readonly ownerId: string;
  readonly projectId: string;
  readonly projectName: string;
  readonly document: CadGeometryDocument;
  readonly zones: readonly PoolDepthZoneInput[];
  readonly baseRevisionId: string | null;
  readonly baseInputHash: string | null;
  readonly onChange: (document: CadGeometryDocument) => void;
  readonly onApplyEnvelope: (geometry: {
    lengthMm: number;
    widthMm: number;
    zoneDepths: readonly {
      zoneId: string;
      position: CadDepthPosition;
      depthMm: number;
    }[];
  }) => void;
}

type CadTool =
  | "SELECT"
  | "CALIBRATE"
  | "AXIS"
  | "BOUNDARY_LINE"
  | "BOUNDARY_CURVE"
  | "BREAKLINE_LINE"
  | "BREAKLINE_CURVE"
  | "DEPTH";

interface DragTarget {
  readonly pathId: string;
  readonly pointIndex: number;
  readonly pointerId: number;
}

const TOOL_LABEL: Readonly<Record<CadTool, string>> = {
  SELECT: "Selecionar",
  CALIBRATE: "Calibrar",
  AXIS: "Eixo longitudinal",
  BOUNDARY_LINE: "Contorno reto",
  BOUNDARY_CURVE: "Contorno curvo",
  BREAKLINE_LINE: "Quebra reta",
  BREAKLINE_CURVE: "Quebra curva",
  DEPTH: "Profundidade"
};

const DEPTH_POSITION_LABEL: Readonly<Record<CadDepthPosition, string>> = {
  UNIFORM: "Zona horizontal",
  START: "Início da zona",
  END: "Fim da zona"
};

const DRAWING_TOOLS: readonly CadTool[] = [
  "BOUNDARY_LINE",
  "BOUNDARY_CURVE",
  "BREAKLINE_LINE",
  "BREAKLINE_CURVE"
];

const isDrawingTool = (tool: CadTool): boolean => DRAWING_TOOLS.includes(tool);
const pathRole = (tool: CadTool): CadPathRole => tool.startsWith("BOUNDARY") ? "BOUNDARY" : "BREAKLINE";
const pathCurve = (tool: CadTool): CadPathCurve => tool.endsWith("CURVE") ? "SMOOTH" : "POLYLINE";
const format = (value: number | null, digits = 2): string => value === null
  ? "—"
  : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(value);

const isFormTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));

export function CadGeometryPanel({
  ownerId,
  projectId,
  projectName,
  document: model,
  zones,
  baseRevisionId,
  baseInputHash,
  onChange,
  onApplyEnvelope
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backgroundUrlRef = useRef<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [tool, setTool] = useState<CadTool>("SELECT");
  const [draftPoints, setDraftPoints] = useState<CadPoint[]>([]);
  const [calibrationPoints, setCalibrationPoints] = useState<CadPoint[]>([]);
  const [axisPoints, setAxisPoints] = useState<CadPoint[]>([]);
  const [knownDistanceMm, setKnownDistanceMm] = useState(10_000);
  const [depthMm, setDepthMm] = useState(1_400);
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0]?.id ?? "");
  const [depthPosition, setDepthPosition] = useState<CadDepthPosition>("UNIFORM");
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [selectedDepthId, setSelectedDepthId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const [zoom, setZoom] = useState(1);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [backgroundMime, setBackgroundMime] = useState<string | null>(null);
  const [notice, setNotice] = useState("Importe a planta e calibre uma medida conhecida antes de desenhar.");
  const measurements = useMemo(() => measureCadGeometry(model), [model]);
  const validationErrors = useMemo(() => validateCadGeometry(model), [model]);
  const selectedPath = model.paths.find((path) => path.id === selectedPathId) ?? null;
  const boundaryCount = model.paths.filter((path) => path.role === "BOUNDARY").length;

  useEffect(() => {
    if (zones.length === 0) {
      setSelectedZoneId("");
      return;
    }
    if (!zones.some((zone) => zone.id === selectedZoneId)) setSelectedZoneId(zones[0]!.id);
  }, [selectedZoneId, zones]);

  useEffect(() => {
    const saved = saveCadDraft(ownerId, projectId, model, { baseRevisionId, baseInputHash });
    if (!saved) setNotice("Não foi possível salvar o rascunho CAD neste navegador. Exporte o DXF antes de sair.");
  }, [baseInputHash, baseRevisionId, model, ownerId, projectId]);

  useEffect(() => () => {
    if (backgroundUrlRef.current) URL.revokeObjectURL(backgroundUrlRef.current);
  }, []);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (isFormTarget(event.target)) return;
      if (event.key === "Escape") {
        setDraftPoints([]);
        setCalibrationPoints([]);
        setAxisPoints([]);
        setSelectedPathId(null);
        setSelectedDepthId(null);
      }
      if ((event.key === "Delete" || event.key === "Backspace") && (selectedPathId || selectedDepthId)) {
        event.preventDefault();
        deleteSelection();
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  });

  function update(next: CadGeometryDocument) {
    onChange(next);
  }

  function pointFromClient(clientX: number, clientY: number): CadPoint {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(model.canvasWidth, (clientX - rect.left) * model.canvasWidth / rect.width)),
      y: Math.max(0, Math.min(model.canvasHeight, (clientY - rect.top) * model.canvasHeight / rect.height))
    };
  }

  function handleCanvasClick(event: ReactMouseEvent<SVGSVGElement>) {
    if (dragTarget) return;
    const nextPoint = pointFromClient(event.clientX, event.clientY);
    setSelectedPathId(null);
    setSelectedDepthId(null);

    if (tool === "CALIBRATE") {
      const next = [...calibrationPoints, nextPoint];
      if (next.length === 1) {
        setCalibrationPoints(next);
        setNotice("Clique no segundo ponto da medida conhecida.");
        return;
      }
      try {
        update(calibrateCadGeometry(model, next[0]!, next[1]!, knownDistanceMm));
        setNotice(`Escala calibrada: ${knownDistanceMm.toFixed(0)} mm.`);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Não foi possível calibrar o desenho.");
      }
      setCalibrationPoints([]);
      setTool("SELECT");
      return;
    }

    if (tool === "AXIS") {
      const next = [...axisPoints, nextPoint];
      if (next.length === 1) {
        setAxisPoints(next);
        setNotice("Clique no segundo ponto, no sentido longitudinal da piscina.");
        return;
      }
      try {
        update(setCadLongitudinalAxis(model, next[0]!, next[1]!));
        setNotice("Eixo longitudinal definido. O comprimento e a largura agora são medidos nesse sistema.");
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Não foi possível definir o eixo longitudinal.");
      }
      setAxisPoints([]);
      setTool("SELECT");
      return;
    }

    if (tool === "DEPTH") {
      if (boundaryCount !== 1) {
        setNotice("Conclua um único contorno externo antes de inserir profundidades.");
        return;
      }
      if (!isCadPointInsideBoundary(model, nextPoint)) {
        setNotice("A cota de profundidade deve ser inserida dentro do contorno da piscina.");
        return;
      }
      const zone = zones.find((item) => item.id === selectedZoneId);
      if (!zone) {
        setNotice("Selecione a zona paramétrica correspondente a esta cota.");
        return;
      }
      const index = model.depthMarkers.length + 1;
      update({
        ...model,
        version: "cad-2d-1.1.0",
        depthMarkers: [...model.depthMarkers, {
          id: crypto.randomUUID(),
          label: `Cota ${index} · ${zone.label}`,
          point: nextPoint,
          depthMm,
          zoneId: zone.id,
          zonePosition: depthPosition
        }]
      });
      setNotice(`${zone.label}: profundidade de ${depthMm.toFixed(0)} mm vinculada a “${DEPTH_POSITION_LABEL[depthPosition]}”.`);
      return;
    }

    if (isDrawingTool(tool)) setDraftPoints((current) => [...current, nextPoint]);
  }

  function finishPath() {
    if (!isDrawingTool(tool)) return;
    const role = pathRole(tool);
    if (role === "BOUNDARY" && boundaryCount > 0) {
      setNotice("Esta fase aceita um único contorno externo. Use linhas de quebra para praia, degrau e regiões internas.");
      setDraftPoints([]);
      setTool("SELECT");
      return;
    }
    const minimum = role === "BOUNDARY" ? 3 : 2;
    if (draftPoints.length < minimum) {
      setNotice(role === "BOUNDARY"
        ? "O contorno precisa de pelo menos três pontos."
        : "A linha de quebra precisa de pelo menos dois pontos.");
      return;
    }
    const count = model.paths.filter((path) => path.role === role).length + 1;
    const path: CadPath = {
      id: crypto.randomUUID(),
      label: role === "BOUNDARY" ? `Contorno ${count}` : `Linha de quebra ${count}`,
      role,
      curve: pathCurve(tool),
      closed: role === "BOUNDARY",
      points: draftPoints
    };
    const nextDocument: CadGeometryDocument = {
      ...model,
      version: "cad-2d-1.1.0",
      paths: [...model.paths, path]
    };
    const errors = validateCadGeometry(nextDocument);
    if (errors.length > 0) {
      setNotice(errors[0]!);
      return;
    }
    update(nextDocument);
    setDraftPoints([]);
    setSelectedPathId(path.id);
    setTool("SELECT");
    setNotice(`${path.label} concluído. Arraste os nós para ajustar.`);
  }

  function deleteSelection() {
    if (selectedPathId) {
      update({ ...model, paths: model.paths.filter((path) => path.id !== selectedPathId) });
      setSelectedPathId(null);
      setNotice("Caminho excluído.");
      return;
    }
    if (selectedDepthId) {
      update({ ...model, depthMarkers: model.depthMarkers.filter((marker) => marker.id !== selectedDepthId) });
      setSelectedDepthId(null);
      setNotice("Cota de profundidade excluída.");
    }
  }

  function movePathPoint(pathId: string, pointIndex: number, nextPoint: CadPoint) {
    update({
      ...model,
      paths: model.paths.map((path) => path.id === pathId
        ? { ...path, points: path.points.map((point, index) => index === pointIndex ? nextPoint : point) }
        : path)
    });
  }

  function handlePointPointerDown(
    event: ReactPointerEvent<SVGCircleElement>,
    pathId: string,
    pointIndex: number
  ) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragTarget({ pathId, pointIndex, pointerId: event.pointerId });
  }

  function handlePointPointerMove(event: ReactPointerEvent<SVGCircleElement>) {
    if (!dragTarget || dragTarget.pointerId !== event.pointerId) return;
    movePathPoint(dragTarget.pathId, dragTarget.pointIndex, pointFromClient(event.clientX, event.clientY));
  }

  function handlePointPointerUp(event: ReactPointerEvent<SVGCircleElement>) {
    if (dragTarget?.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragTarget(null);
  }

  function chooseTool(nextTool: CadTool) {
    if ((nextTool === "BOUNDARY_LINE" || nextTool === "BOUNDARY_CURVE") && boundaryCount > 0) {
      setNotice("Já existe um contorno externo. Edite seus nós ou exclua-o antes de criar outro.");
      return;
    }
    setTool(nextTool);
    setDraftPoints([]);
    setCalibrationPoints([]);
    setAxisPoints([]);
    setSelectedPathId(null);
    setSelectedDepthId(null);
    setNotice(nextTool === "CALIBRATE"
      ? "Clique nos dois extremos da medida conhecida."
      : nextTool === "AXIS"
        ? "Clique em dois pontos no sentido longitudinal da piscina."
        : `${TOOL_LABEL[nextTool]} ativo.`);
  }

  function importBackground(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (backgroundUrlRef.current) URL.revokeObjectURL(backgroundUrlRef.current);
    const url = URL.createObjectURL(file);
    backgroundUrlRef.current = url;
    setBackgroundUrl(url);
    setBackgroundMime(file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/*"));
    update({
      ...model,
      version: "cad-2d-1.1.0",
      background: {
        fileName: file.name,
        mimeType: file.type || "application/pdf",
        page: 1,
        opacity: model.background?.opacity ?? 0.72
      }
    });
    setNotice(`${file.name} carregado como fundo local. Agora calibre a escala.`);
  }

  function setBackgroundOpacity(opacity: number) {
    if (!model.background) return;
    update({ ...model, background: { ...model.background, opacity } });
  }

  function removeBackground() {
    if (backgroundUrlRef.current) URL.revokeObjectURL(backgroundUrlRef.current);
    backgroundUrlRef.current = null;
    setBackgroundUrl(null);
    setBackgroundMime(null);
    const { background: _background, ...rest } = model;
    update(rest);
  }

  function clearGeometry() {
    if (!window.confirm("Limpar contorno, linhas de quebra, cotas, eixo e calibração deste desenho?")) return;
    const empty = createEmptyCadGeometryDocument();
    update(model.background ? { ...empty, background: model.background } : empty);
    setDraftPoints([]);
    setCalibrationPoints([]);
    setAxisPoints([]);
    setSelectedPathId(null);
    setSelectedDepthId(null);
    setNotice("Geometria CAD limpa.");
  }

  function exportDxf() {
    try {
      downloadCadGeometryDxf(model, projectName);
      setNotice("DXF exportado em milímetros.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível exportar o DXF.");
    }
  }

  function applyEnvelope() {
    if (!measurements.longitudinalLengthMm || !measurements.transverseWidthMm) {
      setNotice("Calibre, conclua o contorno e defina o eixo longitudinal antes de aplicar as medidas.");
      return;
    }
    if (validationErrors.length > 0) {
      setNotice(validationErrors[0]!);
      return;
    }
    const associated = model.depthMarkers.flatMap((marker) => marker.zoneId && marker.zonePosition
      ? [{ zoneId: marker.zoneId, position: marker.zonePosition, depthMm: marker.depthMm }]
      : []);
    const legacySingleZone = associated.length === 0 && zones.length === 1 && measurements.maximumDepthMm !== null
      ? [{ zoneId: zones[0]!.id, position: "UNIFORM" as const, depthMm: measurements.maximumDepthMm }]
      : [];
    onApplyEnvelope({
      lengthMm: measurements.longitudinalLengthMm,
      widthMm: measurements.transverseWidthMm,
      zoneDepths: [...associated, ...legacySingleZone]
    });
    setNotice("Dimensões orientadas e cotas vinculadas aplicadas ao modelo paramétrico. Confira as zonas antes de calcular.");
  }

  const draftCurve: CadPathCurve = isDrawingTool(tool) ? pathCurve(tool) : "POLYLINE";
  const draftClosed = isDrawingTool(tool) && pathRole(tool) === "BOUNDARY";
  const cursor = tool === "SELECT" ? "default" : tool === "DEPTH" ? "crosshair" : "cell";

  return <section className="cad-panel">
    <header className="cad-header">
      <div><p className="eyebrow">Geometria vetorial</p><h2>CAD 2D da piscina</h2></div>
      <div className="cad-header-actions">
        <span className={measurements.calibrated ? "cad-badge calibrated" : "cad-badge"}>
          {measurements.calibrated ? "CALIBRADO" : "SEM ESCALA"}
        </span>
        <span className={measurements.axisDefined ? "cad-badge calibrated" : "cad-badge"}>
          {measurements.axisDefined ? "EIXO DEFINIDO" : "SEM EIXO"}
        </span>
        <button type="button" className="secondary" onClick={() => setExpanded((current) => !current)}>
          {expanded ? "Recolher" : "Abrir CAD"}
        </button>
      </div>
    </header>
    {expanded && <>
      <div className="cad-toolbar" role="toolbar" aria-label="Ferramentas CAD 2D">
        <input ref={fileInputRef} className="cad-file-input" type="file" accept="application/pdf,image/*" onChange={importBackground} />
        <button type="button" className="secondary" onClick={() => fileInputRef.current?.click()}>Importar PDF/imagem</button>
        {(Object.keys(TOOL_LABEL) as CadTool[]).map((item) => <button
          key={item}
          type="button"
          className={tool === item ? "cad-tool active" : "cad-tool"}
          aria-pressed={tool === item}
          onClick={() => chooseTool(item)}
        >{TOOL_LABEL[item]}</button>)}
        <button type="button" className="cad-tool" disabled={!isDrawingTool(tool)} onClick={finishPath}>Finalizar</button>
        <button type="button" className="cad-tool" disabled={draftPoints.length === 0} onClick={() => setDraftPoints((points) => points.slice(0, -1))}>Desfazer ponto</button>
        <button type="button" className="cad-tool danger" disabled={!selectedPathId && !selectedDepthId} onClick={deleteSelection}>Excluir</button>
      </div>
      <div className="cad-settings">
        <label>Medida real <span><input aria-label="Distância real de calibração mm" type="number" min="1" value={knownDistanceMm} onChange={(event) => setKnownDistanceMm(event.currentTarget.valueAsNumber)} /> mm</span></label>
        <label>Profundidade <span><input aria-label="Profundidade a inserir mm" type="number" min="0" value={depthMm} onChange={(event) => setDepthMm(event.currentTarget.valueAsNumber)} /> mm</span></label>
        <label>Zona <select aria-label="Zona da profundidade" value={selectedZoneId} onChange={(event) => setSelectedZoneId(event.currentTarget.value)}>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.label}</option>)}</select></label>
        <label>Posição <select aria-label="Posição da profundidade" value={depthPosition} onChange={(event) => setDepthPosition(event.currentTarget.value as CadDepthPosition)}>{(Object.keys(DEPTH_POSITION_LABEL) as CadDepthPosition[]).map((position) => <option key={position} value={position}>{DEPTH_POSITION_LABEL[position]}</option>)}</select></label>
        <label>Zoom <span><input aria-label="Zoom do CAD" type="range" min="0.5" max="2.5" step="0.1" value={zoom} onChange={(event) => setZoom(event.currentTarget.valueAsNumber)} /> {Math.round(zoom * 100)}%</span></label>
        <label>Fundo <span><input aria-label="Opacidade do fundo" type="range" min="0.15" max="1" step="0.05" disabled={!model.background} value={model.background?.opacity ?? 0.72} onChange={(event) => setBackgroundOpacity(event.currentTarget.valueAsNumber)} /></span></label>
        {model.background && <button type="button" className="text-button" onClick={removeBackground}>Remover fundo</button>}
      </div>
      {model.background && !backgroundUrl && <p className="cad-background-warning">
        A referência “{model.background.fileName}” foi salva, mas o arquivo não é enviado ao banco. Reimporte-o nesta sessão para vê-lo ao fundo.
      </p>}
      {validationErrors.length > 0 && <div className="cad-validation" role="alert"><strong>Corrija a geometria antes de aplicar ou exportar:</strong><ul>{validationErrors.map((message) => <li key={message}>{message}</li>)}</ul></div>}
      <div className="cad-viewport">
        <div className="cad-sheet" style={{ width: model.canvasWidth * zoom, height: model.canvasHeight * zoom }}>
          {backgroundUrl && backgroundMime?.includes("pdf") && <object
            className="cad-background"
            style={{ opacity: model.background?.opacity ?? 0.72 }}
            data={`${backgroundUrl}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
            type="application/pdf"
            aria-label="PDF de fundo"
          />}
          {backgroundUrl && !backgroundMime?.includes("pdf") && <img
            className="cad-background"
            style={{ opacity: model.background?.opacity ?? 0.72 }}
            src={backgroundUrl}
            alt="Planta de fundo"
          />}
          <svg
            ref={svgRef}
            className="cad-canvas"
            viewBox={`0 0 ${model.canvasWidth} ${model.canvasHeight}`}
            style={{ cursor }}
            onClick={handleCanvasClick}
            aria-label="Prancheta CAD 2D"
          >
            <defs><pattern id="cad-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.45" /></pattern></defs>
            <rect width={model.canvasWidth} height={model.canvasHeight} className="cad-grid" />
            {model.paths.map((path) => <g key={path.id}>
              <path d={cadPathSvgData(path)} className={`cad-path ${path.role.toLowerCase()} ${selectedPathId === path.id ? "selected" : ""}`} />
              <path d={cadPathSvgData(path)} className="cad-path-hit" onClick={(event) => {
                event.stopPropagation();
                setSelectedPathId(path.id);
                setSelectedDepthId(null);
                setTool("SELECT");
              }} />
            </g>)}
            {draftPoints.length > 0 && <path
              d={cadPathSvgData({ points: draftPoints, curve: draftCurve, closed: draftClosed })}
              className="cad-path draft"
            />}
            {model.depthMarkers.map((marker) => <g
              key={marker.id}
              className={selectedDepthId === marker.id ? "cad-depth selected" : "cad-depth"}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedDepthId(marker.id);
                setSelectedPathId(null);
                setTool("SELECT");
              }}
            >
              <circle cx={marker.point.x} cy={marker.point.y} r="6" />
              <path d={`M ${marker.point.x - 10} ${marker.point.y} H ${marker.point.x + 10} M ${marker.point.x} ${marker.point.y - 10} V ${marker.point.y + 10}`} />
              <text x={marker.point.x + 12} y={marker.point.y - 8}>{marker.label} · -{(marker.depthMm / 1000).toFixed(2)} m</text>
            </g>)}
            {model.calibration && <g className="cad-calibration">
              <line x1={model.calibration.pointA.x} y1={model.calibration.pointA.y} x2={model.calibration.pointB.x} y2={model.calibration.pointB.y} />
              <circle cx={model.calibration.pointA.x} cy={model.calibration.pointA.y} r="5" />
              <circle cx={model.calibration.pointB.x} cy={model.calibration.pointB.y} r="5" />
              <text x={(model.calibration.pointA.x + model.calibration.pointB.x) / 2} y={(model.calibration.pointA.y + model.calibration.pointB.y) / 2 - 8}>{model.calibration.knownDistanceMm.toFixed(0)} mm</text>
            </g>}
            {model.longitudinalAxis && <g className="cad-axis">
              <line x1={model.longitudinalAxis.pointA.x} y1={model.longitudinalAxis.pointA.y} x2={model.longitudinalAxis.pointB.x} y2={model.longitudinalAxis.pointB.y} />
              <circle cx={model.longitudinalAxis.pointA.x} cy={model.longitudinalAxis.pointA.y} r="5" />
              <circle cx={model.longitudinalAxis.pointB.x} cy={model.longitudinalAxis.pointB.y} r="5" />
              <text x={(model.longitudinalAxis.pointA.x + model.longitudinalAxis.pointB.x) / 2} y={(model.longitudinalAxis.pointA.y + model.longitudinalAxis.pointB.y) / 2 - 8}>EIXO LONGITUDINAL</text>
            </g>}
            {calibrationPoints.map((calibrationPoint, index) => <circle key={`cal-${index}`} className="cad-calibration-point" cx={calibrationPoint.x} cy={calibrationPoint.y} r="6" />)}
            {axisPoints.map((axisPoint, index) => <circle key={`axis-${index}`} className="cad-axis-point" cx={axisPoint.x} cy={axisPoint.y} r="6" />)}
            {selectedPath?.points.map((pathPoint, index) => <circle
              key={index}
              className="cad-node"
              cx={pathPoint.x}
              cy={pathPoint.y}
              r="7"
              onPointerDown={(event) => handlePointPointerDown(event, selectedPath.id, index)}
              onPointerMove={handlePointPointerMove}
              onPointerUp={handlePointPointerUp}
            />)}
          </svg>
        </div>
      </div>
      <div className="cad-footer">
        <div className="cad-metrics">
          <article><small>Área interna</small><strong>{format(measurements.boundaryAreaM2)} m²</strong></article>
          <article><small>Perímetro</small><strong>{format(measurements.boundaryPerimeterM)} m</strong></article>
          <article><small>Linhas de quebra</small><strong>{format(measurements.breaklineLengthM)} m</strong></article>
          <article><small>Comprimento × largura</small><strong>{format(measurements.longitudinalLengthMm, 0)} × {format(measurements.transverseWidthMm, 0)} mm</strong></article>
          <article><small>Profundidade máxima válida</small><strong>{format(measurements.maximumDepthMm, 0)} mm</strong></article>
        </div>
        <div className="cad-actions">
          <button type="button" className="secondary" onClick={applyEnvelope} disabled={!measurements.calibrated || !measurements.axisDefined || measurements.boundaryCount !== 1 || validationErrors.length > 0}>Aplicar ao cálculo</button>
          <button type="button" className="secondary" onClick={exportDxf} disabled={!measurements.calibrated || model.paths.length === 0 || validationErrors.length > 0}>Exportar DXF</button>
          <button type="button" className="text-button danger-text" onClick={clearGeometry}>Limpar CAD</button>
        </div>
      </div>
      <p className="cad-notice" aria-live="polite">{notice}</p>
      <p className="cad-disclaimer">O CAD registra a geometria real. O cálculo estrutural usa as dimensões orientadas e as cotas explicitamente vinculadas às zonas; curvas e regiões ainda serão discretizadas na fase de malha estrutural.</p>
    </>}
  </section>;
}
