import { assertEqual } from "../../../runtime/harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-range.vue",
  source: `<script setup lang="ts">
import { computed, ref } from "vue";

const value = ref<number | string>(25);
const mirror = computed(() => \`\${typeof value.value}:\${value.value}\`);
</script>

<template>
<section>
    <input
      v-model.number="value"
      data-testid="number-range"
      type="range"
      :min="1"
      :max="100"
    />
    <input
      v-model.lazy="value"
      data-testid="lazy-range"
      type="range"
      :min="1"
      :max="100"
    />
    <button data-testid="set-60" @click="value = 60">set-60</button>
    <button data-testid="set-neg-1" @click="value = -1">set-neg-1</button>
    <button data-testid="set-200" @click="value = 200">set-200</button>
    <span data-testid="mirror">{{ mirror }}</span>
  </section>
</template>`.trim(),
};

export const vModelRangeTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-range",
  title: "Range inputs apply number, lazy, and clamping semantics",
  summary:
    "Range inputs bound through v-model must clamp to min/max boundaries and apply number and lazy modifier semantics to the bound model.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with range"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const numberRange = getByTestId<HTMLInputElement>(mounted.container, "number-range");
      const lazyRange = getByTestId<HTMLInputElement>(mounted.container, "lazy-range");
      const set60 = getByTestId<HTMLButtonElement>(mounted.container, "set-60");
      const setNeg1 = getByTestId<HTMLButtonElement>(mounted.container, "set-neg-1");
      const set200 = getByTestId<HTMLButtonElement>(mounted.container, "set-200");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      numberRange.value = "20";
      dispatchDomEvent(numberRange, "input");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "number:20",
        "number modifier should emit numeric range values",
      );

      numberRange.value = "200";
      dispatchDomEvent(numberRange, "input");
      await flushDom();
      assertEqual(mirror.textContent, "number:100", "Range values above max should clamp to max");

      numberRange.value = "-1";
      dispatchDomEvent(numberRange, "input");
      await flushDom();
      assertEqual(mirror.textContent, "number:1", "Range values below min should clamp to min");

      lazyRange.value = "30";
      dispatchDomEvent(lazyRange, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "string:30",
        "lazy modifier should commit range values on change",
      );

      lazyRange.value = "200";
      dispatchDomEvent(lazyRange, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "string:100",
        "Lazy range updates should still clamp values above max",
      );

      lazyRange.value = "-1";
      dispatchDomEvent(lazyRange, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "string:1",
        "Lazy range updates should still clamp values below min",
      );

      set60.click();
      await flushDom();
      assertEqual(
        numberRange.value,
        "60",
        "Programmatic numeric updates should sync number-modified range",
      );
      assertEqual(lazyRange.value, "60", "Programmatic numeric updates should sync lazy range");

      setNeg1.click();
      await flushDom();
      assertEqual(numberRange.value, "1", "Programmatic below-min values should clamp on the DOM");
      assertEqual(
        lazyRange.value,
        "1",
        "Lazy range DOM should clamp below-min programmatic values",
      );

      set200.click();
      await flushDom();
      assertEqual(
        numberRange.value,
        "100",
        "Programmatic above-max values should clamp on the DOM",
      );
      assertEqual(
        lazyRange.value,
        "100",
        "Lazy range DOM should clamp above-max programmatic values",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
