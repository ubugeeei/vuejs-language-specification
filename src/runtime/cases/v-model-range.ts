import { defineComponent, h, ref, vModelText, withDirectives } from "vue";
import { assertEqual } from "../assert.ts";
import { dispatchDomEvent, flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

function describeObservedValue(value: number | string): string {
  return `${typeof value}:${value}`;
}

export const vModelRangeCase: RuntimeCase = {
  id: "runtime.forms.v-model-range",
  title: "Range inputs apply number, lazy, and clamping semantics",
  summary:
    "Range inputs bound through v-model must clamp to min/max boundaries and apply number and lazy modifier semantics to the bound model.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should work with range"],
    },
  ],
  async run() {
    const App = defineComponent({
      setup() {
        const value = ref<number | string>(25);

        return () =>
          h("section", null, [
            withDirectives(
              h("input", {
                "data-testid": "number-range",
                type: "range",
                min: 1,
                max: 100,
                "onUpdate:modelValue": ($event: number | string) => {
                  value.value = $event;
                },
              }),
              [[vModelText, value.value, undefined, { number: true }]],
            ),
            withDirectives(
              h("input", {
                "data-testid": "lazy-range",
                type: "range",
                min: 1,
                max: 100,
                "onUpdate:modelValue": ($event: number | string) => {
                  value.value = $event;
                },
              }),
              [[vModelText, value.value, undefined, { lazy: true }]],
            ),
            h("button", {
              "data-testid": "set-60",
              onClick: () => {
                value.value = 60;
              },
            }),
            h("button", {
              "data-testid": "set-neg-1",
              onClick: () => {
                value.value = -1;
              },
            }),
            h("button", {
              "data-testid": "set-200",
              onClick: () => {
                value.value = 200;
              },
            }),
            h("span", { "data-testid": "mirror" }, describeObservedValue(value.value)),
          ]);
      },
    });

    const mounted = mount(App);

    try {
      const numberRange = getByTestId<HTMLInputElement>(mounted.container, "number-range");
      const lazyRange = getByTestId<HTMLInputElement>(mounted.container, "lazy-range");
      const set60 = getByTestId<HTMLButtonElement>(mounted.container, "set-60");
      const setNeg1 = getByTestId<HTMLButtonElement>(mounted.container, "set-neg-1");
      const set200 = getByTestId<HTMLButtonElement>(mounted.container, "set-200");
      const mirror = getByTestId<HTMLElement>(mounted.container, "mirror");

      numberRange.value = "20";
      dispatchDomEvent(numberRange, "input");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "number:20",
        "number modifier should emit numeric range values",
      );

      numberRange.value = "200";
      dispatchDomEvent(numberRange, "input");
      await flushDom();
      assertEqual(mirror.textContent, "number:100", "Range values above max should clamp to max");

      numberRange.value = "-1";
      dispatchDomEvent(numberRange, "input");
      await flushDom();
      assertEqual(mirror.textContent, "number:1", "Range values below min should clamp to min");

      lazyRange.value = "30";
      dispatchDomEvent(lazyRange, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "string:30",
        "lazy modifier should commit range values on change",
      );

      lazyRange.value = "200";
      dispatchDomEvent(lazyRange, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "string:100",
        "Lazy range updates should still clamp values above max",
      );

      lazyRange.value = "-1";
      dispatchDomEvent(lazyRange, "change");
      await flushDom();
      assertEqual(
        mirror.textContent,
        "string:1",
        "Lazy range updates should still clamp values below min",
      );

      set60.click();
      await flushDom();
      assertEqual(
        numberRange.value,
        "60",
        "Programmatic numeric updates should sync number-modified range",
      );
      assertEqual(lazyRange.value, "60", "Programmatic numeric updates should sync lazy range");

      setNeg1.click();
      await flushDom();
      assertEqual(numberRange.value, "1", "Programmatic below-min values should clamp on the DOM");
      assertEqual(
        lazyRange.value,
        "1",
        "Lazy range DOM should clamp below-min programmatic values",
      );

      set200.click();
      await flushDom();
      assertEqual(
        numberRange.value,
        "100",
        "Programmatic above-max values should clamp on the DOM",
      );
      assertEqual(
        lazyRange.value,
        "100",
        "Lazy range DOM should clamp above-max programmatic values",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
