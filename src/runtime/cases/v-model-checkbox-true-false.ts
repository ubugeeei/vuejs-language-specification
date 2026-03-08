import { defineComponent, h, ref, vModelCheckbox, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

export const vModelCheckboxTrueFalseCase: RuntimeCase = {
  id: "runtime.forms.v-model-checkbox-true-false",
  title: "Checkbox v-model respects true-value and false-value payloads",
  summary:
    "A checkbox bound with true-value and false-value must initialize checked state from those payloads and emit the configured payloads on change.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with checkbox and true-value/false-value"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref("yes");

        return () =>
          h("label", null, [
            withDirectives(
              h("input", {
                "data-testid": "field",
                type: "checkbox",
                "true-value": "yes",
                "false-value": "no",
                "onUpdate:modelValue": ($event: string) => {
                  value.value = $event;
                },
              }),
              [[vModelCheckbox, value.value]],
            ),
            h("span", { "data-testid": "mirror" }, value.value),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      assertEqual(input.checked, true, "Checkbox should initialize from the configured true-value");
      assertEqual(mirror.textContent, "yes", "Mirror should expose the true-value payload");

      input.checked = false;
      dispatchDomEvent(input, "change");
      await flushDom();

      assertEqual(input.checked, false, "Checkbox should remain unchecked after false transition");
      assertEqual(mirror.textContent, "no", "Mirror should expose the configured false-value");

      input.checked = true;
      dispatchDomEvent(input, "change");
      await flushDom();

      assertEqual(
        input.checked,
        true,
        "Checkbox should become checked again after true transition",
      );
      assertEqual(mirror.textContent, "yes", "Mirror should return to the configured true-value");
    } finally {
      mounted.cleanup();
    }
  },
};
