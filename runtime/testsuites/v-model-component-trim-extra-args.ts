import { assertEqual } from "../harness/assert.ts";
import { flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-component-trim-extra-args.vue",
  source: `<script setup lang="ts">
import { defineComponent, ref } from "vue";

const modelValue = ref("");
const trailingPayload = ref("");

function captureMeta(_value: string, meta: { bar: string }): void {
  trailingPayload.value = JSON.stringify(meta);
}

const Child = defineComponent({
  emits: ["update:modelValue"],
  created() {
    this.$emit("update:modelValue", " foo ", { bar: " bar " });
  },
  template: \`<div></div>\`,
});
</script>

<template>
<section>
    <Child v-model.trim="modelValue" :onUpdate:modelValue="captureMeta" />
    <span data-testid="value-mirror">{{ modelValue }}</span>
    <span data-testid="meta-mirror">{{ trailingPayload }}</span>
  </section>
</template>`.trim(),
};

export const vModelComponentTrimExtraArgsTestSuite: RuntimeTestSuite = {
  id: "runtime.components.v-model-component-trim-extra-args",
  title: "Component v-model.trim only normalizes the first emitted argument",
  summary:
    "The trim modifier on component v-model listeners must trim only the first emitted argument and preserve trailing emitted arguments verbatim.",
  environment: "browser",
  features: ["runtime.components", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/componentEmits.spec.ts",
      cases: ["only trim string parameter when work with v-model on component"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      await flushDom();

      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "value-mirror").textContent,
        "foo",
        "trim should normalize only the first emitted string argument",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "meta-mirror").textContent,
        '{"bar":" bar "}',
        "trim should preserve trailing emitted arguments verbatim",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
