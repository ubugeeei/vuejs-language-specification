import { computedCacheCase } from "./cases/computed-cache.ts";
import { counterClickCase } from "./cases/counter-click.ts";
import { keyedListPreservesInputCase } from "./cases/keyed-list-preserves-input.ts";
import { lifecycleMountUnmountCase } from "./cases/lifecycle-mount-unmount.ts";
import { namedSlotCase } from "./cases/named-slot.ts";
import { parentEmitsCase } from "./cases/parent-emits.ts";
import { provideInjectCase } from "./cases/provide-inject.ts";
import { recursiveWatchCase } from "./cases/recursive-watch.ts";
import { slotFallbackCase } from "./cases/slot-fallback.ts";
import { slotProjectionCase } from "./cases/slot-projection.ts";
import { vIfToggleCase } from "./cases/v-if-toggle.ts";
import { vModelCheckboxCase } from "./cases/v-model-checkbox.ts";
import { vModelCheckboxArrayCase } from "./cases/v-model-checkbox-array.ts";
import { vModelCheckboxMutableCollectionCase } from "./cases/v-model-checkbox-mutable-collection.ts";
import { vModelCheckboxSetCase } from "./cases/v-model-checkbox-set.ts";
import { vModelCheckboxTrueFalseCase } from "./cases/v-model-checkbox-true-false.ts";
import { vModelCheckboxTrueFalseObjectCase } from "./cases/v-model-checkbox-true-false-object.ts";
import { vModelMultipleListenersCase } from "./cases/v-model-multiple-listeners.ts";
import { vModelNumberInputCase } from "./cases/v-model-number-input.ts";
import { vModelNumberLeadingZeroCase } from "./cases/v-model-number-leading-zero.ts";
import { vModelNumberRenderingCase } from "./cases/v-model-number-rendering.ts";
import { vModelRadioCase } from "./cases/v-model-radio.ts";
import { vModelRangeCase } from "./cases/v-model-range.ts";
import { vModelSelectCase } from "./cases/v-model-select.ts";
import { vModelSelectNumberCase } from "./cases/v-model-select-number.ts";
import { vModelSelectMultipleCase } from "./cases/v-model-select-multiple.ts";
import { vModelSelectMultipleNumberCase } from "./cases/v-model-select-multiple-number.ts";
import { vModelSelectMultipleNumberModelCase } from "./cases/v-model-select-multiple-number-model.ts";
import { vModelSelectMultipleObjectArrayCase } from "./cases/v-model-select-multiple-object-array.ts";
import { vModelSelectMultipleSetCase } from "./cases/v-model-select-multiple-set.ts";
import { vModelSelectMultipleSetObjectCase } from "./cases/v-model-select-multiple-set-object.ts";
import { vModelTextCase } from "./cases/v-model-text.ts";
import { vModelTextCompositionSessionCase } from "./cases/v-model-text-composition-session.ts";
import { vModelTextModifiersCase } from "./cases/v-model-text-modifiers.ts";
import { vModelTextareaCase } from "./cases/v-model-textarea.ts";
import { vModelUpdatedListenerCase } from "./cases/v-model-updated-listener.ts";
import { vShowToggleCase } from "./cases/v-show-toggle.ts";
import type { RuntimeCase } from "./types.ts";

export const runtimeCases: RuntimeCase[] = [
  counterClickCase,
  vIfToggleCase,
  vModelTextCase,
  vModelTextCompositionSessionCase,
  vModelTextModifiersCase,
  vModelTextareaCase,
  vModelCheckboxCase,
  vModelCheckboxArrayCase,
  vModelCheckboxMutableCollectionCase,
  vModelCheckboxSetCase,
  vModelCheckboxTrueFalseCase,
  vModelCheckboxTrueFalseObjectCase,
  vModelNumberInputCase,
  vModelNumberLeadingZeroCase,
  vModelNumberRenderingCase,
  vModelRadioCase,
  vModelRangeCase,
  vModelSelectCase,
  vModelSelectNumberCase,
  vModelSelectMultipleCase,
  vModelSelectMultipleNumberCase,
  vModelSelectMultipleNumberModelCase,
  vModelSelectMultipleObjectArrayCase,
  vModelSelectMultipleSetCase,
  vModelSelectMultipleSetObjectCase,
  vModelMultipleListenersCase,
  vModelUpdatedListenerCase,
  vShowToggleCase,
  slotProjectionCase,
  slotFallbackCase,
  namedSlotCase,
  parentEmitsCase,
  provideInjectCase,
  lifecycleMountUnmountCase,
  keyedListPreservesInputCase,
  recursiveWatchCase,
  computedCacheCase,
];

export const browserRuntimeCases = runtimeCases.filter(
  (runtimeCase) => runtimeCase.environment === "browser",
);

export const nodeRuntimeCases = runtimeCases.filter(
  (runtimeCase) => runtimeCase.environment === "node",
);

export async function runRuntimeCases(cases: RuntimeCase[] = runtimeCases): Promise<void> {
  for (const runtimeCase of cases) {
    await runtimeCase.run();
  }
}

export type { RuntimeCase } from "./types.ts";
