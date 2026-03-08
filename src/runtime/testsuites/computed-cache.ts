import { computed, ref } from "@vue/reactivity";
import { assertEqual } from "../assert.ts";
import type { RuntimeTestSuite } from "../types.ts";

export const computedCacheTestSuite: RuntimeTestSuite = {
  id: "runtime.reactivity.computed-cache",
  title: "Computed values cache until their dependencies are invalidated",
  summary:
    "A computed getter evaluates once per stable dependency version and re-evaluates only after its source ref changes.",
  environment: "node",
  features: ["runtime.reactivity", "runtime.computed"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/reactivity/__tests__/computed.spec.ts",
      cases: ["should compute lazily", "should return updated value"],
    },
  ],
  async run() {
    const source = ref(1);
    let evaluations = 0;
    const doubled = computed(() => {
      evaluations += 1;
      return source.value * 2;
    });

    assertEqual(evaluations, 0, "Computed getter should stay lazy before the first read");
    assertEqual(doubled.value, 2, "Computed getter should derive the first value on demand");
    assertEqual(doubled.value, 2, "Computed getter should reuse the cached value");
    assertEqual(evaluations, 1, "Computed getter should evaluate once for a stable source");

    source.value = 2;

    assertEqual(evaluations, 1, "Invalidation should not eagerly re-run the computed getter");
    assertEqual(
      doubled.value,
      4,
      "Computed getter should re-evaluate after dependency invalidation",
    );
    assertEqual(evaluations, 2, "Computed getter should evaluate once per dependency version");
  },
};
