import { counterClickTestSuite } from "../../testsuites/runtime/10-dom/counter-click.ts";
import { keyedListPreservesInputTestSuite } from "../../testsuites/runtime/10-dom/keyed-list-preserves-input.ts";
import { vIfToggleTestSuite } from "../../testsuites/runtime/10-dom/v-if-toggle.ts";
import { vModelMultipleListenersTestSuite } from "../../testsuites/runtime/10-dom/v-model-multiple-listeners.ts";
import { vModelTextTestSuite } from "../../testsuites/runtime/10-dom/v-model-text.ts";
import { vModelUpdatedListenerTestSuite } from "../../testsuites/runtime/10-dom/v-model-updated-listener.ts";
import { vShowToggleTestSuite } from "../../testsuites/runtime/10-dom/v-show-toggle.ts";
import { vModelCheckboxArrayTestSuite } from "../../testsuites/runtime/20-forms/v-model-checkbox-array.ts";
import { vModelCheckboxMutableCollectionTestSuite } from "../../testsuites/runtime/20-forms/v-model-checkbox-mutable-collection.ts";
import { vModelCheckboxSetTestSuite } from "../../testsuites/runtime/20-forms/v-model-checkbox-set.ts";
import { vModelCheckboxTrueFalseObjectTestSuite } from "../../testsuites/runtime/20-forms/v-model-checkbox-true-false-object.ts";
import { vModelCheckboxTrueFalseTestSuite } from "../../testsuites/runtime/20-forms/v-model-checkbox-true-false.ts";
import { vModelCheckboxTestSuite } from "../../testsuites/runtime/20-forms/v-model-checkbox.ts";
import { vModelNumberInputTestSuite } from "../../testsuites/runtime/20-forms/v-model-number-input.ts";
import { vModelNumberLeadingZeroTestSuite } from "../../testsuites/runtime/20-forms/v-model-number-leading-zero.ts";
import { vModelNumberRenderingTestSuite } from "../../testsuites/runtime/20-forms/v-model-number-rendering.ts";
import { vModelRadioTestSuite } from "../../testsuites/runtime/20-forms/v-model-radio.ts";
import { vModelRangeTestSuite } from "../../testsuites/runtime/20-forms/v-model-range.ts";
import { vModelSelectMultipleNumberModelTestSuite } from "../../testsuites/runtime/20-forms/v-model-select-multiple-number-model.ts";
import { vModelSelectMultipleNumberTestSuite } from "../../testsuites/runtime/20-forms/v-model-select-multiple-number.ts";
import { vModelSelectMultipleObjectArrayTestSuite } from "../../testsuites/runtime/20-forms/v-model-select-multiple-object-array.ts";
import { vModelSelectMultipleSetObjectTestSuite } from "../../testsuites/runtime/20-forms/v-model-select-multiple-set-object.ts";
import { vModelSelectMultipleSetTestSuite } from "../../testsuites/runtime/20-forms/v-model-select-multiple-set.ts";
import { vModelSelectMultipleTestSuite } from "../../testsuites/runtime/20-forms/v-model-select-multiple.ts";
import { vModelSelectNumberTestSuite } from "../../testsuites/runtime/20-forms/v-model-select-number.ts";
import { vModelSelectTestSuite } from "../../testsuites/runtime/20-forms/v-model-select.ts";
import { vModelTextCompositionSessionTestSuite } from "../../testsuites/runtime/20-forms/v-model-text-composition-session.ts";
import { vModelTextModifiersTestSuite } from "../../testsuites/runtime/20-forms/v-model-text-modifiers.ts";
import { vModelTextareaTestSuite } from "../../testsuites/runtime/20-forms/v-model-textarea.ts";
import { namedSlotTestSuite } from "../../testsuites/runtime/30-components/named-slot.ts";
import { parentEmitsTestSuite } from "../../testsuites/runtime/30-components/parent-emits.ts";
import { provideInjectTestSuite } from "../../testsuites/runtime/30-components/provide-inject.ts";
import { slotFallbackTestSuite } from "../../testsuites/runtime/30-components/slot-fallback.ts";
import { slotProjectionTestSuite } from "../../testsuites/runtime/30-components/slot-projection.ts";
import { vModelComponentNumberTestSuite } from "../../testsuites/runtime/30-components/v-model-component-number.ts";
import { vModelComponentTrimExtraArgsTestSuite } from "../../testsuites/runtime/30-components/v-model-component-trim-extra-args.ts";
import { vModelComponentTrimNumberTestSuite } from "../../testsuites/runtime/30-components/v-model-component-trim-number.ts";
import { vModelComponentTrimSemanticsTestSuite } from "../../testsuites/runtime/30-components/v-model-component-trim-semantics.ts";
import { lifecycleMountUnmountTestSuite } from "../../testsuites/runtime/40-lifecycle/lifecycle-mount-unmount.ts";
import { computedCacheTestSuite } from "../../testsuites/runtime/50-reactivity/computed-cache.ts";
import { recursiveWatchTestSuite } from "../../testsuites/runtime/50-reactivity/recursive-watch.ts";
import type { RuntimeTestSuite } from "../../runtime/harness/types.ts";

