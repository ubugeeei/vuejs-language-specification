import { assertEqual } from "../../../runtime/harness/assert.ts";
import { flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-component-trim-semantics.vue",
  source: `<script setup lang="ts">
import { defineComponent, ref } from "vue";

const basicModel = ref("");
const basicFoo = ref("");
const kebabCamel = ref("");
const camelKebabModel = ref("");
const camelKebabNamed = ref("");
const mixed = ref("");

const BasicTrimChild = defineComponent({
  emits: ["update:modelValue", "update:foo"],
  created() {
    this.$emit("update:modelValue", " one ");
    this.$emit("update:foo", "  two  ");
  },
  template: \`<div></div>\`,
});

const KebabCamelChild = defineComponent({
  emits: ["update:firstName"],
  created() {
    this.$emit("update:firstName", " one ");
  },
  template: \`<div></div>\`,
});

const CamelKebabChild = defineComponent({
  emits: ["update:model-value", "update:first-name"],
  created() {
    this.$emit("update:model-value", " one ");
    this.$emit("update:first-name", " two ");
  },
  template: \`<div></div>\`,
});

const MixedCaseChild = defineComponent({
  emits: ["update:base-URL"],
  created() {
    this.$emit("update:base-URL", " one ");
  },
  template: \`<div></div>\`,
});
</script>

<template>
<section>
    <BasicTrimChild v-model.trim="basicModel" v-model:foo.trim="basicFoo" />
    <KebabCamelChild v-model:first-name.trim="kebabCamel" />
    <CamelKebabChild v-model.trim="camelKebabModel" v-model:first-name.trim="camelKebabNamed" />
    <MixedCaseChild v-model:base-URL.trim="mixed" />
    <span data-testid="basic-model">{{ basicModel }}</span>
    <span data-testid="basic-foo">{{ basicFoo }}</span>
    <span data-testid="kebab-camel">{{ kebabCamel }}</span>
    <span data-testid="camel-kebab-model">{{ camelKebabModel }}</span>
    <span data-testid="camel-kebab-named">{{ camelKebabNamed }}</span>
    <span data-testid="mixed">{{ mixed }}</span>
  </section>
</template>`.trim(),
};

export const vModelComponentTrimSemanticsTestSuite: RuntimeTestSuite = {
  id: "runtime.components.v-model-component-trim-semantics",
  title: "Component v-model.trim applies to default, named, and case-variant model channels",
  summary:
    "Component update listeners guarded by trim modifiers must trim the first emitted string payload across default channels, named channels, kebab/camel remapping, and mixed-case model names.",
  environment: "browser",
  features: ["runtime.components", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/componentEmits.spec.ts",
      cases: [
        ".trim modifier should work with v-model on component",
        ".trim modifier should work with v-model on component for kebab-cased props and camelCased emit",
        ".trim modifier should work with v-model on component for camelCased props and kebab-cased emit",
        ".trim modifier should work with v-model on component for mixed cased props and emit",
      ],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      await flushDom();

      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "basic-model").textContent,
        "one",
        "trim should strip surrounding whitespace from the default model channel",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "basic-foo").textContent,
        "two",
        "trim should strip surrounding whitespace from named model channels",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "kebab-camel").textContent,
        "one",
        "trim should resolve kebab-cased modifier props with camel-cased emits",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "camel-kebab-model").textContent,
        "one",
        "trim should resolve camel-cased modifier props with kebab-cased default-model emits",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "camel-kebab-named").textContent,
        "two",
        "trim should resolve camel-cased modifier props with kebab-cased named-model emits",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "mixed").textContent,
        "one",
        "trim should preserve mixed-case model channels while trimming payloads",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
