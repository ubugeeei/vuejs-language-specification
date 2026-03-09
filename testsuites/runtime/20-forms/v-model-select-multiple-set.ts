import { assertEqual } from "../../../runtime/harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-select-multiple-set.vue",
  source: `<script setup lang="ts">
import { computed, ref } from "vue";

const value = ref(new Set<string>());
const mirror = computed(() => [...value.value].sort().join(","));
</script>

<template>
<section>
    <select v-model="value" data-testid="field" multiple>
      <option value="foo">Foo</option>
      <option value="bar">Bar</option>
    </select>
    <button data-testid="set-both" @click="value = new Set(['foo', 'bar'])">set-both</button>
    <span data-testid="mirror">{{ mirror }}</span>
  </section>
</template>`.trim(),
};

export const vModelSelectMultipleSetTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-select-multiple-set",
  title: "Multiple-select Set models preserve selected membership",
  summary:
    "A multiple select bound to a Set model must emit Set payloads from selected options and re-apply programmatic Set replacement back to option selection state.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["multiple select (model is Set)"],
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
      assertEqual(mirror.textContent, "foo", 'Selecting foo should emit Set{"foo"}');

      foo.selected = true;
      bar.selected = true;
      dispatchDomEvent(select, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "bar,foo",
        "Selecting both options should emit both Set members",
      );

      setBoth.click();
      await flushDom();
      assertEqual(foo.selected, true, "Programmatic Set updates should reselect foo");
      assertEqual(bar.selected, true, "Programmatic Set updates should reselect bar");
    } finally {
      mounted.cleanup();
    }
  },
};
