import { defineComponent, h, ref, vModelSelect, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

export const vModelSelectCase: RuntimeCase = {
  id: "runtime.forms.v-model-select",
  title: "Single-select v-model keeps selected option and reactive state synchronized",
  summary:
    "Changing a single select updates the bound state, and a subsequent state update restores the selected option.",
  environment: "browser",
  features: ["runtime.v-model", "runtime.forms"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with single select"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref("foo");

        return () =>
          h("section", null, [
            withDirectives(
              h(
                "select",
                {
                  "data-testid": "field",
                  "onUpdate:modelValue": ($event: string) => {
                    value.value = $event;
                  },
                },
                [h("option", { value: "foo" }, "Foo"), h("option", { value: "bar" }, "Bar")],
              ),
              [[vModelSelect, value.value]],
            ),
            h(
              "button",
              {
                "data-testid": "reset",
                onClick: () => {
                  value.value = "foo";
                },
              },
              "reset",
            ),
            h("span", { "data-testid": "mirror" }, value.value),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const select = getByTestId<HTMLSelectElement>(mounted.container, "field");
      const reset = getByTestId<HTMLButtonElement>(mounted.container, "reset");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      assertEqual(select.value, "foo", "Initial select state should match the bound model");

      select.value = "bar";
      dispatchDomEvent(select, "change");
      await flushDom();

      assertEqual(mirror.textContent, "bar", "Reactive state should reflect the changed option");
      assertEqual(select.value, "bar", "Selected option should remain in sync after user input");

      reset.click();
      await flushDom();

      assertEqual(select.value, "foo", "Programmatic model updates should restore selection");
      assertEqual(mirror.textContent, "foo", "Mirror text should reflect the restored model");
    } finally {
      mounted.cleanup();
    }
  },
};
