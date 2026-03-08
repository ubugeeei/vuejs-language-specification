import { assertEqual } from "../harness/assert.ts";
import { flushDom, getByTestId } from "../harness/dom.ts";
import { mountRuntimeInput } from "../harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "lifecycle-mount-unmount.vue",
  source: `<script setup lang="ts">
import { defineComponent, onMounted, onUnmounted, ref } from "vue";
import type { PropType } from "vue";

const visible = ref(true);
const log = ref<string[]>([]);

const Child = defineComponent({
  props: {
    log: {
      type: Array as PropType<string[]>,
      required: true,
    },
  },
  setup(props) {
    onMounted(() => {
      props.log.push("mounted");
    });
    onUnmounted(() => {
      props.log.push("unmounted");
    });

    return {};
  },
  template: \`<p data-testid="child">child</p>\`,
});
</script>

<template>
<section>
    <button data-testid="toggle" @click="visible = !visible">toggle</button>
    <span data-testid="log">{{ log.join(",") }}</span>
    <Child v-if="visible" :log="log" />
  </section>
</template>`.trim(),
};

export const lifecycleMountUnmountTestSuite: RuntimeTestSuite = {
  id: "runtime.lifecycle.mount-unmount",
  title: "Mount and unmount hooks fire exactly once per insertion cycle",
  summary:
    "Component lifecycle hooks record one mount and one unmount when a child is toggled into and out of the rendered tree.",
  environment: "browser",
  features: ["runtime.components", "runtime.lifecycle"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/apiLifecycle.spec.ts",
      cases: ["onMounted", "onUnmounted"],
    },
    {
      repository: "ubugeeei/vize",
      source: "playground/e2e/components.test.ts",
      cases: ["should call onMounted", "should call onUnmounted"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      await flushDom();
      const log = getByTestId<HTMLElement>(mounted.container, "log");
      assertEqual(
        log.textContent,
        "mounted",
        "Mount hook should fire once for the initial insertion",
      );

      getByTestId<HTMLButtonElement>(mounted.container, "toggle").click();
      await flushDom();
      assertEqual(
        log.textContent,
        "mounted,unmounted",
        "Unmount hook should fire once when the child is removed",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
