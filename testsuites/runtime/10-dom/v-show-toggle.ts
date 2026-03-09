import { assertEqual } from "../../../runtime/harness/assert.ts";
import { flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-show-toggle.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";

const visible = ref(true);
</script>

<template>
<section>
    <button data-testid="toggle" @click="visible = !visible">toggle</button>
    <div v-show="visible" data-testid="panel">panel</div>
  </section>
</template>`.trim(),
};

export const vShowToggleTestSuite: RuntimeTestSuite = {
  id: "runtime.dom.v-show-toggle",
  title: "v-show toggles the element display style without removing the node",
  summary:
    "A v-show-bound element must remain mounted while its display style toggles between visible and none.",
  environment: "browser",
  features: ["runtime.directives", "runtime.v-show"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vShow.spec.ts",
      cases: ["should update show value changed"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const toggle = getByTestId<HTMLButtonElement>(mounted.container, "toggle");
      const panel = getByTestId<HTMLElement>(mounted.container, "panel");

      assertEqual(panel.style.display, "", "Visible v-show state should preserve empty display");

      toggle.click();
      await flushDom();
      assertEqual(panel.style.display, "none", "Falsy v-show state should hide the element");

      toggle.click();
      await flushDom();
      assertEqual(panel.style.display, "", "Truthy v-show state should restore visibility");
    } finally {
      mounted.cleanup();
    }
  },
};
