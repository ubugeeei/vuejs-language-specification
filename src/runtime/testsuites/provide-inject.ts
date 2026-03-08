import { defineComponent, h, inject, provide, ref } from "vue";
import { assertEqual } from "../assert.ts";
import { flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

export const provideInjectTestSuite: RuntimeTestSuite = {
  id: "runtime.components.provide-inject-ref",
  title: "Injected refs remain reactive across provider updates",
  summary:
    "A descendant reading an injected ref sees provider mutations after the same DOM flush boundaries as local refs.",
  environment: "browser",
  features: ["runtime.components", "runtime.provide-inject"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/apiInject.spec.ts",
      cases: ["reactivity with refs"],
    },
  ],
  async run() {
    const key = Symbol("message");

    const Child = defineComponent({
      setup() {
        const message = inject<ReturnType<typeof ref<string>>>(key);
        return () => h("p", { "data-testid": "message" }, message?.value ?? "");
      },
    });

    const App = defineComponent({
      setup() {
        const message = ref("initial");
        provide(key, message);
        return () =>
          h("section", null, [
            h(
              "button",
              {
                "data-testid": "bump",
                onClick: () => {
                  message.value = "updated";
                },
              },
              "update",
            ),
            h(Child),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const message = getByTestId<HTMLElement>(mounted.container, "message");
      assertEqual(
        message.textContent,
        "initial",
        "Injected ref should render the initial provider value",
      );

      getByTestId<HTMLButtonElement>(mounted.container, "bump").click();
      await flushDom();
      assertEqual(
        message.textContent,
        "updated",
        "Injected ref should react to provider mutations",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
