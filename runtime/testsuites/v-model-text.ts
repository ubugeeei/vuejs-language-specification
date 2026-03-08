import { assertEqual } from "../harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-text.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";

const value = ref("");
</script>

<template>
<label>
    <input v-model="value" data-testid="field" />
    <span data-testid="mirror">{{ value }}</span>
  </label>
</template>`.trim(),
};

export const vModelTextTestSuite: RuntimeTestSuite = {
  id: "runtime.dom.v-model-text",
  title: "Text input v-model keeps DOM value and reactive mirror in sync",
  summary:
    "Typing into a text input updates component state and the mirrored text content after the input event.",
  environment: "browser",
  features: ["runtime.v-model", "runtime.forms"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with text input"],
      issues: ["#1931"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      input.value = "hello";
      dispatchDomEvent(input, "input");
      await flushDom();

      assertEqual(input.value, "hello", "Input value should reflect the user edit");
      assertEqual(mirror.textContent, "hello", "Mirrored text should track the input value");
    } finally {
      mounted.cleanup();
    }
  },
};
