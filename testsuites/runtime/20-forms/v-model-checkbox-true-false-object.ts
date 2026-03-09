import { assertEqual } from "../../../runtime/harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-checkbox-true-false-object.vue",
  source: `<script setup lang="ts">
import { computed, ref } from "vue";

const TRUE_VALUE = { yes: "yes" };
const FALSE_VALUE = { no: "no" };
const value = ref<unknown>(null);
const mirror = computed(() => JSON.stringify(value.value));
</script>

<template>
<label>
    <input
      v-model="value"
      :false-value="FALSE_VALUE"
      data-testid="field"
      type="checkbox"
      :true-value="TRUE_VALUE"
    />
    <button data-testid="set-false" @click="value = { no: 'no' }">set-false</button>
    <button data-testid="set-true" @click="value = { yes: 'yes' }">set-true</button>
    <span data-testid="mirror">{{ mirror }}</span>
  </label>
</template>`.trim(),
};

export const vModelCheckboxTrueFalseObjectTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-checkbox-true-false-object",
  title: "Checkbox v-model preserves object true-value and false-value payloads",
  summary:
    "A checkbox using object true-value and false-value payloads must emit those exact payload shapes and update checked state from programmatic model replacement.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with checkbox and true-value/false-value with object values"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const setFalse = getByTestId<HTMLButtonElement>(mounted.container, "set-false");
      const setTrue = getByTestId<HTMLButtonElement>(mounted.container, "set-true");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      input.checked = true;
      dispatchDomEvent(input, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        '{"yes":"yes"}',
        "Checking the box should emit the configured object true-value",
      );

      setFalse.click();
      await flushDom();
      assertEqual(input.checked, false, "Loose-equal false object should clear checked state");

      setTrue.click();
      await flushDom();
      assertEqual(input.checked, true, "Loose-equal true object should restore checked state");
    } finally {
      mounted.cleanup();
    }
  },
};
