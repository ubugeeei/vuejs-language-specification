import { assertEqual } from "../harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-number-input.vue",
  source: `<script setup lang="ts">
import { computed, ref } from "vue";

const value = ref<number | null>(null);
const mirror = computed(() => (value.value === null ? "null" : \`\${typeof value.value}:\${value.value}\`));
</script>

<template>
<label>
    <input v-model="value" data-testid="field" type="number" />
    <span data-testid="mirror">{{ mirror }}</span>
  </label>
</template>`.trim(),
};

export const vModelNumberInputTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-number-input",
  title: "Number inputs coerce model values to numbers",
  summary:
    "An input[type=number] bound through v-model must emit numeric model values rather than strings.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with number input"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      assertEqual(input.value, "", "Number input should start empty for a null model");
      assertEqual(input.type, "number", "Field should be rendered as a number input");

      input.value = "1";
      dispatchDomEvent(input, "input");
      await flushDom();

      assertEqual(
        mirror.textContent,
        "number:1",
        "Number input should coerce user input into a numeric model value",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
