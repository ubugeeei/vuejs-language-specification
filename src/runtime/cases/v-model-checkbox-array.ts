import { defineComponent, h, ref, vModelCheckbox, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

export const vModelCheckboxArrayCase: RuntimeCase = {
  id: "runtime.forms.v-model-checkbox-array",
  title: "Checkbox v-model preserves array membership semantics",
  summary:
    "Checkbox groups bound to an array model must add and remove element values on change and reflect subsequent programmatic array updates in checked state.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should support array as a checkbox model"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref<string[]>([]);

        return () =>
          h("section", null, [
            withDirectives(
              h("input", {
                "data-testid": "foo",
                type: "checkbox",
                value: "foo",
                "onUpdate:modelValue": ($event: string[]) => {
                  value.value = $event;
                },
              }),
              [[vModelCheckbox, value.value]],
            ),
            withDirectives(
              h("input", {
                "data-testid": "bar",
                type: "checkbox",
                value: "bar",
                "onUpdate:modelValue": ($event: string[]) => {
                  value.value = $event;
                },
              }),
              [[vModelCheckbox, value.value]],
            ),
            h(
              "button",
              {
                "data-testid": "set-bar",
                onClick: () => {
                  value.value = ["bar"];
                },
              },
              "set-bar",
            ),
            h("span", { "data-testid": "mirror" }, value.value.join(",")),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const foo = getByTestId<HTMLInputElement>(mounted.container, "foo");
      const bar = getByTestId<HTMLInputElement>(mounted.container, "bar");
      const setBar = getByTestId<HTMLButtonElement>(mounted.container, "set-bar");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      foo.checked = true;
      dispatchDomEvent(foo, "change");
      await flushDom();
      assertEqual(mirror.textContent, "foo", "Checking foo should append foo to the array model");

      bar.checked = true;
      dispatchDomEvent(bar, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "foo,bar",
        "Checking bar should preserve foo and append bar to the array model",
      );

      bar.checked = false;
      dispatchDomEvent(bar, "change");
      await flushDom();
      assertEqual(mirror.textContent, "foo", "Unchecking bar should remove only bar");

      setBar.click();
      await flushDom();
      assertEqual(foo.checked, false, "Programmatic array updates should uncheck removed values");
      assertEqual(bar.checked, true, "Programmatic array updates should check retained values");
      assertEqual(mirror.textContent, "bar", "Mirror should expose the programmatic array state");
    } finally {
      mounted.cleanup();
    }
  },
};
