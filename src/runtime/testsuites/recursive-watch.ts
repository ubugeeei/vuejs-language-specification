import { computed, ref, watch } from "@vue/reactivity";
import { assertEqual } from "../assert.ts";
import type { RuntimeTestSuite } from "../types.ts";

export const recursiveWatchTestSuite: RuntimeTestSuite = {
  id: "runtime.reactivity.recursive-watch",
  title: "Recursive watcher on computed stabilizes instead of diverging",
  summary:
    "A watcher that decrements the source through a computed view converges to the final stable value.",
  environment: "node",
  features: ["runtime.reactivity", "runtime.watch"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/reactivity/__tests__/watch.spec.ts",
      cases: ["recursive sync watcher on computed"],
      issues: ["#12033"],
    },
  ],
  async run() {
    const source = ref(0);
    const view = computed(() => source.value);

    watch(view, (value) => {
      if (value > 1) {
        source.value -= 1;
      }
    });

    source.value = 10;

    assertEqual(source.value, 1, "Source should converge to the final stable value");
    assertEqual(view.value, 1, "Computed view should converge to the same stable value");
  },
};
