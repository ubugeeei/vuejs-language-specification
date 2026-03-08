import { defineComponent, h, ref, vModelText, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

function describeObservedValue(value: number): string {
  return `${typeof value}:${value}`;
}

export const vModelNumberRenderingTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-number-rendering",
  title: "Number inputs preserve in-progress rendered text while syncing numeric state",
  summary:
    "A number input bound through v-model must preserve the raw in-progress DOM string when the numeric model has already converged to the same numeric value.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with number input and be able to update rendering correctly"],
      issues: ["#7003"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value1 = ref(1.002);
        const value2 = ref(1.002);

        return () =>
          h("section", null, [
            withDirectives(
              h("input", {
                "data-testid": "field-1",
                type: "number",
                "onUpdate:modelValue": ($event: number) => {
                  value1.value = $event;
                },
              }),
              [[vModelText, value1.value]],
            ),
            withDirectives(
              h("input", {
                "data-testid": "field-2",
                type: "number",
                "onUpdate:modelValue": ($event: number) => {
                  value2.value = $event;
                },
              }),
              [[vModelText, value2.value]],
            ),
            h("span", { "data-testid": "mirror-1" }, describeObservedValue(value1.value)),
            h("span", { "data-testid": "mirror-2" }, describeObservedValue(value2.value)),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const input1 = getByTestId<HTMLInputElement>(mounted.container, "field-1");
      const input2 = getByTestId<HTMLInputElement>(mounted.container, "field-2");
      const mirror1 = getByTestId<HTMLElement>(mounted.container, "mirror-1");
      const mirror2 = getByTestId<HTMLElement>(mounted.container, "mirror-2");

      assertEqual(input1.value, "1.002", "First number input should render the initial value");
      assertEqual(input2.value, "1.002", "Second number input should render the initial value");

      input1.value = "1.00";
      dispatchDomEvent(input1, "input");
      await flushDom();
      assertEqual(mirror1.textContent, "number:1", "First numeric model should converge to 1");

      input2.value = "1.00";
      dispatchDomEvent(input2, "input");
      await flushDom();
      assertEqual(mirror2.textContent, "number:1", "Second numeric model should converge to 1");

      assertEqual(
        input1.value,
        "1.00",
        "The active rendered number string should be preserved when it represents the synced numeric value",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
