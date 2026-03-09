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

export interface ImportedInputOrigin {
  copiedPath: string;
  source: string;
  caseName: string;
  originRepository?: string;
}

export interface ReferenceOracle {
  repository: string;
  moduleName: string;
  operation: string;
  profile?: string;
  provisional?: boolean;
}

export interface BaseTestSuite {
  $schema: string;
  id: string;
  title: string;
  suite: SuiteName;
  kind: string;
  summary: string;
  features: string[];
  profile?: string;
  inputOrigin?: ImportedInputOrigin;
  oracle?: ReferenceOracle;
  upstream: UpstreamReference[];
}

export interface SfcDescriptorExpectation {
  template: boolean;
  script: boolean;
  scriptSetup: boolean;
  styles: number;
  customBlocks: number;
  scriptLang?: string | null;
  scriptSetupLang?: string | null;
  styleLangs?: string[];
  scopedStyles?: number;
}

export interface SyntaxTestSuite extends BaseTestSuite {
  suite: "syntax";
  kind: "sfc-descriptor";
  input: {
    filename: string;
    source: string;
  };
  expect: {
    descriptor: SfcDescriptorExpectation;
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
  parseMode?: "base" | "html" | "sfc";
  whitespace?: "preserve" | "condense";
  delimiters?: {
    start: string;
    end: string;
  };
  ns?: "HTML" | "SVG" | "MATH_ML";
  nativeTags?: string[];
  voidTags?: string[];
  customElementTags?: string[];
  preTags?: string[];
  ignoreNewlineTags?: string[];
}

export interface ParserTestSuite extends BaseTestSuite {
  suite: "parser";
  kind: "template-base-parse" | "template-dom-parse";
  input: {
    source: string;
    comments?: boolean;
    parseMode?: "base" | "html" | "sfc";
    whitespace?: "preserve" | "condense";
    delimiters?: {
      start: string;
      end: string;
    };
    ns?: "HTML" | "SVG" | "MATH_ML";
    nativeTags?: string[];
    voidTags?: string[];
    customElementTags?: string[];
    preTags?: string[];
    ignoreNewlineTags?: string[];
  };
  expect: {
    errorCount: number;
    ast?: PointerAssertion[];
    errors?: PointerAssertion[];
    normalizedAst?: string | null;
    normalizedErrors?: string | null;
    vendoredSnapshotOutput?: string | null;
    vendoredSnapshotOptions?: string | null;
  };
}

export interface CompilerOptionsInput {
  mode?: string;
  prefixIdentifiers?: boolean;
  hoistStatic?: boolean;
  cacheHandlers?: boolean;
  customElementTags?: string[];
}

export interface ScriptOptionsInput {
  id?: string;
  inlineTemplate?: boolean;
  isProd?: boolean;
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
  code?: string | number;
}

export interface WarningExpectation {
  message: string;
}

export interface CompilerTestSuite extends BaseTestSuite {
  suite: "compiler";
  kind:
    | "template-dom-compile"
    | "template-expected-snapshot"
    | "jsx-expected-snapshot"
    | "sfc-script-compile"
    | "sfc-style-compile"
    | "sfc-full-compile"
    | "sfc-expected-snapshot";
  input: {
    filename?: string;
    source?: string;
    sfc?: string;
    compilerOptions?: CompilerOptionsInput;
    scriptOptions?: ScriptOptionsInput;
    styleOptions?: StyleOptionsInput;
  };
  expect: {
    descriptor?: SfcDescriptorExpectation;
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
    templateCode?: string | null;
    styleCodes?: string[];
    cssVars?: string[];
    error?: ErrorExpectation;
    diagnostics?: ErrorExpectation[];
    warnings?: WarningExpectation[];
    vendoredSnapshotOutput?: string | null;
    vendoredSnapshotOptions?: string | null;
  };
}

export interface TypeEvaluationTestSuite extends BaseTestSuite {
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

export interface BenchmarkTestSuite extends BaseTestSuite {
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
  localTestSuiteId: string;
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
  localTestSuites: string[];
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

export interface ReleaseManifestChannel {
  kind: "npm-package";
  identifier: string;
  purpose: string[];
}

export interface ReleaseManifestProfile {
  name: string;
  default: boolean;
  stability: "stable" | "provisional";
  upstreamRepository: string;
  upstreamLine: string;
  isolation: "base" | "opt-in";
}

export interface ReleaseManifestTarget {
  name: "syntax" | "parser" | "compiler" | "type-evaluation" | "runtime" | "benchmark";
  root: string;
  executableFormat: "pkl" | "typescript";
}

export interface ReleaseManifest {
  schemaVersion: 1;
  packageName: string;
  version: string;
  tagFormat: string;
  distribution: {
    canonical: {
      kind: "repository-snapshot";
      manifestPath: string;
      consumption: string;
      requiredRoots: string[];
    };
    secondaryChannels: ReleaseManifestChannel[];
  };
  baseline: {
    repository: string;
    packageRanges: Record<string, string>;
    evidenceRepositories: string[];
  };
  profiles: ReleaseManifestProfile[];
  artifacts: {
    targets: ReleaseManifestTarget[];
    roots: {
      spec: string;
      testsuites: string;
      runtime: string;
      schemas: string;
      provenance: string;
      fixtures: string;
    };
    jsTooling: {
      cliCommand: string;
      cliEntrypoint: string;
      moduleEntrypoints: string[];
    };
    counts: {
      pklTestSuites: number;
      runtimeTestSuites: number;
      requirementMatrixEntries: number;
      normativeChapters: number;
      schemas: number;
      upstreamInventories: number;
      traceabilityManifests: number;
      vendoredCorpora: number;
    };
  };
}

export type GenericTestSuite =
  | SyntaxTestSuite
  | ParserTestSuite
  | CompilerTestSuite
  | TypeEvaluationTestSuite
  | BenchmarkTestSuite;

export interface CatalogEntry {
  id: string;
  title: string;
  suite: string;
  kind: string;
  file: string;
  features: string[];
  profile?: string;
}

export interface RequirementMatrixReference {
  label: string;
  href: string;
  targetPath: string;
}

export interface RequirementMatrixEntry {
  id: string;
  statement: string;
  file: string;
  line: number;
  references: RequirementMatrixReference[];
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
