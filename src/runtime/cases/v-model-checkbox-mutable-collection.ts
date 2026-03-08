import { defineComponent, h, ref, vModelCheckbox, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

function formatValue(value: string[] | Set<string>): string {
  return Array.isArray(value) ? value.join(",") : [...value].sort().join(",");
}

export const vModelCheckboxMutableCollectionCase: RuntimeCase = {
  id: "runtime.forms.v-model-checkbox-mutable-collection",
  title: "Checkbox v-model reacts to in-place array and Set mutation",
  summary:
    "A checkbox bound to array or Set models must react to in-place collection mutation, not only to full value replacement.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should support mutating an array or set value for a checkbox"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref<string[] | Set<string>>([]);

        return () =>
          h("section", null, [
            withDirectives(
              h("input", {
                "data-testid": "field",
                type: "checkbox",
                value: "foo",
                "onUpdate:modelValue": ($event: string[] | Set<string>) => {
                  value.value = $event;
                },
              }),
              [[vModelCheckbox, value.value]],
            ),
            h(
              "button",
              {
                "data-testid": "push-foo",
                onClick: () => {
                  if (Array.isArray(value.value)) {
                    value.value.push("foo");
                  }
                },
              },
              "push-foo",
            ),
            h(
              "button",
              {
                "data-testid": "replace-bar",
                onClick: () => {
                  if (Array.isArray(value.value)) {
                    value.value[0] = "bar";
                  }
                },
              },
              "replace-bar",
            ),
            h(
              "button",
              {
                "data-testid": "switch-set",
                onClick: () => {
                  value.value = new Set();
                },
              },
              "switch-set",
            ),
            h(
              "button",
              {
                "data-testid": "add-foo",
                onClick: () => {
                  if (value.value instanceof Set) {
                    value.value.add("foo");
                  }
                },
              },
              "add-foo",
            ),
            h(
              "button",
              {
                "data-testid": "delete-foo",
                onClick: () => {
                  if (value.value instanceof Set) {
                    value.value.delete("foo");
                  }
                },
              },
              "delete-foo",
            ),
            h("span", { "data-testid": "mirror" }, formatValue(value.value)),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const pushFoo = getByTestId<HTMLButtonElement>(mounted.container, "push-foo");
      const replaceBar = getByTestId<HTMLButtonElement>(mounted.container, "replace-bar");
      const switchSet = getByTestId<HTMLButtonElement>(mounted.container, "switch-set");
      const addFoo = getByTestId<HTMLButtonElement>(mounted.container, "add-foo");
      const deleteFoo = getByTestId<HTMLButtonElement>(mounted.container, "delete-foo");

      assertEqual(input.checked, false, "Checkbox should start unchecked for an empty array");

      pushFoo.click();
      await flushDom();
      assertEqual(input.checked, true, "Pushing into the array in place should check the box");

      replaceBar.click();
      await flushDom();
      assertEqual(
        input.checked,
        false,
        "Replacing the array member in place should uncheck the box",
      );

      switchSet.click();
      await flushDom();
      assertEqual(input.checked, false, "Switching to an empty Set should keep the box unchecked");

      addFoo.click();
      await flushDom();
      assertEqual(input.checked, true, "Adding to the Set in place should check the box");

      deleteFoo.click();
      await flushDom();
      assertEqual(input.checked, false, "Deleting from the Set in place should uncheck the box");
    } finally {
      mounted.cleanup();
    }
  },
};
