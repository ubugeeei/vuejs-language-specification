import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import * as specificationApi from "../src/index.ts";
import * as runtimeApi from "../src/runtime/index.ts";
import {
  buildCatalog,
  buildReleaseManifest,
  buildUpstreamCoverage,
  buildUpstreamTraceability,
  loadReleaseManifest,
  loadRequirementMatrixEntries,
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
} from "../src/index.ts";

const REPOSITORY_TIMEOUT_MS = 60_000;
const INVENTORY_TIMEOUT_MS = 20_000;

function loadStableLines(file: string): string[] {
  return readFileSync(new URL(file, import.meta.url), "utf8")
    .split(/\r?\n/u)
    .filter((line) => line.length > 0);
}

describe("catalog and validation", () => {
  test(
    "catalog exposes stable ids",
    () => {
      const catalog = buildCatalog();
      expect(catalog.map((entry) => entry.id)).toEqual(
        loadStableLines("../provenance/stability/stable-catalog-ids.txt"),
      );
    },
    REPOSITORY_TIMEOUT_MS,
  );

  test(
    "all pkl test suites validate",
    () => {
      expect(validateTestSuites().every((result) => result.valid)).toBe(true);
    },
    REPOSITORY_TIMEOUT_MS,
  );

  test(
    "all runtime test suites validate",
    () => {
      expect(validateRuntimeTestSuites().every((result) => result.valid)).toBe(true);
    },
    REPOSITORY_TIMEOUT_MS,
  );

  test(
    "all requirement matrices validate",
    () => {
      expect(validateRequirementMatrices().every((result) => result.valid)).toBe(true);
    },
    REPOSITORY_TIMEOUT_MS,
  );

  test(
    "normative chapter structure stays formalized",
    () => {
      expect(validateNormativeChapterStructure().every((result) => result.valid)).toBe(true);
    },
    REPOSITORY_TIMEOUT_MS,
  );

  test("release manifest stays in sync with the canonical repository snapshot", () => {
    expect(loadReleaseManifest()).toEqual(buildReleaseManifest());
  });

  test("release manifest validates", () => {
    expect(validateReleaseManifest().every((result) => result.valid)).toBe(true);
  });

  test(
    "repository naming conventions stay on canonical test-suite terms",
    () => {
      expect(validateRepositoryConventions().every((result) => result.valid)).toBe(true);
    },
    REPOSITORY_TIMEOUT_MS,
  );

  test("repository naming validator rejects legacy local naming artifacts", () => {
    const root = mkdtempSync(join(tmpdir(), "vue-language-spec-conventions-"));
    mkdirSync(join(root, "cases"), { recursive: true });
    mkdirSync(join(root, "testsuites", "compiler", "script"), { recursive: true });
    mkdirSync(join(root, "src"), { recursive: true });
    mkdirSync(join(root, "runtime", "testsuites"), { recursive: true });
    writeFileSync(
      join(root, "testsuites", "compiler", "script", "sample.pkl"),
      [
        'amends "../../../schemas/CompilerCase.pkl"',
        "",
        'id = "compiler.script.sample"',
        'title = "sample"',
        'kind = "sfc-script-compile"',
        'summary = "sample"',
        "features {}",
        "upstream {}",
        "input {}",
        "expect {}",
        "",
      ].join("\n"),
    );
    writeFileSync(
      join(root, "runtime", "testsuites", "sample.ts"),
      "export const sampleRuntime = {};\n",
    );
    writeFileSync(
      join(root, "src", "legacy-alias.ts"),
      'export const note = "loadGenericCases src/runtime/cases/";\n',
    );

    const messages = validateRepositoryConventions(root);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.valid).toBe(false);
    expect(messages[0]?.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Legacy local naming artifact exists: cases"),
        expect.stringContaining("Test suite must amend a canonical *TestSuite schema"),
        expect.stringContaining(
          "Runtime test suite module must export a canonical *TestSuite binding",
        ),
        expect.stringContaining('Legacy local naming token "loadGenericCases"'),
        expect.stringContaining('Legacy local naming token "src/runtime/cases/"'),
      ]),
    );
  });

  test("public api exposes canonical test-suite names only", () => {
    expect(specificationApi).toHaveProperty("discoverTestSuiteFiles");
    expect(specificationApi).toHaveProperty("discoverRequirementMatrixFiles");
    expect(specificationApi).toHaveProperty("buildReleaseManifest");
    expect(specificationApi).toHaveProperty("loadGenericTestSuites");
    expect(specificationApi).toHaveProperty("loadRequirementMatrixEntries");
    expect(specificationApi).toHaveProperty("loadReleaseManifest");
    expect(specificationApi).toHaveProperty("validateNormativeChapterStructure");
    expect(specificationApi).toHaveProperty("validateReleaseManifest");
    expect(specificationApi).toHaveProperty("validateRequirementMatrices");
    expect(specificationApi).toHaveProperty("validateRepositoryConventions");
    expect(specificationApi).toHaveProperty("validateTestSuites");
    expect(specificationApi).toHaveProperty("runBenchmarkTestSuite");
    expect(specificationApi).toHaveProperty("runCompilerReferenceTestSuite");
    expect(specificationApi).toHaveProperty("runParserReferenceTestSuite");
    expect(specificationApi).toHaveProperty("runSyntaxReferenceTestSuite");
    expect(specificationApi).toHaveProperty("runTypeEvaluationReferenceTestSuite");
    expect(specificationApi).not.toHaveProperty("discoverCaseFiles");
    expect(specificationApi).not.toHaveProperty("loadGenericCases");
    expect(specificationApi).not.toHaveProperty("validateCases");
    expect(specificationApi).not.toHaveProperty("runBenchmarkCase");
    expect(specificationApi).not.toHaveProperty("runCompilerReferenceCase");
    expect(specificationApi).not.toHaveProperty("runParserReferenceCase");
    expect(specificationApi).not.toHaveProperty("runSyntaxReferenceCase");
    expect(specificationApi).not.toHaveProperty("runTypeEvaluationReferenceCase");

    expect(runtimeApi).toHaveProperty("runtimeTestSuites");
    expect(runtimeApi).toHaveProperty("browserRuntimeTestSuites");
    expect(runtimeApi).toHaveProperty("nodeRuntimeTestSuites");
    expect(runtimeApi).toHaveProperty("runRuntimeTestSuites");
    expect(runtimeApi).not.toHaveProperty("runtimeCases");
    expect(runtimeApi).not.toHaveProperty("browserRuntimeCases");
    expect(runtimeApi).not.toHaveProperty("nodeRuntimeCases");
    expect(runtimeApi).not.toHaveProperty("runRuntimeCases");
  });

  test(
    "requirement matrix ids stay stable and unique",
    () => {
      const requirements = loadRequirementMatrixEntries();

      expect(requirements.map((entry) => entry.id)).toEqual(
        loadStableLines("../provenance/stability/stable-requirement-ids.txt"),
      );
      expect(new Set(requirements.map((entry) => entry.id)).size).toBe(requirements.length);
    },
    REPOSITORY_TIMEOUT_MS,
  );

  test(
    "all upstream inventories validate",
    () => {
      expect(validateUpstreamInventories().every((result) => result.valid)).toBe(true);
    },
    REPOSITORY_TIMEOUT_MS,
  );

  test(
    "all upstream references resolve exactly",
    () => {
      expect(validateUpstreamReferences().every((result) => result.valid)).toBe(true);
    },
    INVENTORY_TIMEOUT_MS,
  );

  test(
    "upstream coverage report includes every inventoried repository",
    () => {
      const report = buildUpstreamCoverage();
      expect(report.repositories.map((entry) => entry.repository)).toEqual([
        "ubugeeei/vize",
        "vuejs/core",
        "vuejs/language-tools",
      ]);
      expect(report.repositories.every((entry) => entry.totalCases > 0)).toBe(true);
    },
    INVENTORY_TIMEOUT_MS,
  );

  test(
    "traceability manifests cover every inventoried repository",
    () => {
      const manifests = buildUpstreamTraceability();
      expect(manifests.map((entry) => entry.repository)).toEqual([
        "ubugeeei/vize",
        "vuejs/core",
        "vuejs/language-tools",
      ]);
      expect(manifests.every((entry) => entry.counts.total > 0)).toBe(true);
    },
    INVENTORY_TIMEOUT_MS,
  );

  test(
    "traceability manifests validate",
    () => {
      expect(validateUpstreamTraceability().every((result) => result.valid)).toBe(true);
    },
    INVENTORY_TIMEOUT_MS,
  );

  test(
    "all vendored upstream corpora validate",
    () => {
      expect(validateVendoredUpstreamCorpora().every((result) => result.valid)).toBe(true);
    },
    REPOSITORY_TIMEOUT_MS,
  );

  test(
    "all copied snapshot oracles validate",
    () => {
      expect(validateVendoredSnapshots().every((result) => result.valid)).toBe(true);
    },
    REPOSITORY_TIMEOUT_MS,
  );
});
