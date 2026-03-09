import { assertEqual } from "../../../runtime/harness/assert.ts";
import { flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "counter-click.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";

const count = ref(0);
</script>

<template>
<button data-testid="counter" @click="count += 1">{{ count }}</button>
</template>`.trim(),
};

export const counterClickTestSuite: RuntimeTestSuite = {
  id: "runtime.dom.counter-click",
  title: "Clicking a counter button updates DOM text after the next tick",
  summary:
    "A basic event handler mutates reactive state and the DOM reflects the new value on the following flush.",
  environment: "browser",
  features: ["runtime.events", "runtime.dom"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/patchEvents.spec.ts",
      cases: ["should assign event handler"],
    },
    {
      repository: "ubugeeei/vize",
      source: "playground/e2e/components.test.ts",
      cases: ["should render component with reactive state"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const button = getByTestId<HTMLButtonElement>(mounted.container, "counter");
      assertEqual(button.textContent, "0", "Counter should start at zero");

      button.click();
      await flushDom();

      assertEqual(button.textContent, "1", "Counter should increment after click");
    } finally {
      mounted.cleanup();
    }
  },
};
