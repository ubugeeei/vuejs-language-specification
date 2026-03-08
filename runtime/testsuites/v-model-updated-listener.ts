import { assertEqual } from "../harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-updated-listener.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";

const value = ref("foo");
const usePrimary = ref(true);
const log = ref("");

function record(prefix: string, nextValue: string): void {
  log.value = log.value ? \`\${log.value}|\${prefix}:\${nextValue}\` : \`\${prefix}:\${nextValue}\`;
}

function primaryListener(nextValue: string): void {
  record("primary", nextValue);
}

function secondaryListener(nextValue: string): void {
  record("secondary", nextValue);
}
</script>

<template>
<section>
    <input
      v-model="value"
      :onUpdate:modelValue="usePrimary ? primaryListener : secondaryListener"
      data-testid="field"
    />
    <button data-testid="toggle" @click="usePrimary = false">toggle</button>
    <span data-testid="mirror">{{ value }}</span>
    <span data-testid="log">{{ log }}</span>
  </section>
</template>`.trim(),
};

export const vModelUpdatedListenerTestSuite: RuntimeTestSuite = {
  id: "runtime.dom.v-model-updated-listener",
  title: "v-model respects updated listener identity after rerender",
  summary:
    "When the onUpdate:modelValue listener changes across renders, subsequent updates must be delivered to the latest listener only.",
  environment: "browser",
  features: ["runtime.dom", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with updated listeners"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const toggle = getByTestId<HTMLButtonElement>(mounted.container, "toggle");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");
      const log = getByTestId<HTMLElement>(mounted.container, "log");

      input.value = "foo";
      dispatchDomEvent(input, "input");
      await flushDom();
      assertEqual(mirror.textContent, "foo", "Initial listener should update the bound value");
      assertEqual(
        log.textContent,
        "primary:foo",
        "Initial listener should receive the first update",
      );

      toggle.click();
      await flushDom();

      input.value = "bar";
      dispatchDomEvent(input, "input");
      await flushDom();
      assertEqual(mirror.textContent, "bar", "Updated listener should update the bound value");
      assertEqual(
        log.textContent,
        "primary:foo|secondary:bar",
        "After rerender, only the latest listener should receive subsequent updates",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
