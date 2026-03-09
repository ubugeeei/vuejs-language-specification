import { assertEqual } from "../../../runtime/harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-number-leading-zero.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";

const value = ref(0);
</script>

<template>
<label>
    <input v-model="value" data-testid="field" type="number" />
    <span data-testid="mirror">{{ value }}</span>
  </label>
</template>`.trim(),
};

export const vModelNumberLeadingZeroTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-number-leading-zero",
  title: "Number inputs normalize leading-zero values through v-model",
  summary:
    "A number input bound through v-model must treat equal values with a leading zero as a meaningful update and normalize the DOM value after state sync.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["equal value with a leading 0 should trigger update."],
      issues: ["#10503"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      assertEqual(input.value, "0", "Number input should initialize from numeric model state");

      input.value = "01";
      dispatchDomEvent(input, "input");
      await flushDom();

      assertEqual(
        mirror.textContent,
        "1",
        "Leading-zero input should still update the numeric model",
      );
      assertEqual(
        input.value,
        "1",
        "DOM value should normalize after numeric state synchronization",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
