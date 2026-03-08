import { assert, assertEqual } from "../harness/assert.ts";
import { flushDom, getByTestId, queryByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-if-toggle.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";

const visible = ref(true);
</script>

<template>
<section>
    <button data-testid="toggle" @click="visible = !visible">toggle</button>
    <p v-if="visible" data-testid="panel">Visible</p>
  </section>
</template>`.trim(),
};

export const vIfToggleTestSuite: RuntimeTestSuite = {
  id: "runtime.dom.v-if-toggle",
  title: "v-if toggles a branch on and off across flushes",
  summary:
    "A conditional branch is inserted and removed from the DOM when its controlling ref changes through an event handler.",
  environment: "browser",
  features: ["runtime.dom", "runtime.v-if"],
  upstream: [
    {
      repository: "ubugeeei/vize",
      source: "playground/e2e/components.test.ts",
      cases: ["should handle v-if directive"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const button = getByTestId<HTMLButtonElement>(mounted.container, "toggle");
      assert(
        queryByTestId(mounted.container, "panel"),
        "Conditional branch should mount initially",
      );

      button.click();
      await flushDom();
      assertEqual(
        queryByTestId(mounted.container, "panel"),
        null,
        "Conditional branch should be removed after toggling off",
      );

      button.click();
      await flushDom();
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "panel").textContent,
        "Visible",
        "Conditional branch should mount again after toggling on",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
