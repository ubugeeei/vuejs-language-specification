import { defineComponent, h, ref, vModelText, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

function describeObservedValue(value: number | null): string {
  return value === null ? "null" : `${typeof value}:${value}`;
}

export const vModelNumberInputCase: RuntimeCase = {
  id: "runtime.forms.v-model-number-input",
  title: "Number inputs coerce model values to numbers",
  summary:
    "An input[type=number] bound through v-model must emit numeric model values rather than strings.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with number input"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref<number | null>(null);

        return () =>
          h("label", null, [
            withDirectives(
              h("input", {
                "data-testid": "field",
                type: "number",
                "onUpdate:modelValue": ($event: number | null) => {
                  value.value = $event;
                },
              }),
              [[vModelText, value.value]],
            ),
            h("span", { "data-testid": "mirror" }, describeObservedValue(value.value)),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      assertEqual(input.value, "", "Number input should start empty for a null model");
      assertEqual(input.type, "number", "Field should be rendered as a number input");

      input.value = "1";
      dispatchDomEvent(input, "input");
      await flushDom();

      assertEqual(
        mirror.textContent,
        "number:1",
        "Number input should coerce user input into a numeric model value",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
