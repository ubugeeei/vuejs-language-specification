import { assertEqual } from "../harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-radio.vue",
  source: `<script setup lang="ts">
import { ref } from "vue";

const value = ref("foo");
</script>

<template>
<fieldset>
    <input v-model="value" data-testid="foo" type="radio" value="foo" />
    <input v-model="value" data-testid="bar" type="radio" value="bar" />
    <span data-testid="mirror">{{ value }}</span>
  </fieldset>
</template>`.trim(),
};

export const vModelRadioTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-radio",
  title: "Radio v-model preserves single-choice synchronization",
  summary:
    "A radio group bound through v-model must expose exactly one checked input and update the bound model when the checked option changes.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with radio"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const foo = getByTestId<HTMLInputElement>(mounted.container, "foo");
      const bar = getByTestId<HTMLInputElement>(mounted.container, "bar");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      assertEqual(foo.checked, true, "Initial radio selection should match the bound model");
      assertEqual(bar.checked, false, "Unselected radio should start unchecked");
      assertEqual(mirror.textContent, "foo", "Mirror should expose the initial model value");

      bar.checked = true;
      dispatchDomEvent(bar, "change");
      await flushDom();

      assertEqual(foo.checked, false, "Changing the selection should uncheck the previous radio");
      assertEqual(bar.checked, true, "Changing the selection should check the new radio");
      assertEqual(mirror.textContent, "bar", "Mirror should reflect the new radio value");
    } finally {
      mounted.cleanup();
    }
  },
};
