import { defineComponent, h, ref, vModelSelect, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

function formatNumberArray(value: number[]): string {
  return value.map((entry) => `${typeof entry}:${entry}`).join(",");
}

export const vModelSelectMultipleNumberTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-select-multiple-number",
  title: "Multiple-select v-model.number coerces option payloads to numbers",
  summary:
    "A multiple select using the number modifier must emit numeric arrays from string option values and re-apply numeric programmatic updates to option selection state.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["v-model.number should work with multiple select"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref<number[]>([]);

        return () =>
          h("section", null, [
            withDirectives(
              h(
                "select",
                {
                  "data-testid": "field",
                  multiple: true,
                  "onUpdate:modelValue": ($event: number[]) => {
                    value.value = $event;
                  },
                },
                [h("option", { value: "1" }, "One"), h("option", { value: "2" }, "Two")],
              ),
              [[vModelSelect, value.value, undefined, { number: true }]],
            ),
            h(
              "button",
              {
                "data-testid": "set-two",
                onClick: () => {
                  value.value = [2];
                },
              },
              "set-two",
            ),
            h("span", { "data-testid": "mirror" }, formatNumberArray(value.value)),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const select = getByTestId<HTMLSelectElement>(mounted.container, "field");
      const setTwo = getByTestId<HTMLButtonElement>(mounted.container, "set-two");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");
      const one = select.options[0]!;
      const two = select.options[1]!;

      one.selected = true;
      two.selected = true;
      dispatchDomEvent(select, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "number:1,number:2",
        "number modifier should coerce selected option payloads into numbers",
      );

      setTwo.click();
      await flushDom();
      assertEqual(one.selected, false, "Programmatic numeric array updates should deselect one");
      assertEqual(two.selected, true, "Programmatic numeric array updates should select two");
      assertEqual(
        mirror.textContent,
        "number:2",
        "Mirror should expose numeric programmatic state",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
