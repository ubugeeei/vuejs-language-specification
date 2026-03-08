import { defineComponent, h, ref } from "vue";
import { assertEqual } from "../assert.ts";
import { flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

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
  async run() {
    const Child = defineComponent({
      emits: ["increment"],
      setup(_, { emit }) {
        return () =>
          h(
            "button",
            {
              "data-testid": "child",
              onClick: () => {
                emit("increment");
              },
            },
            "child",
          );
      },
    });

    const App = defineComponent({
      setup() {
        const count = ref(0);
        return () =>
          h("section", null, [
            h(Child, {
              onIncrement: () => {
                count.value += 1;
              },
            }),
            h("span", { "data-testid": "count" }, String(count.value)),
          ]);
      },
    });

    const mounted = mount(App);

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
