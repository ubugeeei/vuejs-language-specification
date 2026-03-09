import { assertEqual } from "../../../runtime/harness/assert.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import { normalizedText } from "../../../runtime/harness/dom.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "slot-projection.vue",
  source: `<script setup lang="ts">
import { defineComponent } from "vue";

const Card = defineComponent({
  template: \`<section data-testid="card"><h2>Title</h2><slot /></section>\`,
});
</script>

<template>
<Card>
    <p data-testid="body">Slot body</p>
  </Card>
</template>`.trim(),
};

export const slotProjectionTestSuite: RuntimeTestSuite = {
  id: "runtime.components.default-slot",
  title: "Default slot content is projected at the declared outlet",
  summary:
    "A child component renders the default slot content at the slot outlet without reordering surrounding DOM.",
  environment: "browser",
  features: ["runtime.slots", "runtime.components"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/helpers/renderSlot.spec.ts",
      cases: ["should render slot"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      assertEqual(
        normalizedText(mounted.container.textContent),
        "TitleSlot body",
        "Slot content should be projected after the heading",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
