import { assertEqual } from "../harness/assert.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import { normalizedText } from "../harness/dom.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "named-slot.vue",
  source: `<script setup lang="ts">
import { defineComponent } from "vue";

const Layout = defineComponent({
  template: \`<article><header data-testid="header"><slot name="header" /></header><main data-testid="body"><slot /></main></article>\`,
});
</script>

<template>
  <Layout>
    <template #header>
      <strong>Heading</strong>
    </template>
    <p>Body copy</p>
  </Layout>
</template>`.trim(),
};

export const namedSlotTestSuite: RuntimeTestSuite = {
  id: "runtime.components.named-slot",
  title: "Named slots render at their declared outlets",
  summary:
    "A component with a named slot and a default slot preserves the declared outlet order for both slot channels.",
  environment: "browser",
  features: ["runtime.components", "runtime.slots"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/componentSlots.spec.ts",
      cases: ["initSlots: instance.slots should be set correctly"],
    },
    {
      repository: "ubugeeei/vize",
      source: "playground/e2e/components.test.ts",
      cases: ["should handle slots"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      assertEqual(
        normalizedText(mounted.container.textContent),
        "HeadingBody copy",
        "Named and default slots should render at their declared outlets",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
