import { assertEqual } from "../../../runtime/harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-checkbox-set.vue",
  source: `<script setup lang="ts">
import { computed, ref } from "vue";

const value = ref(new Set<string>());
const mirror = computed(() => [...value.value].sort().join(","));
</script>

<template>
<section>
    <input v-model="value" data-testid="foo" type="checkbox" value="foo" />
    <input v-model="value" data-testid="bar" type="checkbox" value="bar" />
    <button data-testid="set-foo" @click="value = new Set(['foo'])">set-foo</button>
    <span data-testid="mirror">{{ mirror }}</span>
  </section>
</template>`.trim(),
};

export const vModelCheckboxSetTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-checkbox-set",
  title: "Checkbox v-model preserves Set membership semantics",
  summary:
    "Checkbox groups bound to a Set model must add and delete element values on change and reflect programmatic Set replacement in checked state.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should support Set as a checkbox model"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const foo = getByTestId<HTMLInputElement>(mounted.container, "foo");
      const bar = getByTestId<HTMLInputElement>(mounted.container, "bar");
      const setFoo = getByTestId<HTMLButtonElement>(mounted.container, "set-foo");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      foo.checked = true;
      dispatchDomEvent(foo, "change");
      await flushDom();
      assertEqual(mirror.textContent, "foo", "Checking foo should add foo to the Set model");

      bar.checked = true;
      dispatchDomEvent(bar, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "bar,foo",
        "Checking bar should preserve existing Set members and add bar",
      );

      foo.checked = false;
      dispatchDomEvent(foo, "change");
      await flushDom();
      assertEqual(mirror.textContent, "bar", "Unchecking foo should delete foo from the Set");

      setFoo.click();
      await flushDom();
      assertEqual(foo.checked, true, "Programmatic Set replacement should check present values");
      assertEqual(bar.checked, false, "Programmatic Set replacement should uncheck missing values");
      assertEqual(mirror.textContent, "foo", "Mirror should expose the programmatic Set state");
    } finally {
      mounted.cleanup();
    }
  },
};
