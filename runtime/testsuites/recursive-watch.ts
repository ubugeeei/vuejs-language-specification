import { assertEqual } from "../harness/assert.ts";
import { flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "recursive-watch.vue",
  source: `<script setup lang="ts">
import { computed, ref, watch } from "vue";

const source = ref(0);
const view = computed(() => source.value);

watch(view, (value) => {
  if (value > 1) {
    source.value -= 1;
  }
});
</script>

<template>
<section>
    <button data-testid="set-10" @click="source = 10">set-10</button>
    <span data-testid="source">{{ source }}</span>
    <span data-testid="view">{{ view }}</span>
  </section>
</template>`.trim(),
};

export const recursiveWatchTestSuite: RuntimeTestSuite = {
  id: "runtime.reactivity.recursive-watch",
  title: "Recursive watcher on computed stabilizes instead of diverging",
  summary:
    "A watcher that decrements the source through a computed view converges to the final stable value.",
  environment: "browser",
  features: ["runtime.reactivity", "runtime.watch"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/reactivity/__tests__/watch.spec.ts",
      cases: ["recursive sync watcher on computed"],
      issues: ["#12033"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      getByTestId<HTMLButtonElement>(mounted.container, "set-10").click();
      await flushDom();

      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "source").textContent,
        "1",
        "Source should converge to the final stable value",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "view").textContent,
        "1",
        "Computed view should converge to the same stable value",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
