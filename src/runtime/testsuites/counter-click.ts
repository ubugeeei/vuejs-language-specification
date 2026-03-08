import { defineComponent, h, ref } from "vue";
import { assertEqual } from "../assert.ts";
import { flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

export const counterClickTestSuite: RuntimeTestSuite = {
  id: "runtime.dom.counter-click",
  title: "Clicking a counter button updates DOM text after the next tick",
  summary:
    "A basic event handler mutates reactive state and the DOM reflects the new value on the following flush.",
  environment: "browser",
  features: ["runtime.events", "runtime.dom"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/patchEvents.spec.ts",
      cases: ["should assign event handler"],
    },
    {
      repository: "ubugeeei/vize",
      source: "playground/e2e/components.test.ts",
      cases: ["should render component with reactive state"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const count = ref(0);
        return () =>
          h(
            "button",
            {
              "data-testid": "counter",
              onClick: () => {
                count.value += 1;
              },
            },
            String(count.value),
          );
      },
    });

    const mounted = mount(App);

    try {
      const button = getByTestId<HTMLButtonElement>(mounted.container, "counter");
      assertEqual(button.textContent, "0", "Counter should start at zero");

      button.click();
      await flushDom();

      assertEqual(button.textContent, "1", "Counter should increment after click");
    } finally {
      mounted.cleanup();
    }
  },
};
