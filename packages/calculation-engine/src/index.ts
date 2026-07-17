export { calculateHydrostaticAction } from "./hydrostatic.js";
export {
  DEMONSTRATION_PROFILE,
  SILVA_2022_ACADEMIC_PROFILE,
  SILVA_2022_PHASE1_PROFILE
} from "./profiles.js";
export {
  barAreaMm2,
  selectBarLayout,
  validateStructuralProfile
} from "./engineering.js";
export type {
  BarLayout,
  CalculationBundle,
  CheckStatus,
  EngineeringCheck,
  StructuralDesignProfile
} from "./engineering.js";
export { calculatePoolLoadCases } from "./load-cases.js";
export type { PoolLoadCasesInput, PoolLoadCasesResult } from "./load-cases.js";
export { designMasonryPanel } from "./masonry-design.js";
export type {
  MasonryDesignInput,
  MasonryDesignResult,
  MasonryDirectionResult
} from "./masonry-design.js";
export {
  calculateMaterialQuantities,
  DEFAULT_POOL_TAKEOFF_OPTIONS,
  steelBarMassKg,
  takeoffPoolQuantities
} from "./quantities.js";
export type {
  ElementQuantityResult,
  MaterialQuantitiesResult,
  PoolTakeoffOptions,
  SlabQuantityInput,
  SteelBarScheduleItem,
  WallQuantityInput
} from "./quantities.js";
export {
  compareCostEstimates,
  DEFAULT_PRICE_TABLE,
  estimateCosts,
  validatePriceTable
} from "./costing.js";
export type {
  CostComparisonLine,
  CostComparisonResult,
  CostEstimateResult,
  CostLineItem,
  CostMaterial,
  PriceTable
} from "./costing.js";
export {
  BLB_BLOCK_FAMILY_15X30,
  BLB_BLOCK_FAMILY_15X40,
  BLB_BLOCK_FAMILY_20X40,
  BLOCK_FAMILY_M15,
  BLOCK_FAMILY_M20,
  DEFAULT_BLOCK_FAMILIES,
  JB_BLOCK_FAMILY_15X40,
  JB_BLOCK_FAMILY_20X40,
  layoutCourse,
  modulatePoolPerimeter,
  modulateWall,
  suggestModularAdjustments,
  validateBlockFamily
} from "./modulation.js";
export type {
  BlockFamily,
  BlockRole,
  BlockUnit,
  CourseLayout,
  CoursePlacement,
  GroutPlan,
  JunctionPlan,
  ModularAdjustment,
  ModularAdjustmentKind,
  PoolModulationInput,
  PoolModulationResult,
  WallModulationInput,
  WallModulationResult
} from "./modulation.js";
export { runPhase1Design } from "./phase1.js";
export type {
  MasonrySpecificationInput,
  Phase1MasonryResult,
  Phase1DesignInput,
  Phase1DesignResult,
  Phase1WallResult
} from "./phase1.js";
export { DEFAULT_MASONRY_SPECIFICATION } from "./phase1.js";
export { clampedPlateCoefficients, designClampedPoolSlab } from "./slab-design.js";
export type {
  PlateCoefficients,
  ReinforcedConcreteSectionResult,
  SlabDesignInput,
  SlabDesignResult
} from "./slab-design.js";
export { estimateSoilFromSPT } from "./soil.js";
export type { SoilEstimateFromSPT } from "./soil.js";
export {
  activeEarthPressureCoefficient,
  calculateWallPanelActions,
  momentCoefficientForRatio
} from "./wall-panel.js";
export { validateGeometry, validateProfile } from "./validation.js";
export type {
  CalculationError,
  CalculationOutcome,
  HydrostaticResult,
  NormativeProfile,
  PoolGeometryInput,
  TraceStep,
  WallPanelError,
  WallPanelInput,
  WallPanelOutcome,
  WallPanelResult
} from "./types.js";
