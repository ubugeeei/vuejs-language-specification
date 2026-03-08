import { defineComponent, h, ref, vShow, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

export const vShowToggleCase: RuntimeCase = {
  id: "runtime.dom.v-show-toggle",
  title: "v-show toggles the element display style without removing the node",
  summary:
    "A v-show-bound element must remain mounted while its display style toggles between visible and none.",
  environment: "browser",
  features: ["runtime.directives", "runtime.v-show"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vShow.spec.ts",
      cases: ["should update show value changed"],
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
            withDirectives(h("div", { "data-testid": "panel" }, "panel"), [[vShow, visible.value]]),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const toggle = getByTestId<HTMLButtonElement>(mounted.container, "toggle");
      const panel = getByTestId<HTMLElement>(mounted.container, "panel");

      assertEqual(panel.style.display, "", "Visible v-show state should preserve empty display");

      toggle.click();
      await flushDom();
      assertEqual(panel.style.display, "none", "Falsy v-show state should hide the element");

      toggle.click();
      await flushDom();
      assertEqual(panel.style.display, "", "Truthy v-show state should restore visibility");
    } finally {
      mounted.cleanup();
    }
  },
};
