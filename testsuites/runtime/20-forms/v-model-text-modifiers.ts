import { assertEqual } from "../../../runtime/harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-text-modifiers.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";

const numberValue = ref<number | string | null>(null);
const trimValue = ref<number | string | null>(null);
const trimLazyValue = ref<number | string | null>(null);
const trimNumberValue = ref<number | string | null>(null);
const lazyValue = ref<number | string | null>(null);

function describe(value: number | string | null): string {
  if (value === null) {
    return "null";
  }

  return \`\${typeof value}:\${value}\`;
}
</script>

<template>
<section>
    <input v-model.number="numberValue" data-testid="number" />
    <input v-model.trim="trimValue" data-testid="trim" />
    <input v-model.trim.lazy="trimLazyValue" data-testid="trim-lazy" />
    <input v-model.trim.number="trimNumberValue" data-testid="trim-number" />
    <input v-model.lazy="lazyValue" data-testid="lazy" />
    <span data-testid="number-mirror">{{ describe(numberValue) }}</span>
    <span data-testid="trim-mirror">{{ describe(trimValue) }}</span>
    <span data-testid="trim-lazy-mirror">{{ describe(trimLazyValue) }}</span>
    <span data-testid="trim-number-mirror">{{ describe(trimNumberValue) }}</span>
    <span data-testid="lazy-mirror">{{ describe(lazyValue) }}</span>
  </section>
</template>`.trim(),
};

export const vModelTextModifiersTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-text-modifiers",
  title: "Text v-model applies trim, lazy, and number modifiers",
  summary:
    "Text inputs bound through v-model modifiers must trim whitespace, defer lazy updates to change, and coerce numeric payloads while preserving DOM normalization.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should support modifiers"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const number = getByTestId<HTMLInputElement>(mounted.container, "number");
      const trim = getByTestId<HTMLInputElement>(mounted.container, "trim");
      const trimLazy = getByTestId<HTMLInputElement>(mounted.container, "trim-lazy");
      const trimNumber = getByTestId<HTMLInputElement>(mounted.container, "trim-number");
      const lazy = getByTestId<HTMLInputElement>(mounted.container, "lazy");
      const numberMirror = getByTestId<HTMLElement>(mounted.container, "number-mirror");
      const trimMirror = getByTestId<HTMLElement>(mounted.container, "trim-mirror");
      const trimLazyMirror = getByTestId<HTMLElement>(mounted.container, "trim-lazy-mirror");
      const trimNumberMirror = getByTestId<HTMLElement>(mounted.container, "trim-number-mirror");
      const lazyMirror = getByTestId<HTMLElement>(mounted.container, "lazy-mirror");

      number.value = "+01.2";
      dispatchDomEvent(number, "input");
      await flushDom();
      assertEqual(numberMirror.textContent, "number:1.2", "number modifier should coerce input");

      dispatchDomEvent(number, "change");
      await flushDom();
      assertEqual(number.value, "1.2", "number modifier should normalize the DOM value on change");

      trim.value = "    hello, world    ";
      dispatchDomEvent(trim, "input");
      await flushDom();
      assertEqual(
        trimMirror.textContent,
        "string:hello, world",
        "trim should strip outer whitespace",
      );

      trimNumber.value = "    +01.2    ";
      dispatchDomEvent(trimNumber, "input");
      await flushDom();
      assertEqual(
        trimNumberMirror.textContent,
        "number:1.2",
        "trim+number should trim first and then coerce to a number",
      );

      trimLazy.value = "   ddd    ";
      dispatchDomEvent(trimLazy, "change");
      await flushDom();
      assertEqual(
        trimLazyMirror.textContent,
        "string:ddd",
        "trim+lazy should apply trimming on change instead of input",
      );

      lazy.value = "foo";
      dispatchDomEvent(lazy, "change");
      await flushDom();
      assertEqual(lazyMirror.textContent, "string:foo", "lazy should commit on change events");
    } finally {
      mounted.cleanup();
    }
  },
};
