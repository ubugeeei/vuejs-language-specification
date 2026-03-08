import { defineComponent, h, ref, vModelSelect, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

const FOO_VALUE = { foo: 1 };
const BAR_VALUE = { bar: 1 };

function formatSet(value: Set<Record<string, number>>): string {
  return JSON.stringify([...value]);
}

export const vModelSelectMultipleSetObjectTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-select-multiple-set-object",
  title: "Multiple-select Set object models require reference equality on programmatic updates",
  summary:
    "A multiple select bound to a Set of object payloads must emit the original option object references, but fresh object literals in a replacement Set must not reselect options.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["multiple select (model is Set, option value is object)"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref(new Set<Record<string, number>>());

        return () =>
          h("section", null, [
            withDirectives(
              h(
                "select",
                {
                  "data-testid": "field",
                  multiple: true,
                  "onUpdate:modelValue": ($event: Set<Record<string, number>>) => {
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
                "data-testid": "set-same",
                onClick: () => {
                  value.value = new Set([FOO_VALUE, BAR_VALUE]);
                },
              },
              "set-same",
            ),
            h(
              "button",
              {
                "data-testid": "set-fresh",
                onClick: () => {
                  value.value = new Set([{ foo: 1 }, { bar: 1 }]);
                },
              },
              "set-fresh",
            ),
            h("span", { "data-testid": "mirror" }, formatSet(value.value)),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const select = getByTestId<HTMLSelectElement>(mounted.container, "field");
      const setSame = getByTestId<HTMLButtonElement>(mounted.container, "set-same");
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
        "Selecting both object-valued options should emit the original object references",
      );

      setSame.click();
      await flushDom();
      assertEqual(foo.selected, true, "Reference-identical Set updates should reselect foo");
      assertEqual(bar.selected, true, "Reference-identical Set updates should reselect bar");

      foo.selected = false;
      bar.selected = false;
      dispatchDomEvent(select, "change");
      await flushDom();

      setFresh.click();
      await flushDom();
      assertEqual(
        foo.selected,
        false,
        "Fresh object Set updates must not reselect foo because Set matching is reference-based",
      );
      assertEqual(
        bar.selected,
        false,
        "Fresh object Set updates must not reselect bar because Set matching is reference-based",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
