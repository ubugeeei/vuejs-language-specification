import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { packageRoot, walkFiles } from "./fs.ts";
import { discoverTestSuiteFiles } from "./catalog.ts";
import { evaluatePklFile } from "./pkl.ts";
import { loadRequirementMatrixEntries, requiredRequirementMatrixFiles } from "./requirements.ts";
import { runtimeTestSuites } from "./runtime/index.ts";
import {
  buildUpstreamCoverage,
  buildUpstreamTraceability,
  loadLocalUpstreamReferences,
  loadVendoredUpstreamCorpora,
} from "./upstream.ts";
import type {
  GenericTestSuite,
  UpstreamInventory,
  UpstreamReference,
  UpstreamTraceabilityManifest,
  ValidationMessage,
  VendoredSnapshotManifest,
  VendoredUpstreamCorpusManifest,
} from "./types.ts";

function repositoryToTraceabilityFile(root: string, repository: string): string {
  return join(
    root,
    "sources",
    "traceability",
    `${repository.replaceAll("/", "-")}.traceability.pkl`,
  );
}

function extractSnapshotNames(content: string): Set<string> {
  return new Set(
    [...content.matchAll(/^name:\s*(.+)$/gm)]
      .map((match) => match[1]?.trim())
      .filter(Boolean) as string[],
  );
}

function normalizeTraceabilityManifest(
  manifest: UpstreamTraceabilityManifest,
): UpstreamTraceabilityManifest {
  return {
    ...manifest,
    entries: manifest.entries.map((entry) => ({
      ...entry,
      profile: entry.profile ?? null,
    })),
  };
}

const legacyLocalNamingRules = [
  {
    needle: "discoverCaseFiles",
    replacement: "discoverTestSuiteFiles",
  },
  {
    needle: "loadGenericCases",
    replacement: "loadGenericTestSuites",
  },
  {
    needle: "validateCases",
    replacement: "validateTestSuites",
  },
  {
    needle: "runBenchmarkCase",
    replacement: "runBenchmarkTestSuite",
  },
  {
    needle: "runCompilerReferenceCase",
    replacement: "runCompilerReferenceTestSuite",
  },
  {
    needle: "runParserReferenceCase",
    replacement: "runParserReferenceTestSuite",
  },
  {
    needle: "runSyntaxReferenceCase",
    replacement: "runSyntaxReferenceTestSuite",
  },
  {
    needle: "runTypeEvaluationReferenceCase",
    replacement: "runTypeEvaluationReferenceTestSuite",
  },
  {
    needle: "runtimeCases",
    replacement: "runtimeTestSuites",
  },
  {
    needle: "browserRuntimeCases",
    replacement: "browserRuntimeTestSuites",
  },
  {
    needle: "nodeRuntimeCases",
    replacement: "nodeRuntimeTestSuites",
  },
  {
    needle: "runRuntimeCases",
    replacement: "runRuntimeTestSuites",
  },
  {
    needle: "RuntimeCase",
    replacement: "RuntimeTestSuite",
  },
  {
    needle: "BenchmarkCase",
    replacement: "BenchmarkTestSuite",
  },
  {
    needle: "CompilerCase",
    replacement: "CompilerTestSuite",
  },
  {
    needle: "ParserCase",
    replacement: "ParserTestSuite",
  },
  {
    needle: "SyntaxCase",
    replacement: "SyntaxTestSuite",
  },
  {
    needle: "TypeEvaluationCase",
    replacement: "TypeEvaluationTestSuite",
  },
  {
    needle: "GenericCase",
    replacement: "GenericTestSuite",
  },
  {
    needle: "BaseCase",
    replacement: "BaseTestSuite",
  },
  {
    needle: "cases/",
    replacement: "testsuites/",
  },
  {
    needle: "src/runtime/cases/",
    replacement: "src/runtime/testsuites/",
  },
  {
    needle: "schemas/BenchmarkCase.pkl",
    replacement: "schemas/BenchmarkTestSuite.pkl",
  },
  {
    needle: "schemas/CompilerCase.pkl",
    replacement: "schemas/CompilerTestSuite.pkl",
  },
  {
    needle: "schemas/ParserCase.pkl",
    replacement: "schemas/ParserTestSuite.pkl",
  },
  {
    needle: "schemas/SyntaxCase.pkl",
    replacement: "schemas/SyntaxTestSuite.pkl",
  },
  {
    needle: "schemas/TypeEvaluationCase.pkl",
    replacement: "schemas/TypeEvaluationTestSuite.pkl",
  },
] as const;

