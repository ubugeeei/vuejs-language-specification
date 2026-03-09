import { assertEqual } from "../../../runtime/harness/assert.ts";
import { flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-component-trim-number.vue",
  source: `<script setup lang="ts">
import { computed, defineComponent, ref } from "vue";

const modelValue = ref<number | null>(null);
const fooValue = ref<number | null>(null);
const modelMirror = computed(() => (modelValue.value === null ? "null" : \`\${typeof modelValue.value}:\${modelValue.value}\`));
const fooMirror = computed(() => (fooValue.value === null ? "null" : \`\${typeof fooValue.value}:\${fooValue.value}\`));

const Child = defineComponent({
  emits: ["update:modelValue", "update:foo"],
  created() {
    this.$emit("update:modelValue", "    +01.2    ");
    this.$emit("update:foo", "    1    ");
  },
  template: \`<div></div>\`,
});
</script>

<template>
<section>
    <Child v-model.trim.number="modelValue" v-model:foo.trim.number="fooValue" />
    <span data-testid="model-mirror">{{ modelMirror }}</span>
    <span data-testid="foo-mirror">{{ fooMirror }}</span>
  </section>
</template>`.trim(),
};

export const vModelComponentTrimNumberTestSuite: RuntimeTestSuite = {
  id: "runtime.components.v-model-component-trim-number",
  title: "Component v-model trim+number modifiers compose on the first payload",
  summary:
    "When both trim and number modifiers are enabled for a component model channel, the runtime must trim the first payload string and then coerce it to a number for both default and named channels.",
  environment: "browser",
  features: ["runtime.components", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/componentEmits.spec.ts",
      cases: [".trim and .number modifiers should work with v-model on component"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      await flushDom();

      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "model-mirror").textContent,
        "number:1.2",
        "trim+number should normalize and coerce the default model payload",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "foo-mirror").textContent,
        "number:1",
        "trim+number should normalize and coerce the named model payload",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
