import { defineComponent, h } from "vue";
import { assertEqual } from "../assert.ts";
import { mount, normalizedText } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

export const slotProjectionTestSuite: RuntimeTestSuite = {
  id: "runtime.components.default-slot",
  title: "Default slot content is projected at the declared outlet",
  summary:
    "A child component renders the default slot content at the slot outlet without reordering surrounding DOM.",
  environment: "browser",
  features: ["runtime.slots", "runtime.components"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/helpers/renderSlot.spec.ts",
      cases: ["should render slot"],
    },
  ],
  async run() {
    const Card = defineComponent({
      setup(_, { slots }) {
        return () => h("section", { "data-testid": "card" }, [h("h2", "Title"), slots.default?.()]);
      },
    });

    const App = defineComponent({
      setup() {
        return () =>
          h(Card, null, {
            default: () => h("p", { "data-testid": "body" }, "Slot body"),
          });
      },
    });

    const mounted = mount(App);

    try {
      assertEqual(
        normalizedText(mounted.container.textContent),
        "TitleSlot body",
        "Slot content should be projected after the heading",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
