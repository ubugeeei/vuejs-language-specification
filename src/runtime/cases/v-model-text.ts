import { defineComponent, h, ref, vModelText, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

export const vModelTextCase: RuntimeCase = {
  id: "runtime.dom.v-model-text",
  title: "Text input v-model keeps DOM value and reactive mirror in sync",
  summary:
    "Typing into a text input updates component state and the mirrored text content after the input event.",
  environment: "browser",
  features: ["runtime.v-model", "runtime.forms"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with text input"],
      issues: ["#1931"],
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

      input.value = "hello";
      dispatchDomEvent(input, "input");
      await flushDom();

      assertEqual(input.value, "hello", "Input value should reflect the user edit");
      assertEqual(mirror.textContent, "hello", "Mirrored text should track the input value");
    } finally {
      mounted.cleanup();
    }
  },
};
