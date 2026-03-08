import { defineComponent, h, ref, vModelSelect, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

export const vModelSelectMultipleNumberModelCase: RuntimeCase = {
  id: "runtime.forms.v-model-select-multiple-number-model",
  title: "Multiple-select matches numeric model values against string option values",
  summary:
    "A multiple select bound to a numeric array model must restore selection for string-valued options using Vue's loose equality semantics.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["multiple select (model is number, option value is string)"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref([1, 2]);

        return () =>
          h(
            "section",
            null,
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
              [[vModelSelect, value.value]],
            ),
          );
      },
    });

    const mounted = mount(App);

    try {
      const select = getByTestId<HTMLSelectElement>(mounted.container, "field");
      const foo = select.options[0]!;
      const bar = select.options[1]!;

      await flushDom();
      assertEqual(foo.selected, true, 'Loose-equal numeric models should select option value "1"');
      assertEqual(bar.selected, true, 'Loose-equal numeric models should select option value "2"');
    } finally {
      mounted.cleanup();
    }
  },
};
