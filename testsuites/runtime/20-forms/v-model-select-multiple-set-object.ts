import { assertEqual } from "../../../runtime/harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-select-multiple-set-object.vue",
  source: `<script setup lang="ts">
import { computed, ref } from "vue";

const FOO_VALUE = { foo: 1 };
const BAR_VALUE = { bar: 1 };
const FRESH_FOO_VALUE: Record<string, number> = { foo: 1 };
const FRESH_BAR_VALUE: Record<string, number> = { bar: 1 };
const value = ref(new Set<Record<string, number>>());
const mirror = computed(() => JSON.stringify([...value.value]));
</script>

<template>
<section>
    <select v-model="value" data-testid="field" multiple>
      <option :value="FOO_VALUE">Foo</option>
      <option :value="BAR_VALUE">Bar</option>
    </select>
    <button data-testid="set-same" @click="value = new Set([FOO_VALUE, BAR_VALUE])">set-same</button>
    <button data-testid="set-fresh" @click="value = new Set([FRESH_FOO_VALUE, FRESH_BAR_VALUE])">
      set-fresh
    </button>
    <span data-testid="mirror">{{ mirror }}</span>
  </section>
</template>`.trim(),
};

export const vModelSelectMultipleSetObjectTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-select-multiple-set-object",
  title: "Multiple-select Set object models require reference equality on programmatic updates",
  summary:
    "A multiple select bound to a Set of object payloads must emit the original option object references, but fresh object literals in a replacement Set must not reselect options.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["multiple select (model is Set, option value is object)"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const select = getByTestId<HTMLSelectElement>(mounted.container, "field");
      const setSame = getByTestId<HTMLButtonElement>(mounted.container, "set-same");
      const setFresh = getByTestId<HTMLButtonElement>(mounted.container, "set-fresh");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");
      const foo = select.options[0]!;
      const bar = select.options[1]!;

      foo.selected = true;
      bar.selected = true;
      dispatchDomEvent(select, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        '[{"foo":1},{"bar":1}]',
        "Selecting both object-valued options should emit the original object references",
      );

      setSame.click();
      await flushDom();
      assertEqual(foo.selected, true, "Reference-identical Set updates should reselect foo");
      assertEqual(bar.selected, true, "Reference-identical Set updates should reselect bar");

      foo.selected = false;
      bar.selected = false;
      dispatchDomEvent(select, "change");
      await flushDom();

      setFresh.click();
      await flushDom();
      assertEqual(
        foo.selected,
        false,
        "Fresh object Set updates must not reselect foo because Set matching is reference-based",
      );
      assertEqual(
        bar.selected,
        false,
        "Fresh object Set updates must not reselect bar because Set matching is reference-based",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