const requiredNormativeHeadings = {
  "spec/00-formal-notation.md": [
    "Domains",
    "Observable Values",
    "Normalization Operators",
    "Core Judgments",
    "Projection Operators",
    "Test-Suite Semantics",
    "Upstream Representation",
    "Equality Model",
    "Diagnostic Equality",
  ],
  "spec/01-conformance-model.md": [
    "Declared Target",
    "Normative Order",
    "Observability Boundary",
    "Portability Rules",
    "Suite Map",
  ],
  "spec/02-sfc-syntax.md": [
    "Lexical Surface",
    "Abstract Grammar",
    "Descriptor Data Model",
    "Parser Data Model",
    "Diagnostic Model",
    "Requirements",
    "Constrained Equality",
    "Coverage Surface",
  ],
  "spec/03-template-and-compiler.md": [
    "Compiler Judgments",
    "Output Data Model",
    "Diagnostic and Warning Model",
    "Requirements",
    "Output Discipline",
    "Profiles",
    "Coverage Surface",
  ],
  "spec/04-type-evaluation.md": [
    "Type Evaluation Judgment",
    "Input Type Surface",
    "Runtime-Prop Data Model",
    "Observable Lowering Rules",
    "Requirements",
    "Normalization Rules",
    "Coverage Surface",
  ],
  "spec/05-runtime-conformance.md": [
    "Runtime Transition Model",
    "Environment Model",
    "Observation Model",
    "Requirements",
    "Harness Rule",
    "Coverage Surface",
  ],
  "spec/06-benchmark-methodology.md": [
    "Benchmark Test-Suite Shape",
    "Benchmark Environment",
    "Requirements",
    "Reproducibility Rules",
    "Coverage Surface",
  ],
  "spec/07-upstream-provenance.md": [
    "Source Policy",
    "Inventories",
    "Curation Rules",
    "Vapor Provenance",
  ],
  "spec/08-test-suite-artifact-model.md": [
    "Scope",
    "Artifact Domains",
    "Well-Formedness",
    "Repository Invariants",
    "Validation Obligations",
    "Conformance Boundary",
  ],
  "spec/09-requirement-matrix-model.md": [
    "Purpose",
    "Concrete Syntax",
    "Well-Formedness",
    "Binding Rule",
    "Validation Obligations",
    "Conformance Boundary",
  ],
} as const;

function collectConventionScanFiles(root: string): string[] {
  const files = [
    join(root, "package.json"),
    join(root, "vitest.config.ts"),
    join(root, "tsdown.config.ts"),
  ].filter((file) => existsSync(file));

  for (const directory of ["src", "schemas", "scripts"] as const) {
    const fullDirectory = join(root, directory);
    if (!existsSync(fullDirectory)) {
      continue;
    }
    files.push(
      ...walkFiles(
        fullDirectory,
        (file) => file.endsWith(".md") || file.endsWith(".pkl") || file.endsWith(".ts"),
      ),
    );
  }

  return files.filter((file) => file !== join(root, "src", "validate.ts"));
}

function splitPathSegments(value: string): string[] {
  return value.split(/[\\/]/u);
}

