import { defineComponent, h, renderSlot } from "vue";
import { assertEqual } from "../assert.ts";
import { mount, normalizedText } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

export const slotFallbackTestSuite: RuntimeTestSuite = {
  id: "runtime.components.slot-fallback",
  title: "Slot fallback content renders when the caller does not provide the slot",
  summary:
    "A slot outlet with fallback content must render the fallback branch when the corresponding slot channel is absent.",
  environment: "browser",
  features: ["runtime.components", "runtime.slots"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/helpers/renderSlot.spec.ts",
      cases: ["should render slot fallback"],
    },
  ],
  async run() {
    const Layout = defineComponent({
      setup(_, { slots }) {
        return () =>
          h("section", { "data-testid": "root" }, [
            renderSlot(slots, "default", {}, () => [
              h("span", { "data-testid": "fallback" }, "fallback"),
            ]),
          ]);
      },
    });

    const App = defineComponent({
      setup() {
        return () => h(Layout);
      },
    });

    const mounted = mount(App);

    try {
      assertEqual(
        normalizedText(mounted.container.textContent),
        "fallback",
        "Missing slots should render the declared fallback content",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
