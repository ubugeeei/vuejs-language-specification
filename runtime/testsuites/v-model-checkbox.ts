import { assertEqual } from "../harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-checkbox.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";

const checked = ref(false);
</script>

<template>
<label>
    <input v-model="checked" data-testid="field" type="checkbox" />
    <span data-testid="mirror">{{ checked ? "yes" : "no" }}</span>
  </label>
</template>`.trim(),
};

export const vModelCheckboxTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-checkbox",
  title: "Checkbox v-model synchronizes checked state and reactive state",
  summary:
    "A checkbox bound with v-model updates both the DOM checked state and the rendered mirror after the change event.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with checkbox"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      assertEqual(input.checked, false, "Checkbox should start unchecked");
      assertEqual(mirror.textContent, "no", "Mirror should reflect the unchecked state");

      input.checked = true;
      dispatchDomEvent(input, "change");
      await flushDom();

      assertEqual(input.checked, true, "Checkbox should remain checked after the change event");
      assertEqual(mirror.textContent, "yes", "Mirror should reflect the checked state");
    } finally {
      mounted.cleanup();
    }
  },
};
