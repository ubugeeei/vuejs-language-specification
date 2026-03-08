export { buildCatalog, discoverTestSuiteFiles, loadGenericTestSuites } from "./catalog.ts";
export { runBenchmarkTestSuite } from "./benchmark.ts";
export { discoverRequirementMatrixFiles, loadRequirementMatrixEntries } from "./requirements.ts";
export {
  buildReleaseManifest,
  canonicalReleaseManifestPath,
  loadReleaseManifest,
  releaseManifestFile,
} from "./release.ts";
export {
  buildUpstreamCoverage,
  buildUpstreamTraceability,
  loadLocalUpstreamReferences,
  loadVendoredUpstreamCorpora,
  loadUpstreamInventories,
  normalizeUpstreamEvidenceKind,
} from "./upstream.ts";
export type { LocalUpstreamReference } from "./upstream.ts";
export {
  runCompilerReferenceTestSuite,
  runParserReferenceTestSuite,
  runSyntaxReferenceTestSuite,
  runTypeEvaluationReferenceTestSuite,
} from "./reference.ts";
export {
  validateNormativeChapterStructure,
  validateReleaseManifest,
  validateRequirementMatrices,
  validateRepositoryConventions,
  validateRuntimeTestSuites,
  validateTestSuites,
  validateUpstreamInventories,
  validateUpstreamReferences,
  validateUpstreamTraceability,
  validateVendoredSnapshots,
  validateVendoredUpstreamCorpora,
} from "./validate.ts";
export type {
  BenchmarkTestSuite,
  BenchmarkResult,
  DanglingUpstreamReference,
  BindingExpectation,
  CatalogEntry,
  CompilerTestSuite,
  GenericTestSuite,
  ParserTestSuite,
  RequirementMatrixEntry,
  RequirementMatrixReference,
  ReleaseManifest,
  ReleaseManifestChannel,
  ReleaseManifestProfile,
  ReleaseManifestTarget,
  SyntaxTestSuite,
  UpstreamEvidenceKind,
  UpstreamCoverageReport,
  UpstreamCoverageEntry,
  UpstreamCoverageRepositorySummary,
  UpstreamTraceabilityClassification,
  UpstreamTraceabilityEntry,
  UpstreamTraceabilityManifest,
  UpstreamTraceabilityStatus,
  TypeEvaluationTestSuite,
  BaseTestSuite,
  UpstreamInventory,
  ValidationMessage,
  VendoredSnapshotManifest,
  VendoredUpstreamCorpusFile,
  VendoredUpstreamCorpusManifest,
} from "./types.ts";
