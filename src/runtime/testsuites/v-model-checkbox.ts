import { defineComponent, h, ref, vModelCheckbox, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

export const vModelCheckboxTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-checkbox",
  title: "Checkbox v-model synchronizes checked state and reactive state",
  summary:
    "A checkbox bound with v-model updates both the DOM checked state and the rendered mirror after the change event.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with checkbox"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const checked = ref(false);
        return () =>
          h("label", null, [
            withDirectives(
              h("input", {
                "data-testid": "field",
                type: "checkbox",
                "onUpdate:modelValue": ($event: boolean) => {
                  checked.value = $event;
                },
              }),
              [[vModelCheckbox, checked.value]],
            ),
            h("span", { "data-testid": "mirror" }, checked.value ? "yes" : "no"),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      assertEqual(input.checked, false, "Checkbox should start unchecked");
      assertEqual(mirror.textContent, "no", "Mirror should reflect the unchecked state");

      input.checked = true;
      dispatchDomEvent(input, "change");
      await flushDom();

      assertEqual(input.checked, true, "Checkbox should remain checked after the change event");
      assertEqual(mirror.textContent, "yes", "Mirror should reflect the checked state");
    } finally {
      mounted.cleanup();
    }
  },
};
