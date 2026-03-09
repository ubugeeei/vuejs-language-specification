import { assertDeepEqual } from "../../../runtime/harness/assert.ts";
import { dispatchDomEvent, flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "keyed-list-preserves-input.vue",
  source: `<script setup lang="ts">
import { defineComponent, ref } from "vue";
import type { PropType } from "vue";

interface RowItem {
  id: number;
  label: string;
  initial: string;
}

const Row = defineComponent({
  props: {
    item: {
      type: Object as PropType<RowItem>,
      required: true,
    },
  },
  setup(props) {
    const draft = ref(props.item.initial);

    function onInput(event: Event): void {
      draft.value = (event.target as HTMLInputElement).value;
    }

    return {
      draft,
      onInput,
    };
  },
  template: \`
    <div :data-testid="'row-' + item.id">
      <span :data-testid="'label-' + item.id">{{ item.label }}</span>
      <input :data-testid="'input-' + item.id" :value="draft" @input="onInput" />
    </div>
  \`,
});

const items = ref<RowItem[]>([
  { id: 1, label: "alpha", initial: "A" },
  { id: 2, label: "beta", initial: "B" },
]);

function reverseItems(): void {
  items.value = [...items.value].reverse();
}
</script>

<template>
<section>
    <button data-testid="reverse" @click="reverseItems">reverse</button>
    <Row v-for="item in items" :key="item.id" :item="item" />
  </section>
</template>`.trim(),
};

export const keyedListPreservesInputTestSuite: RuntimeTestSuite = {
  id: "runtime.dom.keyed-list-preserves-input-state",
  title: "Keyed list moves preserve per-item input state under reordering",
  summary:
    "When keyed rows are reordered, user edits stay attached to the keyed item instead of the previous physical index.",
  environment: "browser",
  features: ["runtime.dom", "runtime.v-for", "runtime.keyed-children"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/rendererChildren.spec.ts",
      cases: ["reverse element", "reorder elements"],
    },
    {
      repository: "ubugeeei/vize",
      source: "playground/e2e/components.test.ts",
      cases: ["should handle v-for directive"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const inputAlpha = getByTestId<HTMLInputElement>(mounted.container, "input-1");
      inputAlpha.value = "Edited";
      dispatchDomEvent(inputAlpha, "input");
      await flushDom();

      getByTestId<HTMLButtonElement>(mounted.container, "reverse").click();
      await flushDom();

      const rows = [
        ...mounted.container.querySelectorAll<HTMLElement>("[data-testid^='row-']"),
      ].map((row) => ({
        testId: row.dataset.testid ?? "",
        label: row.querySelector("span")?.textContent ?? "",
        value: row.querySelector("input")?.value ?? "",
      }));

      assertDeepEqual(
        rows,
        [
          { testId: "row-2", label: "beta", value: "B" },
          { testId: "row-1", label: "alpha", value: "Edited" },
        ],
        "Keyed rows should keep user edits attached to their logical item after reordering",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
