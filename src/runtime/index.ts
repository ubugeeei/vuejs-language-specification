import { computedCacheTestSuite } from "../../runtime/testsuites/computed-cache.ts";
import { counterClickTestSuite } from "../../runtime/testsuites/counter-click.ts";
import { keyedListPreservesInputTestSuite } from "../../runtime/testsuites/keyed-list-preserves-input.ts";
import { lifecycleMountUnmountTestSuite } from "../../runtime/testsuites/lifecycle-mount-unmount.ts";
import { namedSlotTestSuite } from "../../runtime/testsuites/named-slot.ts";
import { parentEmitsTestSuite } from "../../runtime/testsuites/parent-emits.ts";
import { provideInjectTestSuite } from "../../runtime/testsuites/provide-inject.ts";
import { recursiveWatchTestSuite } from "../../runtime/testsuites/recursive-watch.ts";
import { slotFallbackTestSuite } from "../../runtime/testsuites/slot-fallback.ts";
import { slotProjectionTestSuite } from "../../runtime/testsuites/slot-projection.ts";
import { vModelCheckboxArrayTestSuite } from "../../runtime/testsuites/v-model-checkbox-array.ts";
import { vModelCheckboxMutableCollectionTestSuite } from "../../runtime/testsuites/v-model-checkbox-mutable-collection.ts";
import { vModelCheckboxSetTestSuite } from "../../runtime/testsuites/v-model-checkbox-set.ts";
import { vModelCheckboxTrueFalseObjectTestSuite } from "../../runtime/testsuites/v-model-checkbox-true-false-object.ts";
import { vModelCheckboxTrueFalseTestSuite } from "../../runtime/testsuites/v-model-checkbox-true-false.ts";
import { vModelCheckboxTestSuite } from "../../runtime/testsuites/v-model-checkbox.ts";
import { vModelComponentNumberTestSuite } from "../../runtime/testsuites/v-model-component-number.ts";
import { vModelComponentTrimExtraArgsTestSuite } from "../../runtime/testsuites/v-model-component-trim-extra-args.ts";
import { vModelComponentTrimNumberTestSuite } from "../../runtime/testsuites/v-model-component-trim-number.ts";
import { vModelComponentTrimSemanticsTestSuite } from "../../runtime/testsuites/v-model-component-trim-semantics.ts";
import { vIfToggleTestSuite } from "../../runtime/testsuites/v-if-toggle.ts";
import { vModelMultipleListenersTestSuite } from "../../runtime/testsuites/v-model-multiple-listeners.ts";
import { vModelNumberInputTestSuite } from "../../runtime/testsuites/v-model-number-input.ts";
import { vModelNumberLeadingZeroTestSuite } from "../../runtime/testsuites/v-model-number-leading-zero.ts";
import { vModelNumberRenderingTestSuite } from "../../runtime/testsuites/v-model-number-rendering.ts";
import { vModelRadioTestSuite } from "../../runtime/testsuites/v-model-radio.ts";
import { vModelRangeTestSuite } from "../../runtime/testsuites/v-model-range.ts";
import { vModelSelectMultipleNumberModelTestSuite } from "../../runtime/testsuites/v-model-select-multiple-number-model.ts";
import { vModelSelectMultipleNumberTestSuite } from "../../runtime/testsuites/v-model-select-multiple-number.ts";
import { vModelSelectMultipleObjectArrayTestSuite } from "../../runtime/testsuites/v-model-select-multiple-object-array.ts";
import { vModelSelectMultipleSetObjectTestSuite } from "../../runtime/testsuites/v-model-select-multiple-set-object.ts";
import { vModelSelectMultipleSetTestSuite } from "../../runtime/testsuites/v-model-select-multiple-set.ts";
import { vModelSelectMultipleTestSuite } from "../../runtime/testsuites/v-model-select-multiple.ts";
import { vModelSelectNumberTestSuite } from "../../runtime/testsuites/v-model-select-number.ts";
import { vModelSelectTestSuite } from "../../runtime/testsuites/v-model-select.ts";
import { vModelTextCompositionSessionTestSuite } from "../../runtime/testsuites/v-model-text-composition-session.ts";
import { vModelTextModifiersTestSuite } from "../../runtime/testsuites/v-model-text-modifiers.ts";
import { vModelTextTestSuite } from "../../runtime/testsuites/v-model-text.ts";
import { vModelTextareaTestSuite } from "../../runtime/testsuites/v-model-textarea.ts";
import { vModelUpdatedListenerTestSuite } from "../../runtime/testsuites/v-model-updated-listener.ts";
import { vShowToggleTestSuite } from "../../runtime/testsuites/v-show-toggle.ts";
import type { RuntimeTestSuite } from "../../runtime/harness/types.ts";

export const runtimeTestSuites: RuntimeTestSuite[] = [
  counterClickTestSuite,
  vIfToggleTestSuite,
  vModelTextTestSuite,
  vModelTextCompositionSessionTestSuite,
  vModelTextModifiersTestSuite,
  vModelTextareaTestSuite,
  vModelComponentNumberTestSuite,
  vModelComponentTrimSemanticsTestSuite,
  vModelComponentTrimNumberTestSuite,
  vModelComponentTrimExtraArgsTestSuite,
  vModelCheckboxTestSuite,
  vModelCheckboxArrayTestSuite,
  vModelCheckboxMutableCollectionTestSuite,
  vModelCheckboxSetTestSuite,
  vModelCheckboxTrueFalseTestSuite,
  vModelCheckboxTrueFalseObjectTestSuite,
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
  vModelMultipleListenersTestSuite,
  vModelUpdatedListenerTestSuite,
  vShowToggleTestSuite,
  slotProjectionTestSuite,
  slotFallbackTestSuite,
  namedSlotTestSuite,
  parentEmitsTestSuite,
  provideInjectTestSuite,
  lifecycleMountUnmountTestSuite,
  keyedListPreservesInputTestSuite,
  recursiveWatchTestSuite,
  computedCacheTestSuite,
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
