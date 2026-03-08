import { defineComponent, h, ref } from "vue";
import { assertEqual } from "../assert.ts";
import { flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

function describeObservedValue(value: number | null): string {
  return value === null ? "null" : `${typeof value}:${value}`;
}

export const vModelComponentTrimNumberTestSuite: RuntimeTestSuite = {
  id: "runtime.components.v-model-component-trim-number",
  title: "Component v-model trim+number modifiers compose on the first payload",
  summary:
    "When both trim and number modifiers are enabled for a component model channel, the runtime must trim the first payload string and then coerce it to a number for both default and named channels.",
  environment: "browser",
  features: ["runtime.components", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/componentEmits.spec.ts",
      cases: [".trim and .number modifiers should work with v-model on component"],
    },
  ],
  async run() {
    const Child = defineComponent({
      emits: ["update:modelValue", "update:foo"],
      created() {
        this.$emit("update:modelValue", "    +01.2    ");
        this.$emit("update:foo", "    1    ");
      },
      render() {
        return h("div");
      },
    });

    const App = defineComponent({
      setup() {
        const modelValue = ref<number | null>(null);
        const fooValue = ref<number | null>(null);

        return () =>
          h("section", null, [
            h(Child, {
              modelValue: null,
              modelModifiers: { trim: true, number: true },
              "onUpdate:modelValue": ($event: number) => {
                modelValue.value = $event;
              },
              foo: null,
              fooModifiers: { trim: true, number: true },
              "onUpdate:foo": ($event: number) => {
                fooValue.value = $event;
              },
            }),
            h("span", { "data-testid": "model-mirror" }, describeObservedValue(modelValue.value)),
            h("span", { "data-testid": "foo-mirror" }, describeObservedValue(fooValue.value)),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      await flushDom();

      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "model-mirror").textContent,
        "number:1.2",
        "trim+number should normalize and coerce the default model payload",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "foo-mirror").textContent,
        "number:1",
        "trim+number should normalize and coerce the named model payload",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
