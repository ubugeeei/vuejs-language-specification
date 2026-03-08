import { defineComponent, h, ref, vModelRadio, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

export const vModelRadioCase: RuntimeCase = {
  id: "runtime.forms.v-model-radio",
  title: "Radio v-model preserves single-choice synchronization",
  summary:
    "A radio group bound through v-model must expose exactly one checked input and update the bound model when the checked option changes.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with radio"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref("foo");

        return () =>
          h("fieldset", null, [
            withDirectives(
              h("input", {
                "data-testid": "foo",
                type: "radio",
                value: "foo",
                "onUpdate:modelValue": ($event: string) => {
                  value.value = $event;
                },
              }),
              [[vModelRadio, value.value]],
            ),
            withDirectives(
              h("input", {
                "data-testid": "bar",
                type: "radio",
                value: "bar",
                "onUpdate:modelValue": ($event: string) => {
                  value.value = $event;
                },
              }),
              [[vModelRadio, value.value]],
            ),
            h("span", { "data-testid": "mirror" }, value.value),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const foo = getByTestId<HTMLInputElement>(mounted.container, "foo");
      const bar = getByTestId<HTMLInputElement>(mounted.container, "bar");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      assertEqual(foo.checked, true, "Initial radio selection should match the bound model");
      assertEqual(bar.checked, false, "Unselected radio should start unchecked");
      assertEqual(mirror.textContent, "foo", "Mirror should expose the initial model value");

      bar.checked = true;
      dispatchDomEvent(bar, "change");
      await flushDom();

      assertEqual(foo.checked, false, "Changing the selection should uncheck the previous radio");
      assertEqual(bar.checked, true, "Changing the selection should check the new radio");
      assertEqual(mirror.textContent, "bar", "Mirror should reflect the new radio value");
    } finally {
      mounted.cleanup();
    }
  },
};
