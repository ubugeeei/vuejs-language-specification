import { assertEqual } from "../harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-select-number.vue",
  source: `<script setup lang="ts">
import { computed, ref } from "vue";

const value = ref<number | null>(null);
const mirror = computed(() => (value.value === null ? "null" : \`\${typeof value.value}:\${value.value}\`));
</script>

<template>
<section>
    <select v-model.number="value" data-testid="field">
      <option value="1">One</option>
      <option value="2">Two</option>
    </select>
    <span data-testid="mirror">{{ mirror }}</span>
  </section>
</template>`.trim(),
};

export const vModelSelectNumberTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-select-number",
  title: "Single-select v-model.number coerces string option values to numbers",
  summary:
    "A single select using the number modifier must emit numeric model values when string-valued options are selected.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["v-model.number should work with select tag"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const select = getByTestId<HTMLSelectElement>(mounted.container, "field");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");
      const one = select.options[0]!;

      one.selected = true;
      dispatchDomEvent(select, "change");
      await flushDom();

      assertEqual(
        mirror.textContent,
        "number:1",
        "number modifier should coerce the selected option payload into a number",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
