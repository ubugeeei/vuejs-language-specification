import { defineComponent, h, ref, vModelText, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

export const vModelTextCompositionSessionCase: RuntimeCase = {
  id: "runtime.forms.v-model-text-composition-session",
  title: "Text v-model defers updates until composition ends",
  summary:
    "A text input bound through v-model must suppress input updates during an active composition session and commit the final value when composition ends.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with composition session"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref("");

        return () =>
          h("label", null, [
            withDirectives(
              h("input", {
                "data-testid": "field",
                "onUpdate:modelValue": ($event: string) => {
                  value.value = $event;
                },
              }),
              [[vModelText, value.value]],
            ),
            h("span", { "data-testid": "mirror" }, value.value),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      input.value = "使用拼音";
      dispatchDomEvent(input, "compositionstart");
      await flushDom();
      assertEqual(mirror.textContent, "", "Composition start must not commit the partial value");

      input.value = "使用拼音输入";
      dispatchDomEvent(input, "input");
      await flushDom();
      assertEqual(mirror.textContent, "", "Input during composition must not update the model");

      dispatchDomEvent(input, "compositionend");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "使用拼音输入",
        "Composition end must commit the final composed value",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
