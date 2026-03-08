import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadGenericTestSuites } from "./catalog.ts";
import { packageRoot, walkFiles } from "./fs.ts";
import { evaluatePklFile } from "./pkl.ts";
import { runtimeTestSuites } from "./runtime/index.ts";
import type {
  DanglingUpstreamReference,
  UpstreamCoverageEntry,
  UpstreamCoverageReport,
  UpstreamCoverageRepositorySummary,
  UpstreamEvidenceKind,
  UpstreamInventory,
  UpstreamReference,
  UpstreamTraceabilityClassification,
  UpstreamTraceabilityEntry,
  UpstreamTraceabilityManifest,
  UpstreamTraceabilityStatus,
  VendoredUpstreamCorpusManifest,
} from "./types.ts";

export interface LocalUpstreamReference {
  localTestSuiteId: string;
  kind: UpstreamEvidenceKind;
  repository: string;
  source: string;
  caseName: string;
}

const COVERABLE_REFERENCE_KINDS = new Set<UpstreamEvidenceKind>(["test", "benchmark"]);

function createCoverageKey(repository: string, source: string, caseName: string): string {
  return `${repository}\u0000${source}\u0000${caseName}`;
}

export function normalizeUpstreamEvidenceKind(
  reference: Pick<UpstreamReference, "kind">,
): UpstreamEvidenceKind {
  return reference.kind ?? "test";
}

function expandUpstreamReferences(args: {
  localTestSuiteId: string;
  upstream: UpstreamReference[];
}): LocalUpstreamReference[] {
  return args.upstream.flatMap((reference) =>
    reference.cases.map((caseName) => ({
      localTestSuiteId: args.localTestSuiteId,
      kind: normalizeUpstreamEvidenceKind(reference),
      repository: reference.repository,
      source: reference.source,
      caseName,
    })),
  );
}

export function loadLocalUpstreamReferences(
  root: string = packageRoot(import.meta.url),
): LocalUpstreamReference[] {
  const genericReferences = loadGenericTestSuites(root).flatMap((entry) =>
    expandUpstreamReferences({
      localTestSuiteId: entry.data.id,
      upstream: entry.data.upstream,
    }),
  );

  const runtimeReferences = runtimeTestSuites.flatMap((runtimeTestSuite) =>
    expandUpstreamReferences({
      localTestSuiteId: runtimeTestSuite.id,
      upstream: runtimeTestSuite.upstream,
    }),
  );

  return [...genericReferences, ...runtimeReferences];
}

function buildCoverageMap(localReferences: LocalUpstreamReference[]): Map<string, Set<string>> {
  const coverageMap = new Map<string, Set<string>>();

  for (const reference of localReferences) {
    if (!COVERABLE_REFERENCE_KINDS.has(reference.kind)) {
      continue;
    }

    const key = createCoverageKey(reference.repository, reference.source, reference.caseName);
    const coveredBy = coverageMap.get(key) ?? new Set<string>();
    coveredBy.add(reference.localTestSuiteId);
    coverageMap.set(key, coveredBy);
  }

  return coverageMap;
}

function inferProfile(repository: string, source: string, name: string): string | null {
  if (
    repository === "ubugeeei/vize" &&
    (source.includes("/vapor/") || source.includes("atelier") || /\bvapor\b/i.test(name))
  ) {
    return "vapor";
  }

  if (repository === "vuejs/core" && source.includes("vue-compat")) {
    return "compat";
  }

  return null;
}

