import { defineComponent, h, ref, vModelText, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

export const vModelMultipleListenersTestSuite: RuntimeTestSuite = {
  id: "runtime.dom.v-model-multiple-listeners",
  title: "v-model dispatches every registered update listener",
  summary:
    "When onUpdate:modelValue is an array, v-model must invoke each listener with the emitted value while still updating the bound state.",
  environment: "browser",
  features: ["runtime.dom", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with multiple listeners"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref<string | null>(null);
        const secondaryLog = ref("");

        return () =>
          h("section", null, [
            withDirectives(
              h("input", {
                "data-testid": "field",
                "onUpdate:modelValue": [
                  ($event: string | null) => {
                    value.value = $event;
                  },
                  ($event: string | null) => {
                    secondaryLog.value = secondaryLog.value
                      ? `${secondaryLog.value}|${$event ?? "null"}`
                      : ($event ?? "null");
                  },
                ],
              }),
              [[vModelText, value.value]],
            ),
            h("span", { "data-testid": "mirror" }, value.value ?? "null"),
            h("span", { "data-testid": "secondary-log" }, secondaryLog.value),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");
      const secondaryLog = getByTestId<HTMLElement>(mounted.container, "secondary-log");

      input.value = "foo";
      dispatchDomEvent(input, "input");
      await flushDom();

      assertEqual(
        mirror.textContent,
        "foo",
        "Primary update listener should synchronize the model",
      );
      assertEqual(
        secondaryLog.textContent,
        "foo",
        "Secondary update listeners should receive the same emitted value",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
