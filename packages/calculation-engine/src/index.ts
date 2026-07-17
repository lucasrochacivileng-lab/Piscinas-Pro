export { calculateHydrostaticAction } from "./hydrostatic.js";
export {
  DEMONSTRATION_PROFILE,
  SILVA_2022_ACADEMIC_PROFILE,
  SILVA_2022_PHASE1_PROFILE
} from "./profiles.js";
export {
  findBlockWebRequirement,
  findClassCUseLimit,
  findNominalBlockFamily,
  inferLegacyConcreteBlockClass,
  minimumMiterRadiusMm,
  NBR_6136_1_2026_CLASS_C_USE_LIMITS,
  NBR_6136_1_2026_DIMENSIONAL_TOLERANCES,
  NBR_6136_1_2026_MINIMUM_MITER_RADIUS_MM,
  NBR_6136_1_2026_NOMINAL_FAMILIES,
  NBR_6136_1_2026_STRENGTH_RULES,
  NBR_6136_1_2026_WEB_REQUIREMENTS,
  validateConcreteBlockStrength
} from "./block-standard.js";
export type {
  BlockWebRequirement,
  ClassCUseLimit,
  ConcreteBlockClass,
  ConcreteBlockStrengthRule,
  ConcreteBlockStrengthValidation,
  NominalBlockFamilyDimensions
} from "./block-standard.js";
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
export {
  buildPoolGeometryModel,
  groundwaterHeadAboveZoneSlabBottomMm,
  maximumPoolDepthMm,
  nextDepthZoneKind,
  normalizePoolDepthZones,
  poolWaterVolumeM3
} from "./geometry.js";
export type {
  GeometricWallKind,
  GeometricWallPanel,
  GeometricWallSide,
  NormalizedDepthZone,
  PoolGeometryModel,
  PoolStepTransition
} from "./geometry.js";
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
  Phase1SlabZoneResult,
  Phase1WallPanelResult,
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
  HydrostaticZoneResult,
  NormativeProfile,
  PoolDepthZoneInput,
  PoolDepthZoneKind,
  PoolGeometryInput,
  TraceStep,
  WallPanelError,
  WallPanelInput,
  WallPanelOutcome,
  WallPanelResult
} from "./types.js";