function classifyUpstreamEntry(args: {
  repository: string;
  source: string;
  name: string;
  kind: "test" | "benchmark";
}): {
  classification: UpstreamTraceabilityClassification;
  rationale: string;
} {
  const { repository, source, kind } = args;

  if (kind === "benchmark") {
    return {
      classification: "benchmark-harness",
      rationale:
        "Benchmark-oriented upstream coverage is tracked as workload evidence and promoted selectively into curated benchmark test suites.",
    };
  }

  if (repository === "vuejs/language-tools") {
    if (
      source.startsWith("packages/component-meta/") ||
      source.startsWith("packages/language-plugin-pug/")
    ) {
      return {
        classification: "portable-language",
        rationale:
          "This upstream case describes portable Vue metadata or preprocessing behavior that should eventually become a local executable conformance test suite.",
      };
    }

    return {
      classification: "tooling-host",
      rationale:
        "This upstream case depends on TypeScript, LSP, or editor-host behavior and is therefore tracked at the traceability layer instead of the portable conformance suite.",
    };
  }

  if (repository === "ubugeeei/vize") {
    if (source.includes("/vrt/")) {
      return {
        classification: "visual-regression",
        rationale:
          "This upstream case is a visual-regression scenario tied to fixture applications and screenshot baselines, so it remains traceability-only.",
      };
    }

    if (
      source.startsWith("tests/app/") ||
      source.includes("musea-gallery") ||
      source.includes("wasm.test.ts") ||
      source.includes("atelier")
    ) {
      return {
        classification: "integration-host",
        rationale:
          "This upstream case depends on application fixtures, playground wiring, or environment-specific integration and is therefore tracked rather than normalized into a portable test suite.",
      };
    }

    if (source.includes("components.test.ts") || source.includes("playground/src/simple.test.ts")) {
      return {
        classification: "runtime-host",
        rationale:
          "This upstream case describes observable runtime behavior that should eventually be promoted into the Browser Mode runtime suite.",
      };
    }

    return {
      classification: "portable-language",
      rationale:
        "This upstream case describes parser, compiler, or SFC behavior that should eventually become a local Pkl conformance test suite.",
    };
  }

  if (repository === "vuejs/core") {
    if (source.includes("/e2e/")) {
      return {
        classification: "integration-host",
        rationale:
          "This upstream case exercises browser-level integration behavior and is therefore tracked separately from the portable suite.",
      };
    }

    if (
      source.includes("compiler-") ||
      source.includes("packages/shared/") ||
      source.includes("packages/vue-compat/__tests__/compiler")
    ) {
      return {
        classification: "portable-language",
        rationale:
          "This upstream case describes compiler, parser, SFC, or shared observable behavior that should eventually be curated into a portable conformance test suite.",
      };
    }

    return {
      classification: "runtime-host",
      rationale:
        "This upstream case describes runtime or reactivity behavior that should eventually be promoted into the JavaScript runtime conformance suite.",
    };
  }

  return {
    classification: "portable-language",
    rationale:
      "This upstream case is tracked as portable language behavior until a repository-specific rule narrows it further.",
  };
}

function defaultStatusForClassification(
  classification: UpstreamTraceabilityClassification,
): UpstreamTraceabilityStatus {
  return classification === "portable-language" || classification === "runtime-host"
    ? "planned"
    : "tracked";
}

export function loadUpstreamInventories(
  root: string = packageRoot(import.meta.url),
): UpstreamInventory[] {
  const upstreamRoot = join(root, "sources", "upstream");
  const inventories = walkFiles(upstreamRoot, (file) => file.endsWith(".pkl")).map((file) =>
    evaluatePklFile<UpstreamInventory>(file),
  );
  const vendoredByRepository = new Map(
    loadVendoredUpstreamCorpora(root).map((manifest) => [
      manifest.originRepository,
      vendoredCorpusToInventory(manifest),
    ]),
  );
  const seenRepositories = new Set<string>();

  return [
    ...inventories.map((inventory) => {
      seenRepositories.add(inventory.repository);
      return vendoredByRepository.get(inventory.repository) ?? inventory;
    }),
    ...[...vendoredByRepository.entries()]
      .filter(([repository]) => !seenRepositories.has(repository))
      .map(([, inventory]) => inventory),
  ].sort((left, right) => left.repository.localeCompare(right.repository));
}

