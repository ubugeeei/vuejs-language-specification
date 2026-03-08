import { defineComponent, h, ref, vModelText, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

export const vModelTextareaTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-textarea",
  title: "Textarea v-model keeps DOM and state synchronized",
  summary:
    "A textarea bound through v-model must update component state on input and reflect subsequent programmatic state updates in the DOM value.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with textarea"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref<string | null>(null);

        return () =>
          h("section", null, [
            withDirectives(
              h("textarea", {
                "data-testid": "field",
                "onUpdate:modelValue": ($event: string | null) => {
                  value.value = $event;
                },
              }),
              [[vModelText, value.value]],
            ),
            h("button", {
              "data-testid": "set-bar",
              onClick: () => {
                value.value = "bar";
              },
            }),
            h("span", { "data-testid": "mirror" }, value.value ?? "null"),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const textarea = getByTestId<HTMLTextAreaElement>(mounted.container, "field");
      const setBar = getByTestId<HTMLButtonElement>(mounted.container, "set-bar");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      textarea.value = "foo";
      dispatchDomEvent(textarea, "input");
      await flushDom();
      assertEqual(mirror.textContent, "foo", "Textarea input should update the bound model");

      setBar.click();
      await flushDom();
      assertEqual(textarea.value, "bar", "Programmatic model updates should rewrite textarea DOM");
      assertEqual(
        mirror.textContent,
        "bar",
        "Mirror should expose the programmatic textarea state",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
