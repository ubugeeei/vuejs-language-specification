import { assertEqual } from "../harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-number-rendering.vue",
  source: `<script setup lang="ts">
import { computed, ref } from "vue";

const value1 = ref(1.002);
const value2 = ref(1.002);
const mirror1 = computed(() => \`\${typeof value1.value}:\${value1.value}\`);
const mirror2 = computed(() => \`\${typeof value2.value}:\${value2.value}\`);
</script>

<template>
<section>
    <input v-model="value1" data-testid="field-1" type="number" />
    <input v-model="value2" data-testid="field-2" type="number" />
    <span data-testid="mirror-1">{{ mirror1 }}</span>
    <span data-testid="mirror-2">{{ mirror2 }}</span>
  </section>
</template>`.trim(),
};

export const vModelNumberRenderingTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-number-rendering",
  title: "Number inputs preserve in-progress rendered text while syncing numeric state",
  summary:
    "A number input bound through v-model must preserve the raw in-progress DOM string when the numeric model has already converged to the same numeric value.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with number input and be able to update rendering correctly"],
      issues: ["#7003"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const input1 = getByTestId<HTMLInputElement>(mounted.container, "field-1");
      const input2 = getByTestId<HTMLInputElement>(mounted.container, "field-2");
      const mirror1 = getByTestId<HTMLElement>(mounted.container, "mirror-1");
      const mirror2 = getByTestId<HTMLElement>(mounted.container, "mirror-2");

      assertEqual(input1.value, "1.002", "First number input should render the initial value");
      assertEqual(input2.value, "1.002", "Second number input should render the initial value");

      input1.value = "1.00";
      dispatchDomEvent(input1, "input");
      await flushDom();
      assertEqual(mirror1.textContent, "number:1", "First numeric model should converge to 1");

      input2.value = "1.00";
      dispatchDomEvent(input2, "input");
      await flushDom();
      assertEqual(mirror2.textContent, "number:1", "Second numeric model should converge to 1");

      assertEqual(
        input1.value,
        "1.00",
        "The active rendered number string should be preserved when it represents the synced numeric value",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
