export type SuiteName = "syntax" | "parser" | "compiler" | "type-evaluation" | "benchmark";
export type UpstreamEvidenceKind = "test" | "benchmark" | "issue" | "snapshot" | "artifact";
export type UpstreamTraceabilityStatus = "covered" | "planned" | "tracked";
export type UpstreamTraceabilityClassification =
  | "portable-language"
  | "runtime-host"
  | "tooling-host"
  | "integration-host"
  | "visual-regression"
  | "benchmark-harness";

export interface UpstreamReference {
  kind?: UpstreamEvidenceKind;
  repository: string;
  source: string;
  cases: string[];
  issues?: string[];
}

export interface BaseCase {
  $schema: string;
  id: string;
  title: string;
  suite: SuiteName;
  kind: string;
  summary: string;
  features: string[];
  profile?: string;
  upstream: UpstreamReference[];
}

export interface SyntaxCase extends BaseCase {
  suite: "syntax";
  kind: "sfc-descriptor";
  input: {
    filename: string;
    source: string;
  };
  expect: {
    descriptor: {
      template: boolean;
      script: boolean;
      scriptSetup: boolean;
      styles: number;
      customBlocks: number;
      scriptLang?: string | null;
      scriptSetupLang?: string | null;
      styleLangs?: string[];
      scopedStyles?: number;
    };
    templateContentIncludes?: string[];
  };
}

export interface PointerAssertion {
  pointer: string;
  equals: string | number | boolean | null;
}

export interface BindingExpectation {
  name: string;
  kind: string;
}

export interface ParserOptionsInput {
  comments?: boolean;
}

export interface ParserCase extends BaseCase {
  suite: "parser";
  kind: "template-base-parse";
  input: {
    source: string;
    comments?: boolean;
  };
  expect: {
    errorCount: number;
    ast?: PointerAssertion[];
    errors?: PointerAssertion[];
  };
}

export interface CompilerOptionsInput {
  mode?: string;
  prefixIdentifiers?: boolean;
  hoistStatic?: boolean;
  cacheHandlers?: boolean;
}

export interface ScriptOptionsInput {
  id?: string;
}

export interface StyleOptionsInput {
  id?: string;
  scoped?: boolean;
}

export interface HelperExpectation {
  name: string;
}

export interface PropConstructorExpectation {
  name: string;
  constructor: string;
}

export interface AliasExpectation {
  localName: string;
  source: string;
}

export interface LiteralExpectation {
  name: string;
  value: string | number | boolean | null;
}

export interface DefaultKindExpectation {
  name: string;
  kind: string;
}

export interface RuntimePropExpectation {
  name: string;
  types: string[];
  required: boolean;
  skipCheck?: boolean;
}

export interface ErrorExpectation {
  name: string;
  message: string;
}

export interface CompilerCase extends BaseCase {
  suite: "compiler";
  kind: "template-dom-compile" | "sfc-script-compile" | "sfc-style-compile";
  input: {
    filename?: string;
    source?: string;
    sfc?: string;
    compilerOptions?: CompilerOptionsInput;
    scriptOptions?: ScriptOptionsInput;
    styleOptions?: StyleOptionsInput;
  };
  expect: {
    ast?: PointerAssertion[];
    helpers?: HelperExpectation[];
    hoistCount?: number;
    bindings?: BindingExpectation[];
    propConstructors?: PropConstructorExpectation[];
    propDefaults?: LiteralExpectation[];
    propDefaultKinds?: DefaultKindExpectation[];
    aliases?: AliasExpectation[];
    emits?: string[];
    literals?: LiteralExpectation[];
    normalizedCode?: string | null;
    cssVars?: string[];
    error?: ErrorExpectation;
  };
}

export interface TypeEvaluationCase extends BaseCase {
  suite: "type-evaluation";
  kind: "script-setup-runtime-props";
  input: {
    filename: string;
    sfc: string;
    scriptOptions?: ScriptOptionsInput;
  };
  expect: {
    runtimeProps: RuntimePropExpectation[];
    bindings?: BindingExpectation[];
  };
}