function vendoredCorpusToInventory(manifest: VendoredUpstreamCorpusManifest): UpstreamInventory {
  return {
    repository: manifest.originRepository,
    commit: manifest.originCommit,
    generatedAt: manifest.generatedAt,
    counts: {
      ...manifest.counts,
    },
    files: manifest.files.map((file) => ({
      path: file.sourcePath,
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

export function loadVendoredUpstreamCorpora(
  root: string = packageRoot(import.meta.url),
): VendoredUpstreamCorpusManifest[] {
  const copiedRoot = join(root, "sources", "copied");
  if (!existsSync(copiedRoot)) {
    return [];
  }

  return walkFiles(copiedRoot, (file) => file.endsWith("test-corpus.pkl"))
    .map((file) => evaluatePklFile<VendoredUpstreamCorpusManifest>(file))
    .sort((left, right) => left.originRepository.localeCompare(right.originRepository));
}

export function buildUpstreamCoverage(
  root: string = packageRoot(import.meta.url),
): UpstreamCoverageReport {
  const inventories = loadUpstreamInventories(root);
  const localReferences = loadLocalUpstreamReferences(root);
  const coverageMap = buildCoverageMap(localReferences);

  const inventoryKeys = new Set<string>();
  const repositories: UpstreamCoverageRepositorySummary[] = [];
  const uncovered: UpstreamCoverageEntry[] = [];

  for (const inventory of inventories) {
    let coveredCases = 0;
    let uncoveredCases = 0;

    for (const file of inventory.files) {
      for (const entry of file.cases) {
        const key = createCoverageKey(inventory.repository, file.path, entry.name);
        inventoryKeys.add(key);
        const coveredBy = [...(coverageMap.get(key) ?? new Set<string>())].sort();

        if (coveredBy.length > 0) {
          coveredCases += 1;
          continue;
        }

        uncoveredCases += 1;
        uncovered.push({
          repository: inventory.repository,
          source: file.path,
          name: entry.name,
          kind: entry.kind,
          line: entry.line,
          coveredBy,
        });
      }
    }

    repositories.push({
      repository: inventory.repository,
      files: inventory.counts.files,
      totalCases: inventory.counts.cases,
      coveredCases,
      uncoveredCases,
    });
  }

  const danglingReferences: DanglingUpstreamReference[] = localReferences
    .filter((reference) => COVERABLE_REFERENCE_KINDS.has(reference.kind))
    .filter(
      (reference) =>
        !inventoryKeys.has(
          createCoverageKey(reference.repository, reference.source, reference.caseName),
        ),
    )
    .sort((left, right) =>
      createCoverageKey(left.repository, left.source, left.caseName).localeCompare(
        createCoverageKey(right.repository, right.source, right.caseName),
      ),
    );

  return {
    generatedAt: new Date().toISOString(),
    repositories,
    uncovered: uncovered.sort((left, right) =>
      createCoverageKey(left.repository, left.source, left.name).localeCompare(
        createCoverageKey(right.repository, right.source, right.name),
      ),
    ),
    danglingReferences,
  };
}

export function buildUpstreamTraceability(
  root: string = packageRoot(import.meta.url),
): UpstreamTraceabilityManifest[] {
  const generatedAt = new Date().toISOString();
  const inventories = loadUpstreamInventories(root);
  const coverageMap = buildCoverageMap(loadLocalUpstreamReferences(root));

  return inventories.map((inventory) => {
    const entries: UpstreamTraceabilityEntry[] = inventory.files
      .flatMap((file) =>
        file.cases.map((entry) => {
          const localTestSuites = [
            ...(coverageMap.get(createCoverageKey(inventory.repository, file.path, entry.name)) ??
              new Set<string>()),
          ].sort();
          const profile = inferProfile(inventory.repository, file.path, entry.name);
          const { classification, rationale } = classifyUpstreamEntry({
            repository: inventory.repository,
            source: file.path,
            name: entry.name,
            kind: entry.kind,
          });
          const status =
            localTestSuites.length > 0 ? "covered" : defaultStatusForClassification(classification);

          return {
            source: file.path,
            name: entry.name,
            kind: entry.kind,
            line: entry.line,
            classification,
            status,
            profile,
            localTestSuites,
            fileIssues: [...new Set(file.issues.map((issue) => issue.label))].sort(),
            rationale,
          };
        }),
      )
      .sort((left, right) =>
        createCoverageKey(inventory.repository, left.source, left.name).localeCompare(
          createCoverageKey(inventory.repository, right.source, right.name),
        ),
      );

    const counts = entries.reduce(
      (summary, entry) => {
        summary.total += 1;
        summary[entry.status] += 1;
        return summary;
      },
      {
        total: 0,
        covered: 0,
        planned: 0,
        tracked: 0,
      },
    );

    return {
      repository: inventory.repository,
      commit: inventory.commit,
      generatedAt,
      counts,
      entries,
    };
  });
}
