import { assertEqual } from "../harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-select-multiple-object-array.vue",
  source: `<script setup lang="ts">
import { computed, ref } from "vue";

const FOO_VALUE = { foo: 1 };
const BAR_VALUE = { bar: 1 };
const value = ref<Array<Record<string, number>>>([]);
const mirror = computed(() => JSON.stringify(value.value));
</script>

<template>
<section>
    <select v-model="value" data-testid="field" multiple>
      <option :value="FOO_VALUE">Foo</option>
      <option :value="BAR_VALUE">Bar</option>
    </select>
    <button data-testid="set-fresh" @click="value = [{ foo: 1 }, { bar: 1 }]">set-fresh</button>
    <span data-testid="mirror">{{ mirror }}</span>
  </section>
</template>`.trim(),
};

export const vModelSelectMultipleObjectArrayTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-select-multiple-object-array",
  title: "Multiple-select array models use loose-equal matching for object option values",
  summary:
    "A multiple select bound to an array model must emit option object payloads and restore selection for programmatic arrays that are only loose-equal to the original option values.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["multiple select (model is Array, option value is object)"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const select = getByTestId<HTMLSelectElement>(mounted.container, "field");
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
        "Selecting both object-valued options should emit the original object payloads",
      );

      foo.selected = false;
      bar.selected = false;
      dispatchDomEvent(select, "change");
      await flushDom();
      assertEqual(mirror.textContent, "[]", "Clearing selection should empty the array model");

      setFresh.click();
      await flushDom();
      assertEqual(
        foo.selected,
        true,
        "Loose-equal object array updates should reselect the first option",
      );
      assertEqual(
        bar.selected,
        true,
        "Loose-equal object array updates should reselect the second option",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
