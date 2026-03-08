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
import { vModelCheckboxTrueFalseCase } from "./cases/v-model-checkbox-true-false.ts";
import { vModelRadioCase } from "./cases/v-model-radio.ts";
import { vModelSelectCase } from "./cases/v-model-select.ts";
import { vModelTextCase } from "./cases/v-model-text.ts";
import { vShowToggleCase } from "./cases/v-show-toggle.ts";
import type { RuntimeCase } from "./types.ts";

export const runtimeCases: RuntimeCase[] = [
  counterClickCase,
  vIfToggleCase,
  vModelTextCase,
  vModelCheckboxCase,
  vModelCheckboxTrueFalseCase,
  vModelRadioCase,
  vModelSelectCase,
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
