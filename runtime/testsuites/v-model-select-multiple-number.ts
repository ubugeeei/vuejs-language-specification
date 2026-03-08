import { assertEqual } from "../harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-select-multiple-number.vue",
  source: `<script setup lang="ts">
import { computed, ref } from "vue";

const value = ref<number[]>([]);
const mirror = computed(() => value.value.map((entry) => \`\${typeof entry}:\${entry}\`).join(","));
</script>

<template>
<section>
    <select v-model.number="value" data-testid="field" multiple>
      <option value="1">One</option>
      <option value="2">Two</option>
    </select>
    <button data-testid="set-two" @click="value = [2]">set-two</button>
    <span data-testid="mirror">{{ mirror }}</span>
  </section>
</template>`.trim(),
};

export const vModelSelectMultipleNumberTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-select-multiple-number",
  title: "Multiple-select v-model.number coerces option payloads to numbers",
  summary:
    "A multiple select using the number modifier must emit numeric arrays from string option values and re-apply numeric programmatic updates to option selection state.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["v-model.number should work with multiple select"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const select = getByTestId<HTMLSelectElement>(mounted.container, "field");
      const setTwo = getByTestId<HTMLButtonElement>(mounted.container, "set-two");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");
      const one = select.options[0]!;
      const two = select.options[1]!;

      one.selected = true;
      two.selected = true;
      dispatchDomEvent(select, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "number:1,number:2",
        "number modifier should coerce selected option payloads into numbers",
      );

      setTwo.click();
      await flushDom();
      assertEqual(one.selected, false, "Programmatic numeric array updates should deselect one");
      assertEqual(two.selected, true, "Programmatic numeric array updates should select two");
      assertEqual(
        mirror.textContent,
        "number:2",
        "Mirror should expose numeric programmatic state",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
