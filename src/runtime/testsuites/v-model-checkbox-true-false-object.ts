import { defineComponent, h, ref, vModelCheckbox, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

const TRUE_VALUE = { yes: "yes" };
const FALSE_VALUE = { no: "no" };

function formatObject(value: unknown): string {
  return JSON.stringify(value);
}

export const vModelCheckboxTrueFalseObjectTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-checkbox-true-false-object",
  title: "Checkbox v-model preserves object true-value and false-value payloads",
  summary:
    "A checkbox using object true-value and false-value payloads must emit those exact payload shapes and update checked state from programmatic model replacement.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with checkbox and true-value/false-value with object values"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref<unknown>(null);

        return () =>
          h("label", null, [
            withDirectives(
              h("input", {
                "data-testid": "field",
                type: "checkbox",
                "true-value": TRUE_VALUE,
                "false-value": FALSE_VALUE,
                "onUpdate:modelValue": ($event: unknown) => {
                  value.value = $event;
                },
              }),
              [[vModelCheckbox, value.value]],
            ),
            h(
              "button",
              {
                "data-testid": "set-false",
                onClick: () => {
                  value.value = { no: "no" };
                },
              },
              "set-false",
            ),
            h(
              "button",
              {
                "data-testid": "set-true",
                onClick: () => {
                  value.value = { yes: "yes" };
                },
              },
              "set-true",
            ),
            h("span", { "data-testid": "mirror" }, formatObject(value.value)),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const setFalse = getByTestId<HTMLButtonElement>(mounted.container, "set-false");
      const setTrue = getByTestId<HTMLButtonElement>(mounted.container, "set-true");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      input.checked = true;
      dispatchDomEvent(input, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        '{"yes":"yes"}',
        "Checking the box should emit the configured object true-value",
      );

      setFalse.click();
      await flushDom();
      assertEqual(input.checked, false, "Loose-equal false object should clear checked state");

      setTrue.click();
      await flushDom();
      assertEqual(input.checked, true, "Loose-equal true object should restore checked state");
    } finally {
      mounted.cleanup();
    }
  },
};
