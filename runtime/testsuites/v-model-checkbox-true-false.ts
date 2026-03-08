import { assertEqual } from "../harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-checkbox-true-false.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";

const value = ref("yes");
</script>

<template>
<label>
    <input
      v-model="value"
      data-testid="field"
      type="checkbox"
      true-value="yes"
      false-value="no"
    />
    <span data-testid="mirror">{{ value }}</span>
  </label>
</template>`.trim(),
};

export const vModelCheckboxTrueFalseTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-checkbox-true-false",
  title: "Checkbox v-model respects true-value and false-value payloads",
  summary:
    "A checkbox bound with true-value and false-value must initialize checked state from those payloads and emit the configured payloads on change.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with checkbox and true-value/false-value"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      assertEqual(input.checked, true, "Checkbox should initialize from the configured true-value");
      assertEqual(mirror.textContent, "yes", "Mirror should expose the true-value payload");

      input.checked = false;
      dispatchDomEvent(input, "change");
      await flushDom();

      assertEqual(input.checked, false, "Checkbox should remain unchecked after false transition");
      assertEqual(mirror.textContent, "no", "Mirror should expose the configured false-value");

      input.checked = true;
      dispatchDomEvent(input, "change");
      await flushDom();

      assertEqual(
        input.checked,
        true,
        "Checkbox should become checked again after true transition",
      );
      assertEqual(mirror.textContent, "yes", "Mirror should return to the configured true-value");
    } finally {
      mounted.cleanup();
    }
  },
};
