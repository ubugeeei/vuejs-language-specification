import { assertEqual } from "../../../runtime/harness/assert.ts";
import { flushDom, getByTestId } from "../../../runtime/harness/dom.ts";
import { mountRuntimeInput } from "../../../runtime/harness/source.ts";
import type { RuntimeSourceInput, RuntimeTestSuite } from "../../../runtime/harness/types.ts";

const input: RuntimeSourceInput = {
  kind: "sfc",
  filename: "v-model-checkbox-mutable-collection.vue",
  source: `<script setup lang="ts">
import { computed, ref } from "vue";

const value = ref<string[] | Set<string>>([]);

function pushFoo(): void {
  if (Array.isArray(value.value)) {
    value.value.push("foo");
  }
}

function replaceBar(): void {
  if (Array.isArray(value.value)) {
    value.value[0] = "bar";
  }
}

function switchSet(): void {
  value.value = new Set();
}

function addFoo(): void {
  if (value.value instanceof Set) {
    value.value.add("foo");
  }
}

function deleteFoo(): void {
  if (value.value instanceof Set) {
    value.value.delete("foo");
  }
}

const mirror = computed(() =>
  Array.isArray(value.value) ? value.value.join(",") : [...value.value].sort().join(","),
);
</script>

<template>
<section>
    <input v-model="value" data-testid="field" type="checkbox" value="foo" />
    <button data-testid="push-foo" @click="pushFoo">push-foo</button>
    <button data-testid="replace-bar" @click="replaceBar">replace-bar</button>
    <button data-testid="switch-set" @click="switchSet">switch-set</button>
    <button data-testid="add-foo" @click="addFoo">add-foo</button>
    <button data-testid="delete-foo" @click="deleteFoo">delete-foo</button>
    <span data-testid="mirror">{{ mirror }}</span>
  </section>
</template>`.trim(),
};

export const vModelCheckboxMutableCollectionTestSuite: RuntimeTestSuite = {
  id: "runtime.forms.v-model-checkbox-mutable-collection",
  title: "Checkbox v-model reacts to in-place array and Set mutation",
  summary:
    "A checkbox bound to array or Set models must react to in-place collection mutation, not only to full value replacement.",
  environment: "browser",
  features: ["runtime.forms", "runtime.v-model"],
  upstream: [
    {
      repository: "vuejs/core",
      source: "packages/runtime-dom/__tests__/directives/vModel.spec.ts",
      cases: ["should support mutating an array or set value for a checkbox"],
    },
  ],
  input,
  async run() {
    const mounted = mountRuntimeInput(input);

    try {
      const input = getByTestId<HTMLInputElement>(mounted.container, "field");
      const pushFoo = getByTestId<HTMLButtonElement>(mounted.container, "push-foo");
      const replaceBar = getByTestId<HTMLButtonElement>(mounted.container, "replace-bar");
      const switchSet = getByTestId<HTMLButtonElement>(mounted.container, "switch-set");
      const addFoo = getByTestId<HTMLButtonElement>(mounted.container, "add-foo");
      const deleteFoo = getByTestId<HTMLButtonElement>(mounted.container, "delete-foo");

      assertEqual(input.checked, false, "Checkbox should start unchecked for an empty array");

      pushFoo.click();
      await flushDom();
      assertEqual(input.checked, true, "Pushing into the array in place should check the box");

      replaceBar.click();
      await flushDom();
      assertEqual(
        input.checked,
        false,
        "Replacing the array member in place should uncheck the box",
      );

      switchSet.click();
      await flushDom();
      assertEqual(input.checked, false, "Switching to an empty Set should keep the box unchecked");

      addFoo.click();
      await flushDom();
      assertEqual(input.checked, true, "Adding to the Set in place should check the box");

      deleteFoo.click();
      await flushDom();
      assertEqual(input.checked, false, "Deleting from the Set in place should uncheck the box");
    } finally {
      mounted.cleanup();
    }
  },
};
