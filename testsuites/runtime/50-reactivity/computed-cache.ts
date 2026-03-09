import { assertEqual } from "../../../runtime/harness/assert.ts";
import { flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "computed-cache.vue",
  source: `<script setup lang="ts">
import { computed, ref } from "vue";

const source = ref(1);
const evaluationCount = ref(0);
const firstRead = ref("unread");
const secondRead = ref("unread");
let evaluations = 0;

const doubled = computed(() => {
  evaluations += 1;
  return source.value * 2;
});

function readTwice(): void {
  firstRead.value = String(doubled.value);
  secondRead.value = String(doubled.value);
  evaluationCount.value = evaluations;
}

function incrementSource(): void {
  source.value += 1;
  evaluationCount.value = evaluations;
}
</script>

<template>
  <section>
    <button data-testid="read" @click="readTwice">read</button>
    <button data-testid="increment" @click="incrementSource">increment</button>
    <span data-testid="evaluations">{{ evaluationCount }}</span>
    <span data-testid="first-read">{{ firstRead }}</span>
    <span data-testid="second-read">{{ secondRead }}</span>
  </section>
</template>`.trim(),
};

export const computedCacheTestSuite: RuntimeTestSuite = {
  id: "runtime.reactivity.computed-cache",
  title: "Computed values cache until their dependencies are invalidated",
  summary:
    "A computed getter evaluates once per stable dependency version, serves repeated reads from cache, and re-evaluates only after its source ref changes.",
  environment: "browser",
  features: ["runtime.reactivity", "runtime.computed"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/reactivity/__tests__/computed.spec.ts",
      cases: ["should compute lazily", "should return updated value"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const read = getByTestId<HTMLButtonElement>(mounted.container, "read");
      const increment = getByTestId<HTMLButtonElement>(mounted.container, "increment");
      const evaluations = getByTestId<HTMLElement>(mounted.container, "evaluations");
      const firstRead = getByTestId<HTMLElement>(mounted.container, "first-read");
      const secondRead = getByTestId<HTMLElement>(mounted.container, "second-read");

      assertEqual(
        evaluations.textContent,
        "0",
        "Computed getter should stay lazy before the first read",
      );

      read.click();
      await flushDom();
      assertEqual(
        firstRead.textContent,
        "2",
        "Computed getter should derive the first value on demand",
      );
      assertEqual(
        secondRead.textContent,
        "2",
        "Repeated reads in the same stable version should observe the cached value",
      );
      assertEqual(
        evaluations.textContent,
        "1",
        "Repeated reads in the same stable version must not increment evaluation count",
      );

      increment.click();
      await flushDom();
      assertEqual(
        evaluations.textContent,
        "1",
        "Invalidation should not eagerly re-run the computed getter",
      );

      read.click();
      await flushDom();
      assertEqual(
        firstRead.textContent,
        "4",
        "Computed getter should re-evaluate after dependency invalidation",
      );
      assertEqual(
        secondRead.textContent,
        "4",
        "Repeated reads after invalidation should still share the refreshed cached value",
      );
      assertEqual(
        evaluations.textContent,
        "2",
        "Computed getter should evaluate once per dependency version",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
