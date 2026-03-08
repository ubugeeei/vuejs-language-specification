import { defineComponent, h, ref } from "vue";
import { assertDeepEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

export const keyedListPreservesInputCase: RuntimeCase = {
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
  async run() {
    const Row = defineComponent({
      props: {
        item: {
          type: Object,
          required: true,
        },
      },
      setup(props) {
        const draft = ref((props.item as { initial: string }).initial);
        return () =>
          h("div", { "data-testid": `row-${(props.item as { id: number }).id}` }, [
            h(
              "span",
              { "data-testid": `label-${(props.item as { id: number }).id}` },
              (props.item as { label: string }).label,
            ),
            h("input", {
              "data-testid": `input-${(props.item as { id: number }).id}`,
              value: draft.value,
              onInput: (event: Event) => {
                draft.value = (event.target as HTMLInputElement).value;
              },
            }),
          ]);
      },
    });

    const App = defineComponent({
      setup() {
        const items = ref([
          { id: 1, label: "alpha", initial: "A" },
          { id: 2, label: "beta", initial: "B" },
        ]);
        return () =>
          h("section", null, [
            h(
              "button",
              {
                "data-testid": "reverse",
                onClick: () => {
                  items.value = [...items.value].reverse();
                },
              },
              "reverse",
            ),
            ...items.value.map((item) =>
              h(Row, {
                key: item.id,
                item,
              }),
            ),
          ]);
      },
    });

    const mounted = mount(App);

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