export interface BenchmarkCase extends BaseCase {
  suite: "benchmark";
  kind: "compiler-sfc-batch" | "reactivity-computed-fanout";
  input: Record<string, unknown>;
  measure: {
    warmups: number;
    samples: number;
    unit: "ms";
    budget?: {
      maxMeanMs?: number;
    };
  };
}

export interface UpstreamInventoryFileCase {
  name: string;
  kind: "test" | "benchmark";
  line: number;
}

export interface UpstreamInventoryIssue {
  label: string;
  line: number;
}

export interface UpstreamInventoryFile {
  path: string;
  kind: "test" | "benchmark";
  cases: UpstreamInventoryFileCase[];
  issues: UpstreamInventoryIssue[];
}

export interface UpstreamInventory {
  repository: string;
  commit: string;
  generatedAt: string;
  counts: {
    files: number;
    cases: number;
    issueRefs: number;
    benchmarks?: number;
  };
  files: UpstreamInventoryFile[];
}

export interface VendoredSnapshotManifestEntry {
  suite: string;
  originPath: string;
  copiedPath: string;
  bytes: number;
  sha256: string;
}

export interface VendoredSnapshotManifest {
  originRepository: string;
  originCommit: string;
  generatedAt: string;
  policy: string;
  snapshotCount: number;
  entries: Record<string, VendoredSnapshotManifestEntry>;
}

export interface VendoredUpstreamCorpusCase {
  name: string;
  kind: "test" | "benchmark";
  line: number;
}

export interface VendoredUpstreamCorpusIssue {
  label: string;
  line: number;
}

export interface VendoredUpstreamCorpusFile {
  sourcePath: string;
  kind: "test" | "benchmark";
  copiedPath: string;
  bytes: number;
  sha256: string;
  cases: VendoredUpstreamCorpusCase[];
  issues: VendoredUpstreamCorpusIssue[];
}

export interface VendoredUpstreamCorpusManifest {
  originRepository: string;
  originCommit: string;
  generatedAt: string;
  policy: string;
  counts: {
    files: number;
    cases: number;
    issueRefs: number;
    benchmarks: number;
  };
  files: VendoredUpstreamCorpusFile[];
}

export interface UpstreamCoverageRepositorySummary {
  repository: string;
  files: number;
  totalCases: number;
  coveredCases: number;
  uncoveredCases: number;
}

export interface UpstreamCoverageEntry {
  repository: string;
  source: string;
  name: string;
  kind: "test" | "benchmark";
  line: number;
  coveredBy: string[];
}

export interface DanglingUpstreamReference {
  kind: UpstreamEvidenceKind;
  repository: string;
  source: string;
  caseName: string;
  localCaseId: string;
}

export interface UpstreamCoverageReport {
  generatedAt: string;
  repositories: UpstreamCoverageRepositorySummary[];
  uncovered: UpstreamCoverageEntry[];
  danglingReferences: DanglingUpstreamReference[];
}

export interface UpstreamTraceabilityEntry {
  source: string;
  name: string;
  kind: "test" | "benchmark";
  line: number;
  classification: UpstreamTraceabilityClassification;
  status: UpstreamTraceabilityStatus;
  profile?: string | null;
  localCases: string[];
  fileIssues: string[];
  rationale: string;
}

export interface UpstreamTraceabilityManifest {
  repository: string;
  commit: string;
  generatedAt: string;
  counts: {
    total: number;
    covered: number;
    planned: number;
    tracked: number;
  };
  entries: UpstreamTraceabilityEntry[];
}

export type GenericCase =
  | SyntaxCase
  | ParserCase
  | CompilerCase
  | TypeEvaluationCase
  | BenchmarkCase;

export interface CatalogEntry {
  id: string;
  title: string;
  suite: string;
  kind: string;
  file: string;
  features: string[];
  profile?: string;
}

export interface ValidationMessage {
  file: string;
  id?: string;
  valid: boolean;
  errors: string[];
}

export interface BenchmarkSample {
  durationMs: number;
}

export interface BenchmarkResult {
  id: string;
  title: string;
  unit: "ms";
  samples: BenchmarkSample[];
  mean: number;
  min: number;
  max: number;
}
