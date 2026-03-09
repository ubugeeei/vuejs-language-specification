import { assertEqual } from "../../../runtime/harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-textarea.vue",
  source: `<script setup lang="ts">
import { computed, ref } from "vue";

const value = ref<string | null>(null);
const mirror = computed(() => value.value ?? "null");
</script>

<template>
<section>
    <textarea v-model="value" data-testid="field" />
    <button data-testid="set-bar" @click="value = 'bar'">set-bar</button>
    <span data-testid="mirror">{{ mirror }}</span>
  </section>
</template>`.trim(),
};

export const vModelTextareaTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-textarea",
  title: "Textarea v-model keeps DOM and state synchronized",
  summary:
    "A textarea bound through v-model must update component state on input and reflect subsequent programmatic state updates in the DOM value.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with textarea"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const textarea = getByTestId<HTMLTextAreaElement>(mounted.container, "field");
      const setBar = getByTestId<HTMLButtonElement>(mounted.container, "set-bar");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      textarea.value = "foo";
      dispatchDomEvent(textarea, "input");
      await flushDom();
      assertEqual(mirror.textContent, "foo", "Textarea input should update the bound model");

      setBar.click();
      await flushDom();
      assertEqual(textarea.value, "bar", "Programmatic model updates should rewrite textarea DOM");
      assertEqual(
        mirror.textContent,
        "bar",
        "Mirror should expose the programmatic textarea state",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
