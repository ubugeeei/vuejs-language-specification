import { defineComponent, h, onMounted, onUnmounted, ref } from "vue";
import { assertEqual } from "../assert.ts";
import { flushDom, getByTestId, mount } from "../dom.ts";
import type { RuntimeCase } from "../types.ts";

export const lifecycleMountUnmountCase: RuntimeCase = {
  id: "runtime.lifecycle.mount-unmount",
  title: "Mount and unmount hooks fire exactly once per insertion cycle",
  summary:
    "Component lifecycle hooks record one mount and one unmount when a child is toggled into and out of the rendered tree.",
  environment: "browser",
  features: ["runtime.components", "runtime.lifecycle"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-core/__tests__/apiLifecycle.spec.ts",
      cases: ["onMounted", "onUnmounted"],
    },
    {
      repository: "ubugeeei/vize",
      source: "playground/e2e/components.test.ts",
      cases: ["should call onMounted", "should call onUnmounted"],
    },
  ],
  async run() {
    const Child = defineComponent({
      props: {
        log: {
          type: Array,
          required: true,
        },
      },
      setup(props) {
        onMounted(() => {
          props.log.push("mounted");
        });
        onUnmounted(() => {
          props.log.push("unmounted");
        });
        return () => h("p", { "data-testid": "child" }, "child");
      },
    });

    const App = defineComponent({
      setup() {
        const visible = ref(true);
        const log = ref<string[]>([]);
        return () =>
          h("section", null, [
            h(
              "button",
              {
                "data-testid": "toggle",
                onClick: () => {
                  visible.value = !visible.value;
                },
              },
              "toggle",
            ),
            h("span", { "data-testid": "log" }, log.value.join(",")),
            visible.value ? h(Child, { log: log.value }) : null,
          ]);
      },
    });

    const mounted = mount(App);

    try {
      await flushDom();
      const log = getByTestId<HTMLElement>(mounted.container, "log");
      assertEqual(
        log.textContent,
        "mounted",
        "Mount hook should fire once for the initial insertion",
      );

      getByTestId<HTMLButtonElement>(mounted.container, "toggle").click();
      await flushDom();
      assertEqual(
        log.textContent,
        "mounted,unmounted",
        "Unmount hook should fire once when the child is removed",
      );
    } finally {
      mounted.cleanup();
    }
  },
};
