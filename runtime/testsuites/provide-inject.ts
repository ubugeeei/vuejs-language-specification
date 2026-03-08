import { assertEqual } from "../harness/assert.ts";
import { flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "provide-inject.vue",
  source: `<script setup lang="ts">
import { defineComponent, inject, provide, ref } from "vue";

const MESSAGE_KEY = "message";
const message = ref("initial");

provide(MESSAGE_KEY, message);

const Child = defineComponent({
  setup() {
    const injected = inject<typeof message>(MESSAGE_KEY);
    return { injected };
  },
  template: \`<p data-testid="message">{{ injected ?? "" }}</p>\`,
});
</script>

<template>
<section>
    <button data-testid="bump" @click="message = 'updated'">update</button>
    <Child />
  </section>
</template>`.trim(),
};

export const provideInjectTestSuite: RuntimeTestSuite = {
  id: "runtime.components.provide-inject-ref",
  title: "Injected refs remain reactive across provider updates",
  summary:
    "A descendant reading an injected ref sees provider mutations after the same DOM flush boundaries as local refs.",
  environment: "browser",
  features: ["runtime.components", "runtime.provide-inject"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/apiInject.spec.ts",
      cases: ["reactivity with refs"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const message = getByTestId<HTMLElement>(mounted.container, "message");
      assertEqual(
        message.textContent,
        "initial",
        "Injected ref should render the initial provider value",
      );

      getByTestId<HTMLButtonElement>(mounted.container, "bump").click();
      await flushDom();
      assertEqual(
        message.textContent,
        "updated",
        "Injected ref should react to provider mutations",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
