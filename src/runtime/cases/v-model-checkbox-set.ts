import { defineComponent, h, ref, vModelCheckbox, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

function formatSet(value: Set<string>): string {
  return [...value].sort().join(",");
}

export const vModelCheckboxSetCase: RuntimeCase = {
  id: "runtime.forms.v-model-checkbox-set",
  title: "Checkbox v-model preserves Set membership semantics",
  summary:
    "Checkbox groups bound to a Set model must add and delete element values on change and reflect programmatic Set replacement in checked state.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should support Set as a checkbox model"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref(new Set<string>());

        return () =>
          h("section", null, [
            withDirectives(
              h("input", {
                "data-testid": "foo",
                type: "checkbox",
                value: "foo",
                "onUpdate:modelValue": ($event: Set<string>) => {
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
                "onUpdate:modelValue": ($event: Set<string>) => {
                  value.value = $event;
                },
              }),
              [[vModelCheckbox, value.value]],
            ),
            h(
              "button",
              {
                "data-testid": "set-foo",
                onClick: () => {
                  value.value = new Set(["foo"]);
                },
              },
              "set-foo",
            ),
            h("span", { "data-testid": "mirror" }, formatSet(value.value)),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const foo = getByTestId<HTMLInputElement>(mounted.container, "foo");
      const bar = getByTestId<HTMLInputElement>(mounted.container, "bar");
      const setFoo = getByTestId<HTMLButtonElement>(mounted.container, "set-foo");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      foo.checked = true;
      dispatchDomEvent(foo, "change");
      await flushDom();
      assertEqual(mirror.textContent, "foo", "Checking foo should add foo to the Set model");

      bar.checked = true;
      dispatchDomEvent(bar, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "bar,foo",
        "Checking bar should preserve existing Set members and add bar",
      );

      foo.checked = false;
      dispatchDomEvent(foo, "change");
      await flushDom();
      assertEqual(mirror.textContent, "bar", "Unchecking foo should delete foo from the Set");

      setFoo.click();
      await flushDom();
      assertEqual(foo.checked, true, "Programmatic Set replacement should check present values");
      assertEqual(bar.checked, false, "Programmatic Set replacement should uncheck missing values");
      assertEqual(mirror.textContent, "foo", "Mirror should expose the programmatic Set state");
    } finally {
      mounted.cleanup();
    }
  },
};
