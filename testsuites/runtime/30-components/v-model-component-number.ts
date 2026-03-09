import { assertEqual } from "../../../runtime/harness/assert.ts";
import { flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-component-number.vue",
  source: `<script setup lang="ts">
import { computed, defineComponent, ref } from "vue";

const modelValue = ref<number | null>(null);
const fooValue = ref<number | null>(null);
const modelMirror = computed(() => (modelValue.value === null ? "null" : \`\${typeof modelValue.value}:\${modelValue.value}\`));
const fooMirror = computed(() => (fooValue.value === null ? "null" : \`\${typeof fooValue.value}:\${fooValue.value}\`));

const Child = defineComponent({
  emits: ["update:modelValue", "update:foo"],
  created() {
    this.$emit("update:modelValue", "1");
    this.$emit("update:foo", "2");
  },
  template: \`<div></div>\`,
});
</script>

<template>
<section>
    <Child v-model.number="modelValue" v-model:foo.number="fooValue" />
    <span data-testid="model-mirror">{{ modelMirror }}</span>
    <span data-testid="foo-mirror">{{ fooMirror }}</span>
  </section>
</template>`.trim(),
};

export const vModelComponentNumberTestSuite: RuntimeTestSuite = {
  id: "runtime.components.v-model-component-number",
  title: "Component v-model.number modifiers coerce main and named model payloads",
  summary:
    "Component update listeners guarded by modelModifiers and <arg>Modifiers with number = true must coerce the first emitted payload to numbers for both the default and named model channels.",
  environment: "browser",
  features: ["runtime.components", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/componentEmits.spec.ts",
      cases: [".number modifier should work with v-model on component"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      await flushDom();

      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "model-mirror").textContent,
        "number:1",
        "modelModifiers.number should coerce the default model payload",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "foo-mirror").textContent,
        "number:2",
        "fooModifiers.number should coerce the named model payload",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
