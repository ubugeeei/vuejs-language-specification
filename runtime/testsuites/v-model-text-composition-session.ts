import { assertEqual } from "../harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-text-composition-session.vue",
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

export const vModelTextCompositionSessionTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-text-composition-session",
  title: "Text v-model defers updates until composition ends",
  summary:
    "A text input bound through v-model must suppress input updates during an active composition session and commit the final value when composition ends.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with composition session"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      input.value = "使用拼音";
      dispatchDomEvent(input, "compositionstart");
      await flushDom();
      assertEqual(mirror.textContent, "", "Composition start must not commit the partial value");

      input.value = "使用拼音输入";
      dispatchDomEvent(input, "input");
      await flushDom();
      assertEqual(mirror.textContent, "", "Input during composition must not update the model");

      dispatchDomEvent(input, "compositionend");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "使用拼音输入",
        "Composition end must commit the final composed value",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
