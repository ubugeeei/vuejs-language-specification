import { assertEqual } from "../harness/assert.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import { normalizedText } from "../harness/dom.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "slot-fallback.vue",
  source: `<script setup lang="ts">
import { defineComponent } from "vue";

const Layout = defineComponent({
  template: \`<section data-testid="root"><slot><span data-testid="fallback">fallback</span></slot></section>\`,
});
</script>

<template>
<Layout />
</template>`.trim(),
};

export const slotFallbackTestSuite: RuntimeTestSuite = {
  id: "runtime.components.slot-fallback",
  title: "Slot fallback content renders when the caller does not provide the slot",
  summary:
    "A slot outlet with fallback content must render the fallback branch when the corresponding slot channel is absent.",
  environment: "browser",
  features: ["runtime.components", "runtime.slots"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/helpers/renderSlot.spec.ts",
      cases: ["should render slot fallback"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      assertEqual(
        normalizedText(mounted.container.textContent),
        "fallback",
        "Missing slots should render the declared fallback content",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
