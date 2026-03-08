import { defineComponent, h } from "vue";
import { assertEqual } from "../assert.ts";
import { mount, normalizedText } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

export const namedSlotTestSuite: RuntimeTestSuite = {
  id: "runtime.components.named-slot",
  title: "Named slots render at their declared outlets",
  summary:
    "A component with a named slot and a default slot preserves the declared outlet order for both slot channels.",
  environment: "browser",
  features: ["runtime.components", "runtime.slots"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/componentSlots.spec.ts",
      cases: ["initSlots: instance.slots should be set correctly"],
    },
    {
      repository: "ubugeeei/vize",
      source: "playground/e2e/components.test.ts",
      cases: ["should handle slots"],
    },
  ],
  async run() {
    const Layout = defineComponent({
      setup(_, { slots }) {
        return () =>
          h("article", null, [
            h("header", { "data-testid": "header" }, slots.header?.()),
            h("main", { "data-testid": "body" }, slots.default?.()),
          ]);
      },
    });

    const App = defineComponent({
      setup() {
        return () =>
          h(Layout, null, {
            header: () => h("strong", "Heading"),
            default: () => h("p", "Body copy"),
          });
      },
    });

    const mounted = mount(App);

    try {
      assertEqual(
        normalizedText(mounted.container.textContent),
        "HeadingBody copy",
        "Named and default slots should render at their declared outlets",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
