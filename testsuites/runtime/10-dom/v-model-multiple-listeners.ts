import { assertEqual } from "../../../runtime/harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-multiple-listeners.vue",
  source: `<script setup lang="ts">
import { defineComponent, h, ref, vModelDynamic, withDirectives } from "vue";

const value = ref<string | null>(null);
const secondaryLog = ref("");

function recordSecondary(nextValue: string | null): void {
  secondaryLog.value = secondaryLog.value
    ? \`\${secondaryLog.value}|\${nextValue ?? "null"}\`
    : (nextValue ?? "null");
}

const ModelField = defineComponent({
  render() {
    return withDirectives(
      h("input", {
        "data-testid": "field",
        "onUpdate:modelValue": [
          (nextValue: string | null) => {
            value.value = nextValue;
          },
          recordSecondary,
        ],
      }),
      [[vModelDynamic, value.value, "", undefined]],
    );
  },
});
</script>

<template>
  <section>
    <ModelField />
    <span data-testid="mirror">{{ value ?? "null" }}</span>
    <span data-testid="secondary-log">{{ secondaryLog }}</span>
  </section>
</template>`.trim(),
};

export const vModelMultipleListenersTestSuite: RuntimeTestSuite = {
  id: "runtime.dom.v-model-multiple-listeners",
  title: "v-model dispatches every registered update listener",
  summary:
    "When v-model lowering coexists with an explicit update listener, both listeners must receive the same emitted value while the bound state still synchronizes.",
  environment: "browser",
  features: ["runtime.dom", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with multiple listeners"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");
      const secondaryLog = getByTestId<HTMLElement>(mounted.container, "secondary-log");

      input.value = "foo";
      dispatchDomEvent(input, "input");
      await flushDom();

      assertEqual(
        mirror.textContent,
        "foo",
        "Primary update listener should synchronize the model",
      );
      assertEqual(
        secondaryLog.textContent,
        "foo",
        "Secondary update listeners should receive the same emitted value",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
