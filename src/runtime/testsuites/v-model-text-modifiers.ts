import { defineComponent, h, ref, vModelText, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeTestSuite } from "../types.ts";

function describeObservedValue(value: number | string | null): string {
  if (value === null) {
    return "null";
  }

  return `${typeof value}:${value}`;
}

export const vModelTextModifiersTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-text-modifiers",
  title: "Text v-model applies trim, lazy, and number modifiers",
  summary:
    "Text inputs bound through v-model modifiers must trim whitespace, defer lazy updates to change, and coerce numeric payloads while preserving DOM normalization.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should support modifiers"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const numberValue = ref<number | string | null>(null);
        const trimValue = ref<number | string | null>(null);
        const trimLazyValue = ref<number | string | null>(null);
        const trimNumberValue = ref<number | string | null>(null);
        const lazyValue = ref<number | string | null>(null);

        return () =>
          h("section", null, [
            withDirectives(
              h("input", {
                "data-testid": "number",
                "onUpdate:modelValue": ($event: number | string | null) => {
                  numberValue.value = $event;
                },
              }),
              [[vModelText, numberValue.value, undefined, { number: true }]],
            ),
            withDirectives(
              h("input", {
                "data-testid": "trim",
                "onUpdate:modelValue": ($event: number | string | null) => {
                  trimValue.value = $event;
                },
              }),
              [[vModelText, trimValue.value, undefined, { trim: true }]],
            ),
            withDirectives(
              h("input", {
                "data-testid": "trim-lazy",
                "onUpdate:modelValue": ($event: number | string | null) => {
                  trimLazyValue.value = $event;
                },
              }),
              [[vModelText, trimLazyValue.value, undefined, { trim: true, lazy: true }]],
            ),
            withDirectives(
              h("input", {
                "data-testid": "trim-number",
                "onUpdate:modelValue": ($event: number | string | null) => {
                  trimNumberValue.value = $event;
                },
              }),
              [[vModelText, trimNumberValue.value, undefined, { trim: true, number: true }]],
            ),
            withDirectives(
              h("input", {
                "data-testid": "lazy",
                "onUpdate:modelValue": ($event: number | string | null) => {
                  lazyValue.value = $event;
                },
              }),
              [[vModelText, lazyValue.value, undefined, { lazy: true }]],
            ),
            h("span", { "data-testid": "number-mirror" }, describeObservedValue(numberValue.value)),
            h("span", { "data-testid": "trim-mirror" }, describeObservedValue(trimValue.value)),
            h(
              "span",
              { "data-testid": "trim-lazy-mirror" },
              describeObservedValue(trimLazyValue.value),
            ),
            h(
              "span",
              { "data-testid": "trim-number-mirror" },
              describeObservedValue(trimNumberValue.value),
            ),
            h("span", { "data-testid": "lazy-mirror" }, describeObservedValue(lazyValue.value)),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const number = getByTestId<HTMLInputElement>(mounted.container, "number");
      const trim = getByTestId<HTMLInputElement>(mounted.container, "trim");
      const trimLazy = getByTestId<HTMLInputElement>(mounted.container, "trim-lazy");
      const trimNumber = getByTestId<HTMLInputElement>(mounted.container, "trim-number");
      const lazy = getByTestId<HTMLInputElement>(mounted.container, "lazy");
      const numberMirror = getByTestId<HTMLElement>(mounted.container, "number-mirror");
      const trimMirror = getByTestId<HTMLElement>(mounted.container, "trim-mirror");
      const trimLazyMirror = getByTestId<HTMLElement>(mounted.container, "trim-lazy-mirror");
      const trimNumberMirror = getByTestId<HTMLElement>(mounted.container, "trim-number-mirror");
      const lazyMirror = getByTestId<HTMLElement>(mounted.container, "lazy-mirror");

      number.value = "+01.2";
      dispatchDomEvent(number, "input");
      await flushDom();
      assertEqual(numberMirror.textContent, "number:1.2", "number modifier should coerce input");

      dispatchDomEvent(number, "change");
      await flushDom();
      assertEqual(number.value, "1.2", "number modifier should normalize the DOM value on change");

      trim.value = "    hello, world    ";
      dispatchDomEvent(trim, "input");
      await flushDom();
      assertEqual(
        trimMirror.textContent,
        "string:hello, world",
        "trim should strip outer whitespace",
      );

      trimNumber.value = "    +01.2    ";
      dispatchDomEvent(trimNumber, "input");
      await flushDom();
      assertEqual(
        trimNumberMirror.textContent,
        "number:1.2",
        "trim+number should trim first and then coerce to a number",
      );

      trimLazy.value = "   ddd    ";
      dispatchDomEvent(trimLazy, "change");
      await flushDom();
      assertEqual(
        trimLazyMirror.textContent,
        "string:ddd",
        "trim+lazy should apply trimming on change instead of input",
      );

      lazy.value = "foo";
      dispatchDomEvent(lazy, "change");
      await flushDom();
      assertEqual(lazyMirror.textContent, "string:foo", "lazy should commit on change events");
    } finally {
      mounted.cleanup();
    }
  },
};
