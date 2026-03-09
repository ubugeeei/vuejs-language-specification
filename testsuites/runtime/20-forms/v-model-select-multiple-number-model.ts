import { assertEqual } from "../../../runtime/harness/assert.ts";
import { flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-select-multiple-number-model.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";

const value = ref([1, 2]);
</script>

<template>
<section>
    <select v-model="value" data-testid="field" multiple>
      <option value="1">One</option>
      <option value="2">Two</option>
    </select>
  </section>
</template>`.trim(),
};

export const vModelSelectMultipleNumberModelTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-select-multiple-number-model",
  title: "Multiple-select matches numeric model values against string option values",
  summary:
    "A multiple select bound to a numeric array model must restore selection for string-valued options using Vue's loose equality semantics.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["multiple select (model is number, option value is string)"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const select = getByTestId<HTMLSelectElement>(mounted.container, "field");
      const foo = select.options[0]!;
      const bar = select.options[1]!;

      await flushDom();
      assertEqual(foo.selected, true, 'Loose-equal numeric models should select option value "1"');
      assertEqual(bar.selected, true, 'Loose-equal numeric models should select option value "2"');
    } finally {
      mounted.cleanup();
    }
  },
};
