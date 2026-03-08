import { assertEqual } from "../harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-select-multiple.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";

const value = ref<string[]>([]);
</script>

<template>
<section>
    <select v-model="value" data-testid="field" multiple>
      <option value="foo">Foo</option>
      <option value="bar">Bar</option>
    </select>
    <button data-testid="set-both" @click="value = ['foo', 'bar']">set-both</button>
    <span data-testid="mirror">{{ value.join(",") }}</span>
  </section>
</template>`.trim(),
};

export const vModelSelectMultipleTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-select-multiple",
  title: "Multiple-select v-model preserves ordered array selection",
  summary:
    "A multiple select bound through v-model must emit an array of selected values and re-apply programmatic array updates back to option selection state.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["multiple select (model is Array)"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const select = getByTestId<HTMLSelectElement>(mounted.container, "field");
      const setBoth = getByTestId<HTMLButtonElement>(mounted.container, "set-both");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");
      const foo = select.options[0]!;
      const bar = select.options[1]!;

      foo.selected = true;
      bar.selected = false;
      dispatchDomEvent(select, "change");
      await flushDom();
      assertEqual(mirror.textContent, "foo", "Single selection should emit a singleton array");

      foo.selected = true;
      bar.selected = true;
      dispatchDomEvent(select, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "foo,bar",
        "Selecting both options should preserve the ordered selected array",
      );

      setBoth.click();
      await flushDom();
      assertEqual(foo.selected, true, "Programmatic array updates should reselect foo");
      assertEqual(bar.selected, true, "Programmatic array updates should reselect bar");
      assertEqual(mirror.textContent, "foo,bar", "Mirror should expose the programmatic selection");
    } finally {
      mounted.cleanup();
    }
  },
};
