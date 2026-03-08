# Runtime Conformance

## 1. Scope

The runtime suite is the only JavaScript-specific suite in this repository. It exists to standardize DOM-observable and state-observable behavior that cannot be expressed in a language-neutral way.

The reference runner is executed by Vitest. DOM cases run in Browser Mode. Pure reactivity cases run in the Node project.

## 1.1. Runtime Transition Model

Runtime cases are modeled as labeled transitions:

```text
step : RuntimeState × Action → RuntimeState
observe : RuntimeState → Observation
```

For a runtime case `c = ⟨Σ0, α1..αn, expected⟩`, conformance is:

```text
RuntimePass(I, c) ⇔
  let Σn = step(...step(step(Σ0, α1), α2)..., αn)
  in ObsEq(observe(Σn), expected)
```

Only the case-defined observation is normative.

## 2. Observable Surface

A runtime case MAY assert:

- text content
- DOM tree shape
- DOM property state
- event-driven state transitions
- provide/inject visibility
- lifecycle side effects that become observable through DOM or state
- selected reactivity invariants

It MUST NOT require matching private scheduler internals unless those internals become externally observable in the case.

## 3. Requirements

| ID            | Requirement                                                                                                            | Cases                                                                                                                                                                                                                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RUN-DOM-1`   | Event handlers that mutate reactive state MUST produce the corresponding DOM update after the required flush boundary. | [`runtime.dom.counter-click`](../src/runtime/cases/counter-click.ts), [`runtime.dom.v-if-toggle`](../src/runtime/cases/v-if-toggle.ts)                                                                                                                                                                                       |
| `RUN-DOM-2`   | Form controls bound through Vue runtime semantics MUST keep DOM state and reactive state synchronized.                 | [`runtime.dom.v-model-text`](../src/runtime/cases/v-model-text.ts), [`runtime.forms.v-model-checkbox`](../src/runtime/cases/v-model-checkbox.ts), [`runtime.forms.v-model-checkbox-true-false`](../src/runtime/cases/v-model-checkbox-true-false.ts), [`runtime.forms.v-model-radio`](../src/runtime/cases/v-model-radio.ts) |
| `RUN-DOM-3`   | Keyed child movement MUST preserve per-instance state across reorder operations.                                       | [`runtime.dom.keyed-list-preserves-input-state`](../src/runtime/cases/keyed-list-preserves-input.ts)                                                                                                                                                                                                                         |
| `RUN-DOM-4`   | `v-show` MUST toggle the rendered element's display style without removing the node from the mounted tree.             | [`runtime.dom.v-show-toggle`](../src/runtime/cases/v-show-toggle.ts)                                                                                                                                                                                                                                                         |
| `RUN-DOM-5`   | Single-select `v-model` MUST synchronize both the selected option and the bound reactive state.                        | [`runtime.forms.v-model-select`](../src/runtime/cases/v-model-select.ts)                                                                                                                                                                                                                                                     |
| `RUN-COMP-1`  | Default and named slots MUST render at their declared outlets.                                                         | [`runtime.components.default-slot`](../src/runtime/cases/slot-projection.ts), [`runtime.components.named-slot`](../src/runtime/cases/named-slot.ts)                                                                                                                                                                          |
| `RUN-COMP-2`  | Child emits MUST trigger parent listeners and parent-visible state transitions.                                        | [`runtime.components.parent-emits`](../src/runtime/cases/parent-emits.ts)                                                                                                                                                                                                                                                    |
| `RUN-COMP-3`  | Injected refs MUST remain reactive to provider updates.                                                                | [`runtime.components.provide-inject-ref`](../src/runtime/cases/provide-inject.ts)                                                                                                                                                                                                                                            |
| `RUN-COMP-4`  | Slot fallback content MUST render when the corresponding slot channel is absent.                                       | [`runtime.components.slot-fallback`](../src/runtime/cases/slot-fallback.ts)                                                                                                                                                                                                                                                  |
| `RUN-LIFE-1`  | Mount and unmount hooks MUST fire exactly once per insertion/removal cycle when observed through state.                | [`runtime.lifecycle.mount-unmount`](../src/runtime/cases/lifecycle-mount-unmount.ts)                                                                                                                                                                                                                                         |
| `RUN-REACT-1` | Recursive watch stabilization MUST converge instead of diverging for the covered case.                                 | [`runtime.reactivity.recursive-watch`](../src/runtime/cases/recursive-watch.ts)                                                                                                                                                                                                                                              |
| `RUN-REACT-2` | Computed values MUST remain lazy and cached until dependency invalidation.                                             | [`runtime.reactivity.computed-cache`](../src/runtime/cases/computed-cache.ts)                                                                                                                                                                                                                                                |

## 4. Harness Rule

The runtime suite uses a deliberately small harness:

- DOM cases mount a Vue app into a fresh container
- the case itself performs interaction and observation
- cleanup runs after every case

This keeps the runtime suite production-oriented and minimizes harness-specific semantics.

## 5. Coverage Surface

Runtime conformance in this repository is represented by the conjunction of:

- executable local runtime cases under [`src/runtime/cases/`](../src/runtime/cases/)
- Browser Mode execution under [`test/runtime.browser.spec.ts`](../test/runtime.browser.spec.ts) for DOM-observable cases
- vendored `vuejs/core` runtime and reactivity source files under [`sources/copied/vuejs-core/packages/runtime-core/`](../sources/copied/vuejs-core/packages/runtime-core/), [`sources/copied/vuejs-core/packages/runtime-dom/`](../sources/copied/vuejs-core/packages/runtime-dom/), and [`sources/copied/vuejs-core/packages/reactivity/`](../sources/copied/vuejs-core/packages/reactivity/)
- repository-level traceability under [`sources/traceability/vuejs-core.traceability.pkl`](../sources/traceability/vuejs-core.traceability.pkl) and [`sources/traceability/ubugeeei-vize.traceability.pkl`](../sources/traceability/ubugeeei-vize.traceability.pkl)

An implementation claim for the runtime target MUST execute the local runtime suite. Vendored runtime corpus entries with status `planned` remain within scope for future executable promotion.
