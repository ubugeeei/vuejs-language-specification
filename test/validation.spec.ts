import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import * as specificationApi from "../src/index.ts";
import * as runtimeApi from "../src/runtime/index.ts";
import {
  buildCatalog,
  buildUpstreamCoverage,
  buildUpstreamTraceability,
  loadRequirementMatrixEntries,
  validateNormativeChapterStructure,
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

const INVENTORY_TIMEOUT_MS = 20_000;

describe("catalog and validation", () => {
  test("catalog exposes stable ids", () => {
    const catalog = buildCatalog();
    expect(catalog.map((entry) => entry.id)).toEqual([
      "benchmark.compiler.sfc-batch-compile",
      "benchmark.reactivity.computed-fanout",
      "compiler.script.define-emits-array",
      "compiler.script.define-emits-both-args-error",
      "compiler.script.define-emits-mixed-syntax-error",
      "compiler.script.define-expose-basic",
      "compiler.script.define-model-basic",
      "compiler.script.define-model-named",
      "compiler.script.define-options-basic",
      "compiler.script.define-options-duplicate-error",
      "compiler.script.define-options-emits-error",
      "compiler.script.define-options-empty",
      "compiler.script.define-options-expose-error",
      "compiler.script.define-options-generic-error",
      "compiler.script.define-options-props-error",
      "compiler.script.define-options-slots-error",
      "compiler.script.define-props-both-args-error",
      "compiler.script.define-props-destructure-alias",
      "compiler.script.define-props-destructure-assign-error",
      "compiler.script.define-props-destructure-basic",
      "compiler.script.define-props-destructure-computed-key-error",
      "compiler.script.define-props-destructure-computed-static-key",
      "compiler.script.define-props-destructure-deep-array-error",
      "compiler.script.define-props-destructure-deep-object-error",
      "compiler.script.define-props-destructure-defaults",
      "compiler.script.define-props-destructure-for-of-shadowing",
      "compiler.script.define-props-destructure-for-shadowing",
      "compiler.script.define-props-destructure-function-parameter-shadowing",
      "compiler.script.define-props-destructure-local-ref-error",
      "compiler.script.define-props-destructure-multi-variable-declaration",
      "compiler.script.define-props-destructure-multi-variable-declaration-fix-6757",
      "compiler.script.define-props-destructure-multi-variable-declaration-fix-7422",
      "compiler.script.define-props-destructure-non-identifier-key",
      "compiler.script.define-props-destructure-rest",
      "compiler.script.define-props-destructure-rest-non-inline",
      "compiler.script.define-props-destructure-watch-error",
      "compiler.script.define-props-destructure-with-defaults-warning",
      "compiler.script.define-props-emits-multi-variable",
      "compiler.script.define-props-runtime-options",
      "compiler.script.define-slots-basic",
      "compiler.script.define-slots-erased-unused",
      "compiler.script.with-defaults-typed-props",
      "compiler.style.deep-selector",
      "compiler.style.global-selector",
      "compiler.style.scoped-style",
      "compiler.style.slotted-selector",
      "compiler.template.component-named-slot",
      "compiler.template.hoisted-static-props",
      "compiler.template.slot-fallback",
      "compiler.template.v-bind-object-merge-props",
      "compiler.template.v-for-keyed-list",
      "compiler.template.v-html-basic",
      "compiler.template.v-if-basic",
      "compiler.template.v-model-arg-error",
      "compiler.template.v-model-bind-shorthand-type",
      "compiler.template.v-model-checkbox",
      "compiler.template.v-model-custom-element",
      "compiler.template.v-model-dynamic-type",
      "compiler.template.v-model-file-input-error",
      "compiler.template.v-model-invalid-element-error",
      "compiler.template.v-model-lazy",
      "compiler.template.v-model-number",
      "compiler.template.v-model-radio",
      "compiler.template.v-model-select",
      "compiler.template.v-model-static-value",
      "compiler.template.v-model-text",
      "compiler.template.v-model-textarea",
      "compiler.template.v-model-trim",
      "compiler.template.v-model-unnecessary-value-error",
      "compiler.template.v-on-click-handler",
      "compiler.template.v-once-cached-subtree",
      "compiler.template.v-text-basic",
      "parser.template.class-attribute-normalization",
      "parser.template.comment-preservation",
      "parser.template.comments-disabled",
      "parser.template.component-tag-type",
      "parser.template.custom-delimiters",
      "parser.template.decode-entities-default",
      "parser.template.directive-and-interpolation",
      "parser.template.dom-root-svg-namespace",
      "parser.template.dom-svg-foreign-object-namespace",
      "parser.template.dynamic-arg-modifier",
      "parser.template.element-nesting",
      "parser.template.html-rcdata-textarea",
      "parser.template.missing-end-tag-error",
      "parser.template.native-custom-tag-classification",
      "parser.template.sfc-root-raw-text",
      "parser.template.text-with-tag-like-interpolation",
      "parser.template.unquoted-attribute-self-closing",
      "parser.template.v-pre-literal-content",
      "parser.template.void-tag-recognition",
      "parser.template.whitespace-condense-between-elements",
      "parser.template.whitespace-preserve-between-elements",
      "syntax.sfc.basic-template-only",
      "syntax.sfc.multiple-styles-and-custom-block",
      "syntax.sfc.script-and-script-setup",
      "syntax.sfc.script-setup-and-scoped-style",
      "type-evaluation.props.basic-type-literal",
      "type-evaluation.props.boolean-function-array",
      "type-evaluation.props.define-model-basic",
      "type-evaluation.props.define-model-named",
      "type-evaluation.props.destructure-defaults",
      "type-evaluation.props.interface-extends",
      "type-evaluation.props.union-intersection-props",
      "type-evaluation.props.unknown-any-null-runtime-type",
      "type-evaluation.props.with-defaults-literal",
    ]);
  });

  test("all pkl test suites validate", () => {
    expect(validateTestSuites().every((result) => result.valid)).toBe(true);
  });

  test("all runtime test suites validate", () => {
    expect(validateRuntimeTestSuites().every((result) => result.valid)).toBe(true);
  });

  test("all requirement matrices validate", () => {
    expect(validateRequirementMatrices().every((result) => result.valid)).toBe(true);
  });

  test("normative chapter structure stays formalized", () => {
    expect(validateNormativeChapterStructure().every((result) => result.valid)).toBe(true);
  });

  test("repository naming conventions stay on canonical test-suite terms", () => {
    expect(validateRepositoryConventions().every((result) => result.valid)).toBe(true);
  });

  test("repository naming validator rejects legacy local naming artifacts", () => {
    const root = mkdtempSync(join(tmpdir(), "vue-language-spec-conventions-"));
    mkdirSync(join(root, "cases"), { recursive: true });
    mkdirSync(join(root, "testsuites", "compiler", "script"), { recursive: true });
    mkdirSync(join(root, "src"), { recursive: true });
    mkdirSync(join(root, "src", "runtime", "testsuites"), { recursive: true });
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
      join(root, "src", "runtime", "testsuites", "sample.ts"),
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
    expect(specificationApi).toHaveProperty("loadGenericTestSuites");
    expect(specificationApi).toHaveProperty("loadRequirementMatrixEntries");
    expect(specificationApi).toHaveProperty("validateNormativeChapterStructure");
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

  test("requirement matrix ids stay stable and unique", () => {
    const requirements = loadRequirementMatrixEntries();

    expect(requirements.map((entry) => entry.id)).toEqual([
      "BENCH-1",
      "BENCH-2",
      "CMP-CSS-1",
      "CMP-CSS-2",
      "CMP-CSS-3",
      "CMP-CSS-4",
      "CMP-SCR-1",
      "CMP-SCR-10",
      "CMP-SCR-11",
      "CMP-SCR-12",
      "CMP-SCR-13",
      "CMP-SCR-14",
      "CMP-SCR-2",
      "CMP-SCR-3",
      "CMP-SCR-4",
      "CMP-SCR-5",
      "CMP-SCR-6",
      "CMP-SCR-7",
      "CMP-SCR-8",
      "CMP-SCR-9",
      "CMP-TPL-1",
      "CMP-TPL-10",
      "CMP-TPL-11",
      "CMP-TPL-12",
      "CMP-TPL-13",
      "CMP-TPL-14",
      "CMP-TPL-15",
      "CMP-TPL-2",
      "CMP-TPL-3",
      "CMP-TPL-4",
      "CMP-TPL-5",
      "CMP-TPL-6",
      "CMP-TPL-7",
      "CMP-TPL-8",
      "CMP-TPL-9",
      "RUN-COMP-1",
      "RUN-COMP-2",
      "RUN-COMP-3",
      "RUN-COMP-4",
      "RUN-COMP-5",
      "RUN-DOM-1",
      "RUN-DOM-2",
      "RUN-DOM-3",
      "RUN-DOM-4",
      "RUN-DOM-5",
      "RUN-DOM-6",
      "RUN-LIFE-1",
      "RUN-REACT-1",
      "RUN-REACT-2",
      "SYN-DESC-1",
      "SYN-DESC-2",
      "SYN-DESC-3",
      "SYN-DESC-4",
      "SYN-PARSE-1",
      "SYN-PARSE-10",
      "SYN-PARSE-11",
      "SYN-PARSE-12",
      "SYN-PARSE-13",
      "SYN-PARSE-2",
      "SYN-PARSE-3",
      "SYN-PARSE-4",
      "SYN-PARSE-5",
      "SYN-PARSE-6",
      "SYN-PARSE-7",
      "SYN-PARSE-8",
      "SYN-PARSE-9",
      "TYPE-1",
      "TYPE-2",
      "TYPE-3",
      "TYPE-4",
      "TYPE-5",
      "TYPE-6",
      "TYPE-7",
      "TYPE-8",
    ]);
    expect(new Set(requirements.map((entry) => entry.id)).size).toBe(requirements.length);
  });

  test("all upstream inventories validate", () => {
    expect(validateUpstreamInventories().every((result) => result.valid)).toBe(true);
  });

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

  test("all vendored upstream corpora validate", () => {
    expect(validateVendoredUpstreamCorpora().every((result) => result.valid)).toBe(true);
  });

  test("all vendored vize snapshots validate", () => {
    expect(validateVendoredSnapshots().every((result) => result.valid)).toBe(true);
  });
});
