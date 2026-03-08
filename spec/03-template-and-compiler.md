# Template and Compiler Semantics

## 1. Scope

This chapter defines the observable compiler contract for template compilation, script compilation, and scoped style compilation.

## 2. General Rule

A conforming compiler MAY vary in formatting or helper alias spelling, but it MUST preserve the observable semantics asserted by curated cases:

- structural AST facts
- helper usage classes
- hoist and cache behavior
- emitted runtime options
- stable normalized code where the case fixes exact output

## 2.1. Compiler Judgments

The compiler surface is modeled by:

```text
compile_tpl : Template × CompileOptions → ⟨TemplateAst, HelperSet, Code⟩
compile_script : Sfc × ScriptOptions → ⟨ComponentOptions, Bindings, Code⟩
compile_style : Css × StyleOptions → ⟨Css, Error*⟩
```

For a compiler case `c`, conformance is defined on projections:

```text
CompilerPass(I, c) ⇔
  AstEq(Proj_ast(actual), Proj_ast(expected)) ∧
  HelperEq(Proj_helpers(actual), Proj_helpers(expected)) ∧
  CodeEq(Proj_code(actual), Proj_code(expected)) ∧
  PropsEq(Proj_props(actual), Proj_props(expected))
```

## 3. Requirements

| ID           | Requirement                                                                                                                                                  | Cases                                                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CMP-TPL-1`  | `v-if` chains MUST preserve branch condition structure and compile into equivalent conditional control flow.                                                 | [`compiler.template.v-if-basic`](../cases/compiler/template/v-if-basic.pkl)                                                                                                                      |
| `CMP-TPL-2`  | `v-for` MUST preserve iterable source and alias extraction in the transformed AST and compile via `renderList`-style iteration semantics.                    | [`compiler.template.v-for-keyed-list`](../cases/compiler/template/v-for-keyed-list.pkl)                                                                                                          |
| `CMP-TPL-3`  | `v-on` MUST remain observable as an event directive in the AST and MUST compile into the corresponding `onX` prop with the correct dynamic patch semantics.  | [`compiler.template.v-on-click-handler`](../cases/compiler/template/v-on-click-handler.pkl)                                                                                                      |
| `CMP-TPL-4`  | Whole-object `v-bind` MUST merge with surrounding static and explicit props in source order.                                                                 | [`compiler.template.v-bind-object-merge-props`](../cases/compiler/template/v-bind-object-merge-props.pkl)                                                                                        |
| `CMP-TPL-5`  | Component slot syntax MUST compile into stable named and default slot functions with explicit slot-channel separation.                                       | [`compiler.template.component-named-slot`](../cases/compiler/template/component-named-slot.pkl)                                                                                                  |
| `CMP-TPL-6`  | `v-once` MUST compile into subtree caching semantics rather than repeated subtree reconstruction.                                                            | [`compiler.template.v-once-cached-subtree`](../cases/compiler/template/v-once-cached-subtree.pkl)                                                                                                |
| `CMP-TPL-7`  | When static hoisting is enabled, static props MUST hoist into a reusable object literal and the render function MUST reuse it.                               | [`compiler.template.hoisted-static-props`](../cases/compiler/template/hoisted-static-props.pkl)                                                                                                  |
| `CMP-TPL-8`  | Slot outlets with fallback content MUST compile into `renderSlot` with an explicit fallback closure that preserves the fallback subtree.                     | [`compiler.template.slot-fallback`](../cases/compiler/template/slot-fallback.pkl)                                                                                                                |
| `CMP-TPL-9`  | `v-html` MUST lower to an `innerHTML` prop write with the corresponding dynamic prop channel.                                                                | [`compiler.template.v-html-basic`](../cases/compiler/template/v-html-basic.pkl)                                                                                                                  |
| `CMP-TPL-10` | `v-text` MUST lower to a `textContent` prop write that stringifies through `toDisplayString`.                                                                | [`compiler.template.v-text-basic`](../cases/compiler/template/v-text-basic.pkl)                                                                                                                  |
| `CMP-TPL-11` | Text-input `v-model` MUST lower to the `vModelText` runtime directive and an `onUpdate:modelValue` listener.                                                 | [`compiler.template.v-model-text`](../cases/compiler/template/v-model-text.pkl)                                                                                                                  |
| `CMP-SCR-1`  | `defineProps` runtime declarations MUST lower into component `props` while preserving binding analysis.                                                      | [`compiler.script.define-props-runtime-options`](../cases/compiler/script/define-props-runtime-options.pkl)                                                                                      |
| `CMP-SCR-2`  | `defineEmits` MUST lower into the component `emits` option and preserve the setup-local emit alias.                                                          | [`compiler.script.define-emits-array`](../cases/compiler/script/define-emits-array.pkl)                                                                                                          |
| `CMP-SCR-3`  | `withDefaults` MUST retain both runtime constructor families and literal defaults in emitted props.                                                          | [`compiler.script.with-defaults-typed-props`](../cases/compiler/script/with-defaults-typed-props.pkl)                                                                                            |
| `CMP-SCR-4`  | `defineModel` MUST contribute model props, modifiers props, and matching update emits.                                                                       | [`compiler.script.define-model-basic`](../cases/compiler/script/define-model-basic.pkl), [`compiler.script.define-model-named`](../cases/compiler/script/define-model-named.pkl)                 |
| `CMP-SCR-5`  | Reactive props destructure defaults MUST still lower into runtime `props` with the corresponding constructor families and retained default-expression kinds. | [`compiler.script.define-props-destructure-defaults`](../cases/compiler/script/define-props-destructure-defaults.pkl)                                                                            |
| `CMP-SCR-6`  | `defineOptions` MUST erase the macro call and lower only admissible component options into the emitted default export shell.                                 | [`compiler.script.define-options-basic`](../cases/compiler/script/define-options-basic.pkl), [`compiler.script.define-options-empty`](../cases/compiler/script/define-options-empty.pkl)         |
| `CMP-SCR-7`  | `defineExpose` MUST lower into the setup expose bridge and invoke that bridge with the declared exposed object.                                              | [`compiler.script.define-expose-basic`](../cases/compiler/script/define-expose-basic.pkl)                                                                                                        |
| `CMP-SCR-8`  | `defineSlots` MUST erase to `useSlots()` exactly when the slots binding becomes runtime-observable, and MUST remain type-only otherwise.                     | [`compiler.script.define-slots-basic`](../cases/compiler/script/define-slots-basic.pkl), [`compiler.script.define-slots-erased-unused`](../cases/compiler/script/define-slots-erased-unused.pkl) |
| `CMP-CSS-1`  | Scoped style compilation MUST rewrite ordinary selectors with the provided scope id.                                                                         | [`compiler.style.scoped-style`](../cases/compiler/style/scoped-style.pkl)                                                                                                                        |
| `CMP-CSS-2`  | `:deep(...)` MUST stop scope injection at the deep boundary.                                                                                                 | [`compiler.style.deep-selector`](../cases/compiler/style/deep-selector.pkl)                                                                                                                      |
| `CMP-CSS-3`  | `:slotted(...)` MUST target slot content with the slot-scope suffix rather than the component scope suffix.                                                  | [`compiler.style.slotted-selector`](../cases/compiler/style/slotted-selector.pkl)                                                                                                                |
| `CMP-CSS-4`  | `:global(...)` MUST bypass scope rewriting for the global selector segment.                                                                                  | [`compiler.style.global-selector`](../cases/compiler/style/global-selector.pkl)                                                                                                                  |

## 4. Output Discipline

Curated compiler cases use the following assertion classes:

- helper set equality
- JSON pointer assertions over normalized ASTs
- exact normalized code for cases where emitted spelling is part of the observable contract
- exact emitted prop constructors, default expression kinds, emits sets, and binding maps for script compilation

Substring matching is non-normative and insufficient.

## 5. Profiles

Profile-specific compiler behavior, including Vapor, MUST be isolated behind `profile`-declared cases and MUST identify the upstream branch snapshot they were derived from.

## 6. Coverage Surface

Compiler conformance in this repository is represented by the conjunction of:

- executable local compiler cases under [`cases/compiler/`](../cases/compiler/)
- vendored `vuejs/core` compiler source files under [`sources/copied/vuejs-core/packages/compiler-core/`](../sources/copied/vuejs-core/packages/compiler-core/), [`sources/copied/vuejs-core/packages/compiler-dom/`](../sources/copied/vuejs-core/packages/compiler-dom/), [`sources/copied/vuejs-core/packages/compiler-sfc/`](../sources/copied/vuejs-core/packages/compiler-sfc/), and [`sources/copied/vuejs-core/packages/compiler-ssr/`](../sources/copied/vuejs-core/packages/compiler-ssr/)
- repository-level traceability under [`sources/traceability/vuejs-core.traceability.pkl`](../sources/traceability/vuejs-core.traceability.pkl) and [`sources/traceability/ubugeeei-vize.traceability.pkl`](../sources/traceability/ubugeeei-vize.traceability.pkl)

An implementation claim MUST evaluate local executable cases for `covered` compiler entries. `planned` compiler entries remain within the intended executable suite and MUST NOT be treated as out of scope.
