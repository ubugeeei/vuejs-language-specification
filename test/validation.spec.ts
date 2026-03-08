import { describe, expect, test } from "vitest";
import {
  buildCatalog,
  buildUpstreamCoverage,
  buildUpstreamTraceability,
  validateCases,
  validateUpstreamInventories,
  validateUpstreamReferences,
  validateUpstreamTraceability,
  validateVendoredSnapshots,
  validateVendoredUpstreamCorpora,
} from "../src/index.ts";

describe("catalog and validation", () => {
  test("catalog exposes stable ids", () => {
    const catalog = buildCatalog();
    expect(catalog.map((entry) => entry.id)).toEqual([
      "benchmark.compiler.sfc-batch-compile",
      "benchmark.reactivity.computed-fanout",
      "compiler.script.define-emits-array",
      "compiler.script.define-expose-basic",
      "compiler.script.define-model-basic",
      "compiler.script.define-model-named",
      "compiler.script.define-options-basic",
      "compiler.script.define-options-empty",
      "compiler.script.define-props-destructure-defaults",
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
      "compiler.template.v-model-text",
      "compiler.template.v-on-click-handler",
      "compiler.template.v-once-cached-subtree",
      "compiler.template.v-text-basic",
      "parser.template.class-attribute-normalization",
      "parser.template.comment-preservation",
      "parser.template.comments-disabled",
      "parser.template.component-tag-type",
      "parser.template.directive-and-interpolation",
      "parser.template.dynamic-arg-modifier",
      "parser.template.element-nesting",
      "parser.template.missing-end-tag-error",
      "parser.template.text-with-tag-like-interpolation",
      "parser.template.unquoted-attribute-self-closing",
      "parser.template.v-pre-literal-content",
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

  test("all pkl cases validate", () => {
    expect(validateCases().every((result) => result.valid)).toBe(true);
  });

  test("all upstream inventories validate", () => {
    expect(validateUpstreamInventories().every((result) => result.valid)).toBe(true);
  });

  test("all upstream references resolve exactly", () => {
    expect(validateUpstreamReferences().every((result) => result.valid)).toBe(true);
  });

  test("upstream coverage report includes every inventoried repository", () => {
    const report = buildUpstreamCoverage();
    expect(report.repositories.map((entry) => entry.repository)).toEqual([
      "ubugeeei/vize",
      "vuejs/core",
      "vuejs/language-tools",
    ]);
    expect(report.repositories.every((entry) => entry.totalCases > 0)).toBe(true);
  });

  test("traceability manifests cover every inventoried repository", () => {
    const manifests = buildUpstreamTraceability();
    expect(manifests.map((entry) => entry.repository)).toEqual([
      "ubugeeei/vize",
      "vuejs/core",
      "vuejs/language-tools",
    ]);
    expect(manifests.every((entry) => entry.counts.total > 0)).toBe(true);
  });

  test("traceability manifests validate", () => {
    expect(validateUpstreamTraceability().every((result) => result.valid)).toBe(true);
  });

  test("all vendored upstream corpora validate", () => {
    expect(validateVendoredUpstreamCorpora().every((result) => result.valid)).toBe(true);
  });

  test("all vendored vize snapshots validate", () => {
    expect(validateVendoredSnapshots().every((result) => result.valid)).toBe(true);
  });
});
