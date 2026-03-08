export { buildCatalog, discoverCaseFiles, loadGenericCases } from "./catalog.ts";
export { runBenchmarkCase } from "./benchmark.ts";
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
  runCompilerReferenceCase,
  runParserReferenceCase,
  runSyntaxReferenceCase,
  runTypeEvaluationReferenceCase,
} from "./reference.ts";
export {
  validateCases,
  validateUpstreamInventories,
  validateUpstreamReferences,
  validateUpstreamTraceability,
  validateVendoredSnapshots,
  validateVendoredUpstreamCorpora,
} from "./validate.ts";
export type {
  BenchmarkCase,
  BenchmarkResult,
  DanglingUpstreamReference,
  BindingExpectation,
  CatalogEntry,
  CompilerCase,
  GenericCase,
  ParserCase,
  SyntaxCase,
  UpstreamEvidenceKind,
  UpstreamCoverageReport,
  UpstreamCoverageEntry,
  UpstreamCoverageRepositorySummary,
  UpstreamTraceabilityClassification,
  UpstreamTraceabilityEntry,
  UpstreamTraceabilityManifest,
  UpstreamTraceabilityStatus,
  TypeEvaluationCase,
  UpstreamInventory,
  ValidationMessage,
  VendoredSnapshotManifest,
  VendoredUpstreamCorpusFile,
  VendoredUpstreamCorpusManifest,
} from "./types.ts";
