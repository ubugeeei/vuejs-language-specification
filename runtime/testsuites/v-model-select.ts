import { assertEqual } from "../harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-select.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";

const value = ref("foo");
</script>

<template>
<section>
    <select v-model="value" data-testid="field">
      <option value="foo">Foo</option>
      <option value="bar">Bar</option>
    </select>
    <button data-testid="reset" @click="value = 'foo'">reset</button>
    <span data-testid="mirror">{{ value }}</span>
  </section>
</template>`.trim(),
};

export const vModelSelectTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-select",
  title: "Single-select v-model keeps selected option and reactive state synchronized",
  summary:
    "Changing a single select updates the bound state, and a subsequent state update restores the selected option.",
  environment: "browser",
  features: ["runtime.v-model", "runtime.forms"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with single select"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const select = getByTestId<HTMLSelectElement>(mounted.container, "field");
      const reset = getByTestId<HTMLButtonElement>(mounted.container, "reset");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      assertEqual(select.value, "foo", "Initial select state should match the bound model");

      select.value = "bar";
      dispatchDomEvent(select, "change");
      await flushDom();

      assertEqual(mirror.textContent, "bar", "Reactive state should reflect the changed option");
      assertEqual(select.value, "bar", "Selected option should remain in sync after user input");

      reset.click();
      await flushDom();

      assertEqual(select.value, "foo", "Programmatic model updates should restore selection");
      assertEqual(mirror.textContent, "foo", "Mirror text should reflect the restored model");
    } finally {
      mounted.cleanup();
    }
  },
};