// Runtime suites are grouped by canonical domain order to keep docs, execution, and file layout aligned.
const domRuntimeTestSuites: RuntimeTestSuite[] = [
  counterClickTestSuite,
  vIfToggleTestSuite,
  vModelTextTestSuite,
  keyedListPreservesInputTestSuite,
  vShowToggleTestSuite,
  vModelMultipleListenersTestSuite,
  vModelUpdatedListenerTestSuite,
];

const formsRuntimeTestSuites: RuntimeTestSuite[] = [
  vModelTextCompositionSessionTestSuite,
  vModelTextModifiersTestSuite,
  vModelTextareaTestSuite,
  vModelCheckboxTestSuite,
  vModelCheckboxArrayTestSuite,
  vModelCheckboxMutableCollectionTestSuite,
  vModelCheckboxSetTestSuite,
  vModelCheckboxTrueFalseObjectTestSuite,
  vModelCheckboxTrueFalseTestSuite,
  vModelNumberInputTestSuite,
  vModelNumberLeadingZeroTestSuite,
  vModelNumberRenderingTestSuite,
  vModelRadioTestSuite,
  vModelRangeTestSuite,
  vModelSelectTestSuite,
  vModelSelectNumberTestSuite,
  vModelSelectMultipleTestSuite,
  vModelSelectMultipleNumberTestSuite,
  vModelSelectMultipleNumberModelTestSuite,
  vModelSelectMultipleObjectArrayTestSuite,
  vModelSelectMultipleSetTestSuite,
  vModelSelectMultipleSetObjectTestSuite,
];

const componentsRuntimeTestSuites: RuntimeTestSuite[] = [
  slotProjectionTestSuite,
  slotFallbackTestSuite,
  namedSlotTestSuite,
  parentEmitsTestSuite,
  provideInjectTestSuite,
  vModelComponentNumberTestSuite,
  vModelComponentTrimSemanticsTestSuite,
  vModelComponentTrimNumberTestSuite,
  vModelComponentTrimExtraArgsTestSuite,
];

const lifecycleRuntimeTestSuites: RuntimeTestSuite[] = [lifecycleMountUnmountTestSuite];

const reactivityRuntimeTestSuites: RuntimeTestSuite[] = [
  recursiveWatchTestSuite,
  computedCacheTestSuite,
];

export const runtimeTestSuites: RuntimeTestSuite[] = [
  ...domRuntimeTestSuites,
  ...formsRuntimeTestSuites,
  ...componentsRuntimeTestSuites,
  ...lifecycleRuntimeTestSuites,
  ...reactivityRuntimeTestSuites,
];

export const browserRuntimeTestSuites = runtimeTestSuites.filter(
  (runtimeTestSuite) => runtimeTestSuite.environment === "browser",
);

export const nodeRuntimeTestSuites = runtimeTestSuites.filter(
  (runtimeTestSuite) => runtimeTestSuite.environment === "node",
);

export async function runRuntimeTestSuites(
  testSuites: RuntimeTestSuite[] = runtimeTestSuites,
): Promise<void> {
  for (const runtimeTestSuite of testSuites) {
    await runtimeTestSuite.run();
  }
}
export type { RuntimeTestSuite } from "../../runtime/harness/types.ts";
