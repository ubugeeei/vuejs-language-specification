import { defineComponent, h, ref, vModelSelect, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

function describeObservedValue(value: number | null): string {
  return value === null ? "null" : `${typeof value}:${value}`;
}

export const vModelSelectNumberCase: RuntimeCase = {
  id: "runtime.forms.v-model-select-number",
  title: "Single-select v-model.number coerces string option values to numbers",
  summary:
    "A single select using the number modifier must emit numeric model values when string-valued options are selected.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["v-model.number should work with select tag"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref<number | null>(null);

        return () =>
          h("section", null, [
            withDirectives(
              h(
                "select",
                {
                  "data-testid": "field",
                  "onUpdate:modelValue": ($event: number | null) => {
                    value.value = $event;
                  },
                },
                [h("option", { value: "1" }, "One"), h("option", { value: "2" }, "Two")],
              ),
              [[vModelSelect, value.value, undefined, { number: true }]],
            ),
            h("span", { "data-testid": "mirror" }, describeObservedValue(value.value)),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const select = getByTestId<HTMLSelectElement>(mounted.container, "field");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");
      const one = select.options[0]!;

      one.selected = true;
      dispatchDomEvent(select, "change");
      await flushDom();

      assertEqual(
        mirror.textContent,
        "number:1",
        "number modifier should coerce the selected option payload into a number",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
