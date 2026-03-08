import { defineComponent, h, ref } from "vue";
import { assertEqual } from "../assert.ts";
import { flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

function describeObservedValue(value: number | null): string {
  return value === null ? "null" : `${typeof value}:${value}`;
}

export const vModelComponentNumberTestSuite: RuntimeTestSuite = {
  id: "runtime.components.v-model-component-number",
  title: "Component v-model.number modifiers coerce main and named model payloads",
  summary:
    "Component update listeners guarded by modelModifiers and <arg>Modifiers with number = true must coerce the first emitted payload to numbers for both the default and named model channels.",
  environment: "browser",
  features: ["runtime.components", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/componentEmits.spec.ts",
      cases: [".number modifier should work with v-model on component"],
    },
  ],
  async run() {
    const Child = defineComponent({
      emits: ["update:modelValue", "update:foo"],
      created() {
        this.$emit("update:modelValue", "1");
        this.$emit("update:foo", "2");
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
              modelModifiers: { number: true },
              "onUpdate:modelValue": ($event: number) => {
                modelValue.value = $event;
              },
              foo: null,
              fooModifiers: { number: true },
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
        "number:1",
        "modelModifiers.number should coerce the default model payload",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "foo-mirror").textContent,
        "number:2",
        "fooModifiers.number should coerce the named model payload",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
