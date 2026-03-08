import { computedCacheTestSuite } from "./testsuites/computed-cache.ts";
import { counterClickTestSuite } from "./testsuites/counter-click.ts";
import { keyedListPreservesInputTestSuite } from "./testsuites/keyed-list-preserves-input.ts";
import { lifecycleMountUnmountTestSuite } from "./testsuites/lifecycle-mount-unmount.ts";
import { namedSlotTestSuite } from "./testsuites/named-slot.ts";
import { parentEmitsTestSuite } from "./testsuites/parent-emits.ts";
import { provideInjectTestSuite } from "./testsuites/provide-inject.ts";
import { recursiveWatchTestSuite } from "./testsuites/recursive-watch.ts";
import { slotFallbackTestSuite } from "./testsuites/slot-fallback.ts";
import { slotProjectionTestSuite } from "./testsuites/slot-projection.ts";
import { vModelCheckboxArrayTestSuite } from "./testsuites/v-model-checkbox-array.ts";
import { vModelCheckboxMutableCollectionTestSuite } from "./testsuites/v-model-checkbox-mutable-collection.ts";
import { vModelCheckboxSetTestSuite } from "./testsuites/v-model-checkbox-set.ts";
import { vModelCheckboxTrueFalseObjectTestSuite } from "./testsuites/v-model-checkbox-true-false-object.ts";
import { vModelCheckboxTrueFalseTestSuite } from "./testsuites/v-model-checkbox-true-false.ts";
import { vModelCheckboxTestSuite } from "./testsuites/v-model-checkbox.ts";
import { vModelComponentNumberTestSuite } from "./testsuites/v-model-component-number.ts";
import { vModelComponentTrimExtraArgsTestSuite } from "./testsuites/v-model-component-trim-extra-args.ts";
import { vModelComponentTrimNumberTestSuite } from "./testsuites/v-model-component-trim-number.ts";
import { vModelComponentTrimSemanticsTestSuite } from "./testsuites/v-model-component-trim-semantics.ts";
import { vIfToggleTestSuite } from "./testsuites/v-if-toggle.ts";
import { vModelMultipleListenersTestSuite } from "./testsuites/v-model-multiple-listeners.ts";
import { vModelNumberInputTestSuite } from "./testsuites/v-model-number-input.ts";
import { vModelNumberLeadingZeroTestSuite } from "./testsuites/v-model-number-leading-zero.ts";
import { vModelNumberRenderingTestSuite } from "./testsuites/v-model-number-rendering.ts";
import { vModelRadioTestSuite } from "./testsuites/v-model-radio.ts";
import { vModelRangeTestSuite } from "./testsuites/v-model-range.ts";
import { vModelSelectMultipleNumberModelTestSuite } from "./testsuites/v-model-select-multiple-number-model.ts";
import { vModelSelectMultipleNumberTestSuite } from "./testsuites/v-model-select-multiple-number.ts";
import { vModelSelectMultipleObjectArrayTestSuite } from "./testsuites/v-model-select-multiple-object-array.ts";
import { vModelSelectMultipleSetObjectTestSuite } from "./testsuites/v-model-select-multiple-set-object.ts";
import { vModelSelectMultipleSetTestSuite } from "./testsuites/v-model-select-multiple-set.ts";
import { vModelSelectMultipleTestSuite } from "./testsuites/v-model-select-multiple.ts";
import { vModelSelectNumberTestSuite } from "./testsuites/v-model-select-number.ts";
import { vModelSelectTestSuite } from "./testsuites/v-model-select.ts";
import { vModelTextCompositionSessionTestSuite } from "./testsuites/v-model-text-composition-session.ts";
import { vModelTextModifiersTestSuite } from "./testsuites/v-model-text-modifiers.ts";
import { vModelTextTestSuite } from "./testsuites/v-model-text.ts";
import { vModelTextareaTestSuite } from "./testsuites/v-model-textarea.ts";
import { vModelUpdatedListenerTestSuite } from "./testsuites/v-model-updated-listener.ts";
import { vShowToggleTestSuite } from "./testsuites/v-show-toggle.ts";
import type { RuntimeTestSuite } from "./types.ts";

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
export type { RuntimeTestSuite } from "./types.ts";
