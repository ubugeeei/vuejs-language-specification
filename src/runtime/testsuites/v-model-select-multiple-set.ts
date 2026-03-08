import { defineComponent, h, ref, vModelSelect, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

function formatSet(value: Set<string>): string {
  return [...value].sort().join(",");
}

export const vModelSelectMultipleSetTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-select-multiple-set",
  title: "Multiple-select Set models preserve selected membership",
  summary:
    "A multiple select bound to a Set model must emit Set payloads from selected options and re-apply programmatic Set replacement back to option selection state.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["multiple select (model is Set)"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref(new Set<string>());

        return () =>
          h("section", null, [
            withDirectives(
              h(
                "select",
                {
                  "data-testid": "field",
                  multiple: true,
                  "onUpdate:modelValue": ($event: Set<string>) => {
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
                "data-testid": "set-both",
                onClick: () => {
                  value.value = new Set(["foo", "bar"]);
                },
              },
              "set-both",
            ),
            h("span", { "data-testid": "mirror" }, formatSet(value.value)),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const select = getByTestId<HTMLSelectElement>(mounted.container, "field");
      const setBoth = getByTestId<HTMLButtonElement>(mounted.container, "set-both");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");
      const foo = select.options[0]!;
      const bar = select.options[1]!;

      foo.selected = true;
      bar.selected = false;
      dispatchDomEvent(select, "change");
      await flushDom();
      assertEqual(mirror.textContent, "foo", 'Selecting foo should emit Set{"foo"}');

      foo.selected = true;
      bar.selected = true;
      dispatchDomEvent(select, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "bar,foo",
        "Selecting both options should emit both Set members",
      );

      setBoth.click();
      await flushDom();
      assertEqual(foo.selected, true, "Programmatic Set updates should reselect foo");
      assertEqual(bar.selected, true, "Programmatic Set updates should reselect bar");
    } finally {
      mounted.cleanup();
    }
  },
};
