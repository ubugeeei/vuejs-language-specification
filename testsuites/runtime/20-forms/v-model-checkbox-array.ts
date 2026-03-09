import { assertEqual } from "../../../runtime/harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-checkbox-array.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";

const value = ref<string[]>([]);
</script>

<template>
<section>
    <input v-model="value" data-testid="foo" type="checkbox" value="foo" />
    <input v-model="value" data-testid="bar" type="checkbox" value="bar" />
    <button data-testid="set-bar" @click="value = ['bar']">set-bar</button>
    <span data-testid="mirror">{{ value.join(",") }}</span>
  </section>
</template>`.trim(),
};

export const vModelCheckboxArrayTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-checkbox-array",
  title: "Checkbox v-model preserves array membership semantics",
  summary:
    "Checkbox groups bound to an array model must add and remove element values on change and reflect subsequent programmatic array updates in checked state.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should support array as a checkbox model"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const foo = getByTestId<HTMLInputElement>(mounted.container, "foo");
      const bar = getByTestId<HTMLInputElement>(mounted.container, "bar");
      const setBar = getByTestId<HTMLButtonElement>(mounted.container, "set-bar");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      foo.checked = true;
      dispatchDomEvent(foo, "change");
      await flushDom();
      assertEqual(mirror.textContent, "foo", "Checking foo should append foo to the array model");

      bar.checked = true;
      dispatchDomEvent(bar, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "foo,bar",
        "Checking bar should preserve foo and append bar to the array model",
      );

      bar.checked = false;
      dispatchDomEvent(bar, "change");
      await flushDom();
      assertEqual(mirror.textContent, "foo", "Unchecking bar should remove only bar");

      setBar.click();
      await flushDom();
      assertEqual(foo.checked, false, "Programmatic array updates should uncheck removed values");
      assertEqual(bar.checked, true, "Programmatic array updates should check retained values");
      assertEqual(mirror.textContent, "bar", "Mirror should expose the programmatic array state");
    } finally {
      mounted.cleanup();
    }
  },
};
