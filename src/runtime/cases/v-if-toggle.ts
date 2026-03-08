import { defineComponent, h, ref } from "vue";
import { assert, assertEqual } from "../assert.ts";
import { flushDom, getByTestId, mount, queryByTestId } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

export const vIfToggleCase: RuntimeCase = {
  id: "runtime.dom.v-if-toggle",
  title: "v-if toggles a branch on and off across flushes",
  summary:
    "A conditional branch is inserted and removed from the DOM when its controlling ref changes through an event handler.",
  environment: "browser",
  features: ["runtime.dom", "runtime.v-if"],
  upstream: [
    {
      repository: "ubugeeei/vize",
      source: "playground/e2e/components.test.ts",
      cases: ["should handle v-if directive"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const visible = ref(true);
        return () =>
          h("section", null, [
            h(
              "button",
              {
                "data-testid": "toggle",
                onClick: () => {
                  visible.value = !visible.value;
                },
              },
              "toggle",
            ),
            visible.value ? h("p", { "data-testid": "panel" }, "Visible") : null,
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const button = getByTestId<HTMLButtonElement>(mounted.container, "toggle");
      assert(
        queryByTestId(mounted.container, "panel"),
        "Conditional branch should mount initially",
      );

      button.click();
      await flushDom();
      assertEqual(
        queryByTestId(mounted.container, "panel"),
        null,
        "Conditional branch should be removed after toggling off",
      );

      button.click();
      await flushDom();
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "panel").textContent,
        "Visible",
        "Conditional branch should mount again after toggling on",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
