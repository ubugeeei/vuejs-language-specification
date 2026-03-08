import { defineComponent, h, ref } from "vue";
import { assertEqual } from "../assert.ts";
import { flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

export const vModelComponentTrimSemanticsTestSuite: RuntimeTestSuite = {
  id: "runtime.components.v-model-component-trim-semantics",
  title: "Component v-model.trim applies to default, named, and case-variant model channels",
  summary:
    "Component update listeners guarded by trim modifiers must trim the first emitted string payload across default channels, named channels, kebab/camel remapping, and mixed-case model names.",
  environment: "browser",
  features: ["runtime.components", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/componentEmits.spec.ts",
      cases: [
        ".trim modifier should work with v-model on component",
        ".trim modifier should work with v-model on component for kebab-cased props and camelCased emit",
        ".trim modifier should work with v-model on component for camelCased props and kebab-cased emit",
        ".trim modifier should work with v-model on component for mixed cased props and emit",
      ],
    },
  ],
  async run() {
    const BasicTrimChild = defineComponent({
      emits: ["update:modelValue", "update:foo"],
      created() {
        this.$emit("update:modelValue", " one ");
        this.$emit("update:foo", "  two  ");
      },
      render() {
        return h("div");
      },
    });

    const KebabCamelChild = defineComponent({
      emits: ["update:firstName"],
      created() {
        this.$emit("update:firstName", " one ");
      },
      render() {
        return h("div");
      },
    });

    const CamelKebabChild = defineComponent({
      emits: ["update:model-value", "update:first-name"],
      created() {
        this.$emit("update:model-value", " one ");
        this.$emit("update:first-name", " two ");
      },
      render() {
        return h("div");
      },
    });

    const MixedCaseChild = defineComponent({
      emits: ["update:base-URL"],
      created() {
        this.$emit("update:base-URL", " one ");
      },
      render() {
        return h("div");
      },
    });

    const App = defineComponent({
      setup() {
        const basicModel = ref("");
        const basicFoo = ref("");
        const kebabCamel = ref("");
        const camelKebabModel = ref("");
        const camelKebabNamed = ref("");
        const mixed = ref("");

        return () =>
          h("section", null, [
            h(BasicTrimChild, {
              modelValue: null,
              modelModifiers: { trim: true },
              "onUpdate:modelValue": ($event: string) => {
                basicModel.value = $event;
              },
              foo: null,
              fooModifiers: { trim: true },
              "onUpdate:foo": ($event: string) => {
                basicFoo.value = $event;
              },
            }),
            h(KebabCamelChild, {
              "first-name": null,
              "first-nameModifiers": { trim: true },
              "onUpdate:first-name": ($event: string) => {
                kebabCamel.value = $event;
              },
            }),
            h(CamelKebabChild, {
              modelValue: null,
              modelModifiers: { trim: true },
              "onUpdate:modelValue": ($event: string) => {
                camelKebabModel.value = $event;
              },
              firstName: null,
              firstNameModifiers: { trim: true },
              "onUpdate:firstName": ($event: string) => {
                camelKebabNamed.value = $event;
              },
            }),
            h(MixedCaseChild, {
              "base-URL": null,
              "base-URLModifiers": { trim: true },
              "onUpdate:base-URL": ($event: string) => {
                mixed.value = $event;
              },
            }),
            h("span", { "data-testid": "basic-model" }, basicModel.value),
            h("span", { "data-testid": "basic-foo" }, basicFoo.value),
            h("span", { "data-testid": "kebab-camel" }, kebabCamel.value),
            h("span", { "data-testid": "camel-kebab-model" }, camelKebabModel.value),
            h("span", { "data-testid": "camel-kebab-named" }, camelKebabNamed.value),
            h("span", { "data-testid": "mixed" }, mixed.value),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      await flushDom();

      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "basic-model").textContent,
        "one",
        "trim should strip surrounding whitespace from the default model channel",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "basic-foo").textContent,
        "two",
        "trim should strip surrounding whitespace from named model channels",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "kebab-camel").textContent,
        "one",
        "trim should resolve kebab-cased modifier props with camel-cased emits",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "camel-kebab-model").textContent,
        "one",
        "trim should resolve camel-cased modifier props with kebab-cased default-model emits",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "camel-kebab-named").textContent,
        "two",
        "trim should resolve camel-cased modifier props with kebab-cased named-model emits",
      );
      assertEqual(
        getByTestId<HTMLElement>(mounted.container, "mixed").textContent,
        "one",
        "trim should preserve mixed-case model channels while trimming payloads",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
