import { existsSync } from "node:fs";
import { loadGenericTestSuites } from "./catalog.ts";
import { packageRoot, walkFiles } from "./fs.ts";
import { provenanceInventoriesRoot, provenanceVendorRoot } from "./layout.ts";
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

interface EquivalentCoverageAlias {
  repository: string;
  source: string;
  caseName: string;
  localTestSuites: string[];
}

const COVERABLE_REFERENCE_KINDS = new Set<UpstreamEvidenceKind>(["test", "benchmark"]);

function createCoverageKey(repository: string, source: string, caseName: string): string {
  return `${repository}\u0000${source}\u0000${caseName}`;
}

const equivalentCoverageAliases: EquivalentCoverageAlias[] = [
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/sfc-compile.test.ts",
    caseName: "should compile SFC with script setup",
    localTestSuites: ["compiler.sfc.vize-sfc-basic-script-setup-with-template"],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/sfc-compile.test.ts",
    caseName: "should compile SFC with both script and script setup",
    localTestSuites: [
      "syntax.sfc.script-and-script-setup",
      "compiler.sfc.vize-sfc-script-setup-script-before-script-setup",
      "compiler.sfc.vize-sfc-script-setup-script-setup-before-script",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/sfc-compile.test.ts",
    caseName: "should compile event handlers",
    localTestSuites: ["compiler.sfc.vize-sfc-script-setup-template-with-event-handler"],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/sfc-compile.test.ts",
    caseName: "should compile slot content",
    localTestSuites: [
      "compiler.template.component-named-slot",
      "compiler.template.vize-vdom-v-slot-default-slot-content",
      "compiler.template.vize-vdom-v-slot-named-slot",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/sfc-compile.test.ts",
    caseName: "should compile v-model directive",
    localTestSuites: [
      "compiler.sfc.vize-sfc-script-setup-template-with-v-model-on-ref",
      "compiler.template.v-model-text",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/sfc-compile.test.ts",
    caseName: "should handle complex generic types",
    localTestSuites: [
      "compiler.sfc.vize-sfc-patches-ref-with-generic-type-should-be-stripped",
      "compiler.sfc.vize-sfc-script-setup-generic-component-with-complex-constraint",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/sfc-compile.test.ts",
    caseName: "should handle defineEmits with type parameter",
    localTestSuites: [
      "compiler.sfc.vize-sfc-script-setup-defineemits-with-typed-function-signatures",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/sfc-compile.test.ts",
    caseName: "should handle interface declarations",
    localTestSuites: [
      "compiler.sfc.vize-sfc-script-setup-script-with-interfaces-before-script-setup",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/sfc-compile.test.ts",
    caseName: "should handle type aliases",
    localTestSuites: [
      "compiler.sfc.vize-sfc-script-setup-script-with-type-definitions-and-script-setup",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/sfc-compile.test.ts",
    caseName: "should handle withDefaults",
    localTestSuites: [
      "compiler.sfc.vize-sfc-script-setup-withdefaults-with-object-type",
      "compiler.script.with-defaults-typed-props",
      "type-evaluation.props.with-defaults-literal",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/sfc-compile.test.ts",
    caseName: "should strip generic type parameters from ref/reactive",
    localTestSuites: ["compiler.sfc.vize-sfc-patches-ref-with-generic-type-should-be-stripped"],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/sfc-compile.test.ts",
    caseName: "should strip type annotations from script setup",
    localTestSuites: [
      "compiler.sfc.vize-sfc-basic-lang-attributes",
      "compiler.sfc.vize-sfc-script-setup-multiline-const-with-type-annotation",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle async/await with types",
    localTestSuites: [
      "compiler.sfc.vize-sfc-patches-top-level-await-generates-async-setup",
      "compiler.sfc.vize-sfc-script-setup-top-level-await-in-initialization",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle class with decorators pattern",
    localTestSuites: ["compiler.sfc.vize-sfc-script-setup-class-declarations"],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle deeply nested templates",
    localTestSuites: [
      "compiler.template.vize-vdom-element-deeply-nested",
      "parser.template.vize-parser-element-deeply-nested-elements",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle defineExpose",
    localTestSuites: [
      "compiler.sfc.vize-sfc-script-setup-defineexpose",
      "compiler.script.define-expose-basic",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle defineModel",
    localTestSuites: [
      "compiler.sfc.vize-sfc-script-setup-definemodel-basic",
      "compiler.script.define-model-basic",
      "type-evaluation.props.define-model-basic",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle defineModel with options",
    localTestSuites: ["compiler.sfc.vize-sfc-script-setup-definemodel-with-options"],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle defineOptions",
    localTestSuites: [
      "compiler.sfc.vize-sfc-script-setup-defineoptions",
      "compiler.script.define-options-basic",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle defineSlots with types",
    localTestSuites: [
      "compiler.sfc.vize-sfc-script-setup-defineslots",
      "compiler.script.define-slots-basic",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle enum declarations",
    localTestSuites: [
      "compiler.sfc.vize-sfc-script-setup-script-with-type-definitions-and-script-setup",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle const enum declarations",
    localTestSuites: [
      "compiler.sfc.vize-sfc-script-setup-script-with-type-definitions-and-script-setup",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle generic function declarations",
    localTestSuites: ["compiler.sfc.vize-sfc-script-setup-function-declarations"],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle keep-alive",
    localTestSuites: [
      "compiler.template.vize-vdom-component-keepalive",
      "compiler.template.vize-vapor-component-keepalive",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle multiple root elements (fragments)",
    localTestSuites: ["compiler.template.vize-vdom-element-multiple-children"],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle special HTML entities",
    localTestSuites: ["parser.template.decode-entities-default"],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle suspense",
    localTestSuites: [
      "compiler.template.vize-vdom-component-suspense",
      "compiler.template.vize-vapor-component-suspense",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle teleport",
    localTestSuites: [
      "compiler.template.vize-vdom-component-teleport",
      "compiler.template.vize-vapor-component-teleport",
    ],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle template with only whitespace",
    localTestSuites: ["parser.template.vize-parser-text-only-whitespace"],
  },
  {
    repository: "ubugeeei/vize",
    source: "playground/e2e/edge-cases.test.ts",
    caseName: "should handle unicode in template",
    localTestSuites: [
      "parser.template.vize-parser-text-text-with-unicode",
      "parser.template.vize-parser-interpolation-interpolation-with-unicode",
    ],
  },
];

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

function applyEquivalentCoverageAliases(coverageMap: Map<string, Set<string>>): void {
  for (const alias of equivalentCoverageAliases) {
    const key = createCoverageKey(alias.repository, alias.source, alias.caseName);
    const coveredBy = coverageMap.get(key) ?? new Set<string>();
    for (const localTestSuiteId of alias.localTestSuites) {
      coveredBy.add(localTestSuiteId);
    }
    coverageMap.set(key, coveredBy);
  }
}

function inferProfile(repository: string, source: string, name: string): string | null {
  if (
    repository === "ubugeeei/vize" &&
    (source.includes("/vapor/") || source.includes("atelier") || /\bvapor\b/i.test(name))
  ) {
    return "vapor";
  }

  if (repository === "vuejs/vue-jsx-vapor") {
    return "jsx-vapor";
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
  const { repository, source, name, kind } = args;

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

    if (source.includes("vite-plugin-vapor.test.ts")) {
      return {
        classification: "tooling-host",
        rationale:
          "This upstream case depends on the Vite plugin wrapper, plugin option builders, or playground application compilation and is therefore tracked as tooling-host behavior.",
      };
    }

    if (source.startsWith("npm/")) {
      return {
        classification: "tooling-host",
        rationale:
          "This upstream case depends on bundler-plugin wrappers, host build tools, or compile-time flag injection rather than the portable parser/compiler contract, so it remains tooling-host coverage.",
      };
    }

    if (source.includes("css-compile.test.ts") && name.toLowerCase().includes("minify")) {
      return {
        classification: "tooling-host",
        rationale:
          "This upstream case exercises implementation-specific CSS minify toggles rather than stable portable Vue language semantics, so it remains tooling-host coverage.",
      };
    }

    if (source.includes("sfc-compile.test.ts") && name === "should compile SFC in SSR mode") {
      return {
        classification: "tooling-host",
        rationale:
          "This upstream case depends on an SSR-oriented compile wrapper surface that is tracked separately from the current portable static suite.",
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

  if (repository === "vuejs/vue-jsx-vapor") {
    if (source.includes("/playground/") || source.includes("/demo/") || source.includes("/e2e/")) {
      return {
        classification: "integration-host",
        rationale:
          "This upstream case depends on JSX Vapor playground wiring, demo applications, or browser-host integration and is therefore tracked separately from the portable suite.",
      };
    }

    return {
      classification: "portable-language",
      rationale:
        "This upstream case describes JSX-authored Vapor compiler behavior that should eventually become a local profile-scoped conformance test suite.",
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
  const upstreamRoot = provenanceInventoriesRoot(root);
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
  const copiedRoot = provenanceVendorRoot(root);
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
  applyEquivalentCoverageAliases(coverageMap);

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
  applyEquivalentCoverageAliases(coverageMap);

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
