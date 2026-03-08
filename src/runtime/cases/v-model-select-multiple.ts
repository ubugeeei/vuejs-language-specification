import { defineComponent, h, ref, vModelSelect, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

export const vModelSelectMultipleCase: RuntimeCase = {
  id: "runtime.forms.v-model-select-multiple",
  title: "Multiple-select v-model preserves ordered array selection",
  summary:
    "A multiple select bound through v-model must emit an array of selected values and re-apply programmatic array updates back to option selection state.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["multiple select (model is Array)"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref<string[]>([]);

        return () =>
          h("section", null, [
            withDirectives(
              h(
                "select",
                {
                  "data-testid": "field",
                  multiple: true,
                  "onUpdate:modelValue": ($event: string[]) => {
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
                  value.value = ["foo", "bar"];
                },
              },
              "set-both",
            ),
            h("span", { "data-testid": "mirror" }, value.value.join(",")),
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
      assertEqual(mirror.textContent, "foo", "Single selection should emit a singleton array");

      foo.selected = true;
      bar.selected = true;
      dispatchDomEvent(select, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "foo,bar",
        "Selecting both options should preserve the ordered selected array",
      );

      setBoth.click();
      await flushDom();
      assertEqual(foo.selected, true, "Programmatic array updates should reselect foo");
      assertEqual(bar.selected, true, "Programmatic array updates should reselect bar");
      assertEqual(mirror.textContent, "foo,bar", "Mirror should expose the programmatic selection");
    } finally {
      mounted.cleanup();
    }
  },
};
