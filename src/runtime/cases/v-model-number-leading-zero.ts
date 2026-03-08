import { defineComponent, h, ref, vModelText, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

export const vModelNumberLeadingZeroCase: RuntimeCase = {
  id: "runtime.forms.v-model-number-leading-zero",
  title: "Number inputs normalize leading-zero values through v-model",
  summary:
    "A number input bound through v-model must treat equal values with a leading zero as a meaningful update and normalize the DOM value after state sync.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["equal value with a leading 0 should trigger update."],
      issues: ["#10503"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref(0);

        return () =>
          h("label", null, [
            withDirectives(
              h("input", {
                "data-testid": "field",
                type: "number",
                "onUpdate:modelValue": ($event: number) => {
                  value.value = $event;
                },
              }),
              [[vModelText, value.value]],
            ),
            h("span", { "data-testid": "mirror" }, String(value.value)),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      assertEqual(input.value, "0", "Number input should initialize from numeric model state");

      input.value = "01";
      dispatchDomEvent(input, "input");
      await flushDom();

      assertEqual(
        mirror.textContent,
        "1",
        "Leading-zero input should still update the numeric model",
      );
      assertEqual(
        input.value,
        "1",
        "DOM value should normalize after numeric state synchronization",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
