import { assertEqual } from "../../../runtime/harness/assert.ts";
import { flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "parent-emits.vue",
  source: `<script setup lang="ts">
import { defineComponent, ref } from "vue";

const count = ref(0);

const Child = defineComponent({
  emits: ["increment"],
  template: \`<button data-testid="child" @click="$emit('increment')">child</button>\`,
});
</script>

<template>
<section>
    <Child @increment="count += 1" />
    <span data-testid="count">{{ count }}</span>
  </section>
</template>`.trim(),
};

export const parentEmitsTestSuite: RuntimeTestSuite = {
  id: "runtime.components.parent-emits",
  title: "Child emits trigger parent listeners and update parent state",
  summary:
    "A declared child emit invokes the parent listener and the parent re-renders with the new observable count.",
  environment: "browser",
  features: ["runtime.components", "runtime.emits"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/componentEmits.spec.ts",
      cases: ["trigger handlers"],
    },
    {
      repository: "ubugeeei/vize",
      source: "playground/e2e/components.test.ts",
      cases: ["should handle emits"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const button = getByTestId<HTMLButtonElement>(mounted.container, "child");
      const count = getByTestId<HTMLElement>(mounted.container, "count");

      assertEqual(count.textContent, "0", "Parent count should start at zero");
      button.click();
      await flushDom();
      assertEqual(count.textContent, "1", "Parent listener should observe the child emit");
    } finally {
      mounted.cleanup();
    }
  },
};
