# Type Evaluation

## 1. Scope

This chapter defines how compile-time type information becomes observable runtime prop metadata in curated cases.

The specification does not require an implementation to reuse TypeScript or Vue's own checker internally. It requires equivalent observable results for covered inputs.

## 1.1. Type Evaluation Judgment

The normalized type-evaluation surface is:

```text
eval_props : Sfc × ScriptOptions → RuntimeProp*
RuntimeProp ::= ⟨name, types*, required, skipCheck⟩
```

For a case `c`, conformance is:

```text
TypePass(I, c) ⇔ PropsEq(sortByName(eval_props(actual)), sortByName(eval_props(expected)))
```

## 2. Requirements

| ID       | Requirement                                                                                                                                                      | Cases                                                                                                                                                                                                    |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TYPE-1` | Inline type literals MUST lower into runtime props that preserve key presence and requiredness.                                                                  | [`type-evaluation.props.basic-type-literal`](../cases/type-evaluation/props/basic-type-literal.pkl)                                                                                                      |
| `TYPE-2` | Boolean, function, and array members MUST map to `Boolean`, `Function`, and `Array` runtime constructor families.                                                | [`type-evaluation.props.boolean-function-array`](../cases/type-evaluation/props/boolean-function-array.pkl)                                                                                              |
| `TYPE-3` | Extended interfaces MUST contribute inherited members to runtime props.                                                                                          | [`type-evaluation.props.interface-extends`](../cases/type-evaluation/props/interface-extends.pkl)                                                                                                        |
| `TYPE-4` | Intersections MUST merge visible members from all branches. Unions MUST preserve every reachable runtime property and widen constructor families when necessary. | [`type-evaluation.props.union-intersection-props`](../cases/type-evaluation/props/union-intersection-props.pkl)                                                                                          |
| `TYPE-5` | When a type cannot be narrowed to a runtime constructor family, the prop MUST still remain present in runtime props with an empty constructor set.               | [`type-evaluation.props.unknown-any-null-runtime-type`](../cases/type-evaluation/props/unknown-any-null-runtime-type.pkl)                                                                                |
| `TYPE-6` | `withDefaults` MUST preserve the underlying runtime constructor family of the wrapped optional props.                                                            | [`type-evaluation.props.with-defaults-literal`](../cases/type-evaluation/props/with-defaults-literal.pkl)                                                                                                |
| `TYPE-7` | `defineModel` MUST contribute both the main model prop and its modifiers companion prop to runtime props.                                                        | [`type-evaluation.props.define-model-basic`](../cases/type-evaluation/props/define-model-basic.pkl), [`type-evaluation.props.define-model-named`](../cases/type-evaluation/props/define-model-named.pkl) |
| `TYPE-8` | Reactive props destructure defaults MUST preserve the underlying runtime constructor family and optionality of the declared props.                               | [`type-evaluation.props.destructure-defaults`](../cases/type-evaluation/props/destructure-defaults.pkl)                                                                                                  |

## 3. Inference Boundary

For curated cases, a conforming type evaluator MUST preserve:

- prop name
- required vs optional
- runtime constructor family set, when inferable
- empty constructor sets for unknown-like cases

Cases MAY additionally assert binding maps when macro lowering changes which names are visible to later compilation stages.

## 4. Unsupported or Uncovered Constructs

When a construct is outside the curated suite:

- an implementation MAY reject it
- an implementation MAY widen it conservatively
- an implementation MUST NOT silently drop covered properties from otherwise supported inputs

## 5. Coverage Surface

Type-evaluation conformance in this repository is represented by the conjunction of:

- executable local type cases under [`cases/type-evaluation/`](../cases/type-evaluation/)
- vendored `vuejs/core` macro and type-resolution source files under [`sources/copied/vuejs-core/packages/compiler-sfc/__tests__/compileScript/`](../sources/copied/vuejs-core/packages/compiler-sfc/__tests__/compileScript/) and [`sources/copied/vuejs-core/packages/compiler-sfc/__tests__/compileScript.spec.ts`](../sources/copied/vuejs-core/packages/compiler-sfc/__tests__/compileScript.spec.ts)
- upstream tooling traceability under [`sources/traceability/vuejs-core.traceability.pkl`](../sources/traceability/vuejs-core.traceability.pkl) and [`sources/traceability/vuejs-language-tools.traceability.pkl`](../sources/traceability/vuejs-language-tools.traceability.pkl)

`covered` entries define the current executable obligation. `planned` entries define the remaining normalization backlog for type-level behavior and MUST remain visible in provenance review.
