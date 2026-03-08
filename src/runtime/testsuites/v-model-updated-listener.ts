import { defineComponent, h, ref, vModelText, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

export const vModelUpdatedListenerTestSuite: RuntimeTestSuite = {
  id: "runtime.dom.v-model-updated-listener",
  title: "v-model respects updated listener identity after rerender",
  summary:
    "When the onUpdate:modelValue listener changes across renders, subsequent updates must be delivered to the latest listener only.",
  environment: "browser",
  features: ["runtime.dom", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with updated listeners"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref("foo");
        const usePrimary = ref(true);
        const log = ref("");

        function record(prefix: string, nextValue: string): void {
          value.value = nextValue;
          log.value = log.value ? `${log.value}|${prefix}:${nextValue}` : `${prefix}:${nextValue}`;
        }

        return () =>
          h("section", null, [
            withDirectives(
              h("input", {
                "data-testid": "field",
                "onUpdate:modelValue": usePrimary.value
                  ? ($event: string) => {
                      record("primary", $event);
                    }
                  : ($event: string) => {
                      record("secondary", $event);
                    },
              }),
              [[vModelText, value.value]],
            ),
            h("button", {
              "data-testid": "toggle",
              onClick: () => {
                usePrimary.value = false;
              },
            }),
            h("span", { "data-testid": "mirror" }, value.value),
            h("span", { "data-testid": "log" }, log.value),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const toggle = getByTestId<HTMLButtonElement>(mounted.container, "toggle");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");
      const log = getByTestId<HTMLElement>(mounted.container, "log");

      input.value = "foo";
      dispatchDomEvent(input, "input");
      await flushDom();
      assertEqual(mirror.textContent, "foo", "Initial listener should update the bound value");
      assertEqual(
        log.textContent,
        "primary:foo",
        "Initial listener should receive the first update",
      );

      toggle.click();
      await flushDom();

      input.value = "bar";
      dispatchDomEvent(input, "input");
      await flushDom();
      assertEqual(mirror.textContent, "bar", "Updated listener should update the bound value");
      assertEqual(
        log.textContent,
        "primary:foo|secondary:bar",
        "After rerender, only the latest listener should receive subsequent updates",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
