import { defineComponent, h, ref, vModelSelect, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

const FOO_VALUE = { foo: 1 };
const BAR_VALUE = { bar: 1 };

function formatArray(value: Array<Record<string, number>>): string {
  return JSON.stringify(value);
}

export const vModelSelectMultipleObjectArrayCase: RuntimeCase = {
  id: "runtime.forms.v-model-select-multiple-object-array",
  title: "Multiple-select array models use loose-equal matching for object option values",
  summary:
    "A multiple select bound to an array model must emit option object payloads and restore selection for programmatic arrays that are only loose-equal to the original option values.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["multiple select (model is Array, option value is object)"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref<Array<Record<string, number>>>([]);

        return () =>
          h("section", null, [
            withDirectives(
              h(
                "select",
                {
                  "data-testid": "field",
                  multiple: true,
                  "onUpdate:modelValue": ($event: Array<Record<string, number>>) => {
                    value.value = $event;
                  },
                },
                [
                  h("option", { value: FOO_VALUE }, "Foo"),
                  h("option", { value: BAR_VALUE }, "Bar"),
                ],
              ),
              [[vModelSelect, value.value]],
            ),
            h(
              "button",
              {
                "data-testid": "set-fresh",
                onClick: () => {
                  value.value = [{ foo: 1 }, { bar: 1 }];
                },
              },
              "set-fresh",
            ),
            h("span", { "data-testid": "mirror" }, formatArray(value.value)),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const select = getByTestId<HTMLSelectElement>(mounted.container, "field");
      const setFresh = getByTestId<HTMLButtonElement>(mounted.container, "set-fresh");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");
      const foo = select.options[0]!;
      const bar = select.options[1]!;

      foo.selected = true;
      bar.selected = true;
      dispatchDomEvent(select, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        '[{"foo":1},{"bar":1}]',
        "Selecting both object-valued options should emit the original object payloads",
      );

      foo.selected = false;
      bar.selected = false;
      dispatchDomEvent(select, "change");
      await flushDom();
      assertEqual(mirror.textContent, "[]", "Clearing selection should empty the array model");

      setFresh.click();
      await flushDom();
      assertEqual(
        foo.selected,
        true,
        "Loose-equal object array updates should reselect the first option",
      );
      assertEqual(
        bar.selected,
        true,
        "Loose-equal object array updates should reselect the second option",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
