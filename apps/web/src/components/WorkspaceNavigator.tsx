interface WorkspaceNavigatorProps {
  readonly activeModule: "model" | "drawings" | "results";
  readonly depthZoneCount: number;
  readonly soilLayerCount: number;
  readonly revisionNumber: number | null;
  readonly checkCount: number;
  readonly drawingsAvailable: boolean;
  readonly resultsAvailable: boolean;
  readonly onOpenModule: (module: "model" | "drawings" | "results") => void;
}

export function WorkspaceNavigator({
  activeModule,
  depthZoneCount,
  soilLayerCount,
  revisionNumber,
  checkCount,
  drawingsAvailable,
  resultsAvailable,
  onOpenModule
}: WorkspaceNavigatorProps) {
  return <section className="model-navigator" aria-label="Navegador do modelo">
    <div className="model-navigator-heading">
      <span>Modelo estrutural</span>
      <small>ÁRVORE</small>
    </div>
    <div className="model-tree" role="tree">
      <div className="model-tree-group" role="none">
        <button
          type="button"
          className={activeModule === "model" ? "model-tree-node active" : "model-tree-node"}
          onClick={() => onOpenModule("model")}
          role="treeitem"
          aria-selected={activeModule === "model"}
          aria-expanded="true"
        >
          <span className="tree-toggle">−</span>
          <span className="tree-icon">M</span>
          <span>Modelo de cálculo</span>
        </button>
        <div className="model-tree-children" role="group">
          <span role="treeitem"><i aria-hidden="true">G</i>Geometria da piscina</span>
          <span role="treeitem"><i aria-hidden="true">Z</i>Zonas de profundidade <b>{depthZoneCount}</b></span>
          <span role="treeitem"><i aria-hidden="true">S</i>Perfil geotécnico <b>{soilLayerCount}</b></span>
          <span role="treeitem"><i aria-hidden="true">A</i>Alvenaria estrutural</span>
        </div>
      </div>
      <button
        type="button"
        className={activeModule === "results" ? "model-tree-node active" : "model-tree-node"}
        onClick={() => onOpenModule("results")}
        role="treeitem"
        aria-selected={activeModule === "results"}
        disabled={!resultsAvailable}
      >
        <span className="tree-toggle">›</span>
        <span className="tree-icon">R</span>
        <span>Resultados</span>
        <b>{checkCount}</b>
      </button>
      <button
        type="button"
        className={activeModule === "drawings" ? "model-tree-node active" : "model-tree-node"}
        onClick={() => onOpenModule("drawings")}
        role="treeitem"
        aria-selected={activeModule === "drawings"}
        disabled={!drawingsAvailable}
      >
        <span className="tree-toggle">›</span>
        <span className="tree-icon">P</span>
        <span>Pranchas e detalhes</span>
        {revisionNumber !== null && <b>R{revisionNumber}</b>}
      </button>
    </div>
  </section>;
}
