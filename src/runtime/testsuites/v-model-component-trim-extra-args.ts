import { defineComponent, h, ref } from "vue";
import { assertEqual } from "../assert.ts";
import { flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

export const vModelComponentTrimExtraArgsTestSuite: RuntimeTestSuite = {
  id: "runtime.components.v-model-component-trim-extra-args",
  title: "Component v-model.trim only normalizes the first emitted argument",
  summary:
    "The trim modifier on component v-model listeners must trim only the first emitted argument and preserve trailing emitted arguments verbatim.",
  environment: "browser",
  features: ["runtime.components", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/componentEmits.spec.ts",
      cases: ["only trim string parameter when work with v-model on component"],
    },
  ],
  async run() {
    const Child = defineComponent({
      emits: ["update:modelValue"],
      created() {
        this.$emit("update:modelValue", " foo ", { bar: " bar " });
      },
      render() {
        return h("div");
      },
    });

    const App = defineComponent({
      setup() {
        const modelValue = ref("");
        const trailingPayload = ref("");

        return () =>
          h("section", null, [
            h(Child, {
              modelValue: null,
              modelModifiers: { trim: true },
              "onUpdate:modelValue": (...args: [string, { bar: string }]) => {
                const [value, meta] = args;
                modelValue.value = value;
                trailingPayload.value = JSON.stringify(meta);
              },
            }),
            h("span", { "data-testid": "value-mirror" }, modelValue.value),
            h("span", { "data-testid": "meta-mirror" }, trailingPayload.value),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      await flushDom();

      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "value-mirror").textContent,
        "foo",
        "trim should normalize only the first emitted string argument",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "meta-mirror").textContent,
        '{"bar":" bar "}',
        "trim should preserve trailing emitted arguments verbatim",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