function normalizeHeading(line: string): string | null {
  const match = line.match(/^#{1,6}\s+(.+)$/u);

  if (!match) {
    return null;
  }

  const heading = match[1];

  if (heading === undefined) {
    return null;
  }

  return heading
    .trim()
    .replace(/^\d+(?:\.\d+)*\.?\s+/u, "")
    .replace(/`/gu, "");
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function hasDuplicates(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

function validateUpstreamSelectors(selectors: UpstreamReference[], context: string): string[] {
  const errors: string[] = [];

  for (const [index, selector] of selectors.entries()) {
    if (isBlank(selector.repository)) {
      errors.push(`${context} upstream[${index}] repository must be non-empty`);
    }

    if (isBlank(selector.source)) {
      errors.push(`${context} upstream[${index}] source must be non-empty`);
    }

    if (selector.cases.length === 0 && (selector.issues?.length ?? 0) === 0) {
      errors.push(`${context} upstream[${index}] must reference at least one case or issue`);
    }

    if (hasDuplicates(selector.cases)) {
      errors.push(`${context} upstream[${index}] contains duplicate case selectors`);
    }

    if (hasDuplicates(selector.issues ?? [])) {
      errors.push(`${context} upstream[${index}] contains duplicate issue selectors`);
    }
  }

  return errors;
}

function extractRuntimeTestSuiteId(file: string): string | null {
  const content = readFileSync(file, "utf8");
  const match = content.match(/id:\s*"([^"]+)"/u);
  return match?.[1] ?? null;
}

export function validateRepositoryConventions(
  root: string = packageRoot(import.meta.url),
): ValidationMessage[] {
  const errors: string[] = [];
  const legacyPaths = [
    join(root, "cases"),
    join(root, "src", "runtime", "cases"),
    join(root, "schemas", "BenchmarkCase.pkl"),
    join(root, "schemas", "CompilerCase.pkl"),
    join(root, "schemas", "ParserCase.pkl"),
    join(root, "schemas", "SyntaxCase.pkl"),
    join(root, "schemas", "TypeEvaluationCase.pkl"),
  ];

  for (const path of legacyPaths) {
    if (existsSync(path)) {
      errors.push(`Legacy local naming artifact exists: ${relative(root, path)}`);
    }
  }

  const canonicalSchemaPattern =
    /^amends\s+"(?:\.\.\/)+schemas\/(?:Benchmark|Compiler|Parser|Syntax|TypeEvaluation)TestSuite\.pkl"$/u;
  for (const file of discoverTestSuiteFiles(root)) {
    const content = readFileSync(file, "utf8");
    const firstNonBlankLine = content.split(/\r?\n/u).find((line) => line.trim().length > 0);

    if (!firstNonBlankLine || !canonicalSchemaPattern.test(firstNonBlankLine)) {
      errors.push(`Test suite must amend a canonical *TestSuite schema: ${relative(root, file)}`);
    }
  }

  const runtimeTestSuiteFilesRoot = join(root, "src", "runtime", "testsuites");
  if (existsSync(runtimeTestSuiteFilesRoot)) {
    const runtimeExportPattern = /^export const [A-Za-z0-9]+TestSuite: RuntimeTestSuite = /mu;
    for (const file of walkFiles(runtimeTestSuiteFilesRoot, (entry) => entry.endsWith(".ts"))) {
      const content = readFileSync(file, "utf8");
      if (!runtimeExportPattern.test(content)) {
        errors.push(
          `Runtime test suite module must export a canonical *TestSuite binding: ${relative(root, file)}`,
        );
      }
    }
  }

  for (const file of collectConventionScanFiles(root)) {
    const content = readFileSync(file, "utf8");
    for (const rule of legacyLocalNamingRules) {
      if (content.includes(rule.needle)) {
        errors.push(
          `Legacy local naming token "${rule.needle}" found in ${relative(root, file)}; use "${rule.replacement}"`,
        );
      }
    }
  }

  return [
    {
      file: root,
      valid: errors.length === 0,
      errors,
    },
  ];
}

export function validateTestSuites(
  root: string = packageRoot(import.meta.url),
): ValidationMessage[] {
  const parsedTestSuites = discoverTestSuiteFiles(root).map((file) => {
    try {
      const data = evaluatePklFile<GenericTestSuite>(file);
      return { file, data };
    } catch (error) {
      return {
        file,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  const idCounts = new Map<string, number>();
  for (const entry of parsedTestSuites) {
    if (!("data" in entry)) {
      continue;
    }
    idCounts.set(entry.data.id, (idCounts.get(entry.data.id) ?? 0) + 1);
  }

  return parsedTestSuites.map((entry) => {
    if (!("data" in entry)) {
      return {
        file: entry.file,
        valid: false,
        errors: [entry.error],
      };
    }

    const errors: string[] = [];
    const relativeFromTestSuitesRoot = relative(join(root, "testsuites"), entry.file);
    const segments = splitPathSegments(relativeFromTestSuitesRoot);
    const suiteContext = `test suite ${entry.data.id}`;

    if (segments.length !== 3 || !segments[2]?.endsWith(".pkl")) {
      errors.push(
        `Test suite path must match testsuites/<suite>/<group>/<name>.pkl: ${relative(root, entry.file)}`,
      );
    } else {
      const suiteFromPath = segments[0] ?? "";
      const groupFromPath = segments[1] ?? "";
      const nameFromPath = segments[2].replace(/\.pkl$/u, "");
      const expectedId = `${suiteFromPath}.${groupFromPath}.${nameFromPath}`;

      if (entry.data.suite !== suiteFromPath) {
        errors.push(
          `suite field mismatch: path=${suiteFromPath} data=${entry.data.suite} for ${relative(root, entry.file)}`,
        );
      }

      if (entry.data.id !== expectedId) {
        errors.push(
          `id mismatch: expected=${expectedId} actual=${entry.data.id} for ${relative(root, entry.file)}`,
        );
      }
    }

    if ((idCounts.get(entry.data.id) ?? 0) > 1) {
      errors.push(`Duplicate test suite id: ${entry.data.id}`);
    }

    if (isBlank(entry.data.title)) {
      errors.push(`${suiteContext} title must be non-empty`);
    }

    if (isBlank(entry.data.summary)) {
      errors.push(`${suiteContext} summary must be non-empty`);
    }

    if (entry.data.features.length === 0) {
      errors.push(`${suiteContext} must declare at least one feature`);
    }

    if (hasDuplicates(entry.data.features)) {
      errors.push(`${suiteContext} contains duplicate feature identifiers`);
    }

    if (entry.data.upstream.length === 0) {
      errors.push(`${suiteContext} must declare at least one upstream selector`);
    }

    if (entry.data.profile !== undefined && isBlank(entry.data.profile)) {
      errors.push(`${suiteContext} profile must be non-empty when present`);
    }

    errors.push(...validateUpstreamSelectors(entry.data.upstream, suiteContext));

    return {
      file: entry.file,
      id: entry.data.id,
      valid: errors.length === 0,
      errors,
    };
  });
}

export function validateRuntimeTestSuites(
  root: string = packageRoot(import.meta.url),
): ValidationMessage[] {
  const errors: string[] = [];
  const idCounts = new Map<string, number>();

  for (const testSuite of runtimeTestSuites) {
    idCounts.set(testSuite.id, (idCounts.get(testSuite.id) ?? 0) + 1);
  }

  for (const testSuite of runtimeTestSuites) {
    const suiteContext = `runtime test suite ${testSuite.id}`;

    if (!testSuite.id.startsWith("runtime.")) {
      errors.push(`${suiteContext} id must start with "runtime."`);
    }

    if ((idCounts.get(testSuite.id) ?? 0) > 1) {
      errors.push(`Duplicate runtime test suite id: ${testSuite.id}`);
    }

    if (isBlank(testSuite.title)) {
      errors.push(`${suiteContext} title must be non-empty`);
    }

    if (isBlank(testSuite.summary)) {
      errors.push(`${suiteContext} summary must be non-empty`);
    }

    if (testSuite.features.length === 0) {
      errors.push(`${suiteContext} must declare at least one feature`);
    }

    if (hasDuplicates(testSuite.features)) {
      errors.push(`${suiteContext} contains duplicate feature identifiers`);
    }

    if (testSuite.upstream.length === 0) {
      errors.push(`${suiteContext} must declare at least one upstream selector`);
    }

    errors.push(...validateUpstreamSelectors(testSuite.upstream, suiteContext));
  }

  return [
    {
      file: join(root, "src", "runtime", "testsuites"),
      valid: errors.length === 0,
      errors,
    },
  ];
}

export function validateRequirementMatrices(
  root: string = packageRoot(import.meta.url),
): ValidationMessage[] {
  const entries = loadRequirementMatrixEntries(root);
  const errorsByFile = new Map<string, string[]>();
  const suiteReferences = new Map<string, number>();
  const runtimeReferences = new Map<string, number>();
  const requirementIdCounts = new Map<string, number>();
  const localSuiteIdsByPath = new Map<string, string>();
  const runtimeIdsByPath = new Map<string, string>();

  function pushFileError(file: string, error: string) {
    const next = errorsByFile.get(file) ?? [];
    next.push(error);
    errorsByFile.set(file, next);
  }

  for (const entry of entries) {
    requirementIdCounts.set(entry.id, (requirementIdCounts.get(entry.id) ?? 0) + 1);
  }

  for (const file of discoverTestSuiteFiles(root)) {
    const testSuite = evaluatePklFile<GenericTestSuite>(file);
    localSuiteIdsByPath.set(relative(root, file), testSuite.id);
    suiteReferences.set(relative(root, file), 0);
  }

  const runtimeRoot = join(root, "src", "runtime", "testsuites");
  if (existsSync(runtimeRoot)) {
    for (const file of walkFiles(runtimeRoot, (entry) => entry.endsWith(".ts"))) {
      const runtimeId = extractRuntimeTestSuiteId(file);
      const pathFromRoot = relative(root, file);
      runtimeReferences.set(pathFromRoot, 0);
      if (runtimeId !== null) {
        runtimeIdsByPath.set(pathFromRoot, runtimeId);
      }
    }
  }

  for (const relativeFile of requiredRequirementMatrixFiles) {
    const hasRows = entries.some((entry) => entry.file === relativeFile);
    if (!hasRows) {
      pushFileError(
        relativeFile,
        "Requirement matrix file must declare at least one requirement row",
      );
    }
  }

  for (const entry of entries) {
    if (requirementIdCounts.get(entry.id) !== 1) {
      pushFileError(entry.file, `Duplicate requirement id: ${entry.id}`);
    }

    if (isBlank(entry.statement)) {
      pushFileError(entry.file, `Requirement ${entry.id} must declare a non-empty statement`);
    }

    if (entry.references.length === 0) {
      pushFileError(entry.file, `Requirement ${entry.id} must link at least one local test suite`);
      continue;
    }

    const referenceTargets = new Set<string>();
    for (const reference of entry.references) {
      if (!existsSync(join(root, reference.targetPath))) {
        pushFileError(
          entry.file,
          `Requirement ${entry.id} links missing artifact: ${reference.targetPath}`,
        );
        continue;
      }

      if (!referenceTargets.add(reference.targetPath)) {
        pushFileError(
          entry.file,
          `Requirement ${entry.id} contains duplicate artifact link: ${reference.targetPath}`,
        );
      }

      const testSuiteId = localSuiteIdsByPath.get(reference.targetPath);
      if (testSuiteId !== undefined) {
        suiteReferences.set(
          reference.targetPath,
          (suiteReferences.get(reference.targetPath) ?? 0) + 1,
        );
        if (reference.label !== testSuiteId) {
          pushFileError(
            entry.file,
            `Requirement ${entry.id} label mismatch for ${reference.targetPath}: expected ${testSuiteId} but found ${reference.label}`,
          );
        }
        continue;
      }

      const runtimeId = runtimeIdsByPath.get(reference.targetPath);
      if (runtimeId !== undefined) {
        runtimeReferences.set(
          reference.targetPath,
          (runtimeReferences.get(reference.targetPath) ?? 0) + 1,
        );
        if (reference.label !== runtimeId) {
          pushFileError(
            entry.file,
            `Requirement ${entry.id} label mismatch for ${reference.targetPath}: expected ${runtimeId} but found ${reference.label}`,
          );
        }
        continue;
      }

      pushFileError(
        entry.file,
        `Requirement ${entry.id} must link a local Pkl or runtime test suite artifact: ${reference.targetPath}`,
      );
    }
  }

  const coverageErrors: string[] = [];
  for (const [pathFromRoot, count] of suiteReferences.entries()) {
    if (count === 0) {
      coverageErrors.push(`Unlinked local test suite: ${pathFromRoot}`);
    }
  }
  for (const [pathFromRoot, count] of runtimeReferences.entries()) {
    if (count === 0) {
      coverageErrors.push(`Unlinked runtime test suite: ${pathFromRoot}`);
    }
  }

  const files = new Set(entries.map((entry) => entry.file));
  for (const file of requiredRequirementMatrixFiles) {
    files.add(file);
  }

  const messages = [...files].sort().map((file) => ({
    file: join(root, file),
    valid: (errorsByFile.get(file) ?? []).length === 0,
    errors: errorsByFile.get(file) ?? [],
  }));

  messages.push({
    file: join(root, "spec"),
    valid: coverageErrors.length === 0,
    errors: coverageErrors,
  });

  return messages;
}

export function validateNormativeChapterStructure(
  root: string = packageRoot(import.meta.url),
): ValidationMessage[] {
  return Object.entries(requiredNormativeHeadings).map(([file, requiredHeadings]) => {
    const absoluteFile = join(root, file);

    if (!existsSync(absoluteFile)) {
      return {
        file: absoluteFile,
        valid: false,
        errors: [`Missing normative chapter: ${file}`],
      };
    }

    const headings = new Set(
      readFileSync(absoluteFile, "utf8")
        .split(/\r?\n/u)
        .map(normalizeHeading)
        .filter((value): value is string => value !== null),
    );

    const errors = requiredHeadings
      .filter((heading) => !headings.has(heading))
      .map((heading) => `Missing required heading "${heading}" in ${file}`);

    return {
      file: absoluteFile,
      valid: errors.length === 0,
      errors,
    };
  });
}

export function validateUpstreamInventories(
  root: string = packageRoot(import.meta.url),
): ValidationMessage[] {
  const inventoryFiles = walkFiles(join(root, "sources", "upstream"), (file) =>
    file.endsWith(".pkl"),
  );

  return inventoryFiles.map((file) => {
    try {
      evaluatePklFile(file);
      return {
        file,
        valid: true,
        errors: [],
      };
    } catch (error) {
      return {
        file,
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  });
}

export function validateVendoredSnapshots(
  root: string = packageRoot(import.meta.url),
): ValidationMessage[] {
  const manifestFile = join(root, "sources", "copied", "vize", "expected-snapshots.pkl");

  try {
    const manifest = evaluatePklFile<VendoredSnapshotManifest>(manifestFile);
    const entries = Object.entries(manifest.entries);
    const errors: string[] = [];

    if (entries.length !== manifest.snapshotCount) {
      errors.push(
        `snapshotCount mismatch: manifest=${manifest.snapshotCount} actual=${entries.length}`,
      );
    }

    for (const [key, entry] of entries) {
      const file = join(root, entry.copiedPath);
      if (!existsSync(file)) {
        errors.push(`Missing vendored snapshot for ${key}: ${entry.copiedPath}`);
        continue;
      }

      const content = readFileSync(file);
      const actualSha = createHash("sha256").update(content).digest("hex");
      if (actualSha !== entry.sha256) {
        errors.push(`sha256 mismatch for ${key}`);
      }

      if (content.byteLength !== entry.bytes) {
        errors.push(
          `byte length mismatch for ${key}: manifest=${entry.bytes} actual=${content.byteLength}`,
        );
      }
    }

    return [
      {
        file: manifestFile,
        valid: errors.length === 0,
        errors,
      },
    ];
  } catch (error) {
    return [
      {
        file: manifestFile,
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      },
    ];
  }
}

function normalizeVendoredCorpusManifest(
  manifest: VendoredUpstreamCorpusManifest,
): VendoredUpstreamCorpusManifest {
  return {
    ...manifest,
    files: manifest.files.map((file) => ({
      ...file,
      issues: file.issues ?? [],
    })),
  };
}

function normalizeInventoryForVendoredComparison(
  inventory: UpstreamInventory,
  generatedAt: string,
): {
  repository: string;
  commit: string;
  generatedAt: string;
  counts: UpstreamInventory["counts"];
  files: Array<{
    sourcePath: string;
    kind: "test" | "benchmark";
    cases: UpstreamInventory["files"][number]["cases"];
    issues: UpstreamInventory["files"][number]["issues"];
  }>;
} {
  return {
    repository: inventory.repository,
    commit: inventory.commit,
    generatedAt,
    counts: {
      ...inventory.counts,
    },
    files: inventory.files.map((file) => ({
      sourcePath: file.path,
      kind: file.kind,
      cases: file.cases.map((entry) => ({
        ...entry,
      })),
      issues: file.issues.map((issue) => ({
        ...issue,
      })),
    })),
  };
}

function normalizeVendoredCorpusForInventoryComparison(
  manifest: VendoredUpstreamCorpusManifest,
): ReturnType<typeof normalizeInventoryForVendoredComparison> {
  return {
    repository: manifest.originRepository,
    commit: manifest.originCommit,
    generatedAt: manifest.generatedAt,
    counts: {
      ...manifest.counts,
    },
    files: manifest.files.map((file) => ({
      sourcePath: file.sourcePath,
      kind: file.kind,
      cases: file.cases.map((entry) => ({
        ...entry,
      })),
      issues: (file.issues ?? []).map((issue) => ({
        ...issue,
      })),
    })),
  };
}

export function validateVendoredUpstreamCorpora(
  root: string = packageRoot(import.meta.url),
): ValidationMessage[] {
  const manifests = loadVendoredUpstreamCorpora(root);
  const inventoryByRepository = new Map(
    walkFiles(join(root, "sources", "upstream"), (file) => file.endsWith(".pkl")).map((file) => {
      const inventory = evaluatePklFile<UpstreamInventory>(file);
      return [inventory.repository, inventory] as const;
    }),
  );

  return manifests.map((manifest) => {
    const manifestFile = join(
      root,
      "sources",
      "copied",
      manifest.originRepository.replaceAll("/", "-"),
      "test-corpus.pkl",
    );
    const normalizedManifest = normalizeVendoredCorpusManifest(manifest);
    const errors: string[] = [];
    const fileCount = normalizedManifest.files.length;
    const caseCount = normalizedManifest.files.reduce((sum, entry) => sum + entry.cases.length, 0);
    const issueCount = normalizedManifest.files.reduce(
      (sum, entry) => sum + entry.issues.length,
      0,
    );
    const benchmarkCount = normalizedManifest.files.filter(
      (entry) => entry.kind === "benchmark",
    ).length;

    if (normalizedManifest.counts.files !== fileCount) {
      errors.push(
        `files mismatch: manifest=${normalizedManifest.counts.files} actual=${fileCount}`,
      );
    }

    if (normalizedManifest.counts.cases !== caseCount) {
      errors.push(
        `cases mismatch: manifest=${normalizedManifest.counts.cases} actual=${caseCount}`,
      );
    }

    if (normalizedManifest.counts.issueRefs !== issueCount) {
      errors.push(
        `issueRefs mismatch: manifest=${normalizedManifest.counts.issueRefs} actual=${issueCount}`,
      );
    }

    if (normalizedManifest.counts.benchmarks !== benchmarkCount) {
      errors.push(
        `benchmarks mismatch: manifest=${normalizedManifest.counts.benchmarks} actual=${benchmarkCount}`,
      );
    }

    for (const entry of normalizedManifest.files) {
      const copiedFile = join(root, entry.copiedPath);
      if (!existsSync(copiedFile)) {
        errors.push(`Missing vendored source for ${entry.sourcePath}: ${entry.copiedPath}`);
        continue;
      }

      const content = readFileSync(copiedFile);
      const actualSha = createHash("sha256").update(content).digest("hex");
      if (actualSha !== entry.sha256) {
        errors.push(`sha256 mismatch for ${entry.sourcePath}`);
      }

      if (content.byteLength !== entry.bytes) {
        errors.push(
          `byte length mismatch for ${entry.sourcePath}: manifest=${entry.bytes} actual=${content.byteLength}`,
        );
      }
    }

    const inventory = inventoryByRepository.get(normalizedManifest.originRepository);
    if (!inventory) {
      errors.push(`Missing upstream inventory for ${normalizedManifest.originRepository}`);
    } else {
      try {
        assert.deepStrictEqual(
          normalizeVendoredCorpusForInventoryComparison(normalizedManifest),
          normalizeInventoryForVendoredComparison(inventory, normalizedManifest.generatedAt),
        );
      } catch {
        errors.push(
          `Vendored corpus diverges from upstream inventory for ${normalizedManifest.originRepository}`,
        );
      }
    }

    return {
      file: manifestFile,
      valid: errors.length === 0,
      errors,
    };
  });
}

export function validateUpstreamReferences(
  root: string = packageRoot(import.meta.url),
): ValidationMessage[] {
  const report = buildUpstreamCoverage(root);
  const snapshotManifestFile = join(root, "sources", "copied", "vize", "expected-snapshots.pkl");
  const errors: string[] = report.danglingReferences.map(
    (reference) =>
      `Unresolved ${reference.kind} reference: ${reference.repository} ${reference.source} :: ${reference.caseName} <- ${reference.localTestSuiteId}`,
  );

  try {
    const manifest = evaluatePklFile<VendoredSnapshotManifest>(snapshotManifestFile);
    const snapshotNameIndex = new Map<string, Set<string>>();

    for (const [source, entry] of Object.entries(manifest.entries)) {
      const copiedPath = join(root, entry.copiedPath);
      if (!existsSync(copiedPath)) {
        continue;
      }
      snapshotNameIndex.set(source, extractSnapshotNames(readFileSync(copiedPath, "utf8")));
    }

    for (const reference of loadLocalUpstreamReferences(root).filter(
      (entry) => entry.kind === "snapshot",
    )) {
      const snapshotNames = snapshotNameIndex.get(reference.source);
      if (!snapshotNames) {
        errors.push(
          `Snapshot source is not vendored: ${reference.repository} ${reference.source} <- ${reference.localTestSuiteId}`,
        );
        continue;
      }

      if (!snapshotNames.has(reference.caseName)) {
        errors.push(
          `Snapshot case is missing: ${reference.repository} ${reference.source} :: ${reference.caseName} <- ${reference.localTestSuiteId}`,
        );
      }
    }
  } catch (error) {
    errors.push(
      `Failed to validate snapshot references: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return [
    {
      file: join(root, "sources", "upstream"),
      valid: errors.length === 0,
      errors,
    },
  ];
}

export function validateUpstreamTraceability(
  root: string = packageRoot(import.meta.url),
): ValidationMessage[] {
  const expectedManifests = buildUpstreamTraceability(root);
  const actualFiles = walkFiles(join(root, "sources", "traceability"), (file) =>
    file.endsWith(".pkl"),
  );
  const actualByRepository = new Map<string, UpstreamTraceabilityManifest>();
  const messages: ValidationMessage[] = [];

  for (const file of actualFiles) {
    try {
      const manifest = evaluatePklFile<UpstreamTraceabilityManifest>(file);
      actualByRepository.set(manifest.repository, manifest);
    } catch (error) {
      messages.push({
        file,
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }

  for (const expected of expectedManifests) {
    const file = repositoryToTraceabilityFile(root, expected.repository);
    const actual = actualByRepository.get(expected.repository);

    if (!actual) {
      messages.push({
        file,
        valid: false,
        errors: [`Missing traceability manifest for ${expected.repository}`],
      });
      continue;
    }

    const normalizedActual = normalizeTraceabilityManifest({
      ...actual,
      generatedAt: expected.generatedAt,
    });
    const normalizedExpected = normalizeTraceabilityManifest(expected);

    try {
      assert.deepStrictEqual(normalizedActual, normalizedExpected);
      messages.push({
        file,
        valid: true,
        errors: [],
      });
    } catch {
      messages.push({
        file,
        valid: false,
        errors: [`Traceability manifest is out of date for ${expected.repository}`],
      });
    }
  }

  const expectedRepositories = new Set(expectedManifests.map((manifest) => manifest.repository));
  for (const [repository] of actualByRepository) {
    if (expectedRepositories.has(repository)) {
      continue;
    }

    messages.push({
      file: repositoryToTraceabilityFile(root, repository),
      valid: false,
      errors: [`Unexpected traceability manifest for ${repository}`],
    });
  }

  return messages.sort((left, right) => left.file.localeCompare(right.file));
}
