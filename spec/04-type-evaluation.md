# Type Evaluation

## 1. Scope

This chapter defines how compile-time type information becomes observable runtime prop metadata in curated test suites.

The specification does not require an implementation to reuse TypeScript or Vue's own checker internally. It requires equivalent observable results for covered inputs.

## 1.1. Type Evaluation Judgment

The normalized type-evaluation surface is:

```text
eval_props : Sfc × ScriptOptions → RuntimeProp*
RuntimeProp ::= ⟨name, types*, required, skipCheck⟩
```

For a test suite `t`, conformance is:

```text
TypePass(I, t) ⇔ PropsEq(sortByName(eval_props(actual)), sortByName(eval_props(expected)))
```

## 1.1.1. Input Type Surface

The covered input fragment is modeled by:

```text
PropDecl         ::= RequiredProp | OptionalProp
TypeExpr         ::= LiteralType | InterfaceRef | Intersection | Union | ModelDecl
LiteralType      ::= "{" PropDecl* "}"
Intersection     ::= TypeExpr "&" TypeExpr
Union            ::= TypeExpr "|" TypeExpr
ModelDecl        ::= defineModel invocation surface visible to compile_script
```

Only covered input fragments promoted into local executable test suites are normative.

## 1.2. Runtime-Prop Data Model

The normalized observable output is:

```text
RuntimeProp ::= ⟨name, constructors*, required, skipCheck⟩
Constructor ::= String | Number | Boolean | Object | Array | Function | Symbol | null
```

For comparison, constructor sets are treated as unordered:

```text
RuntimePropEq(p, q) ⇔
  p.name = q.name ∧
  SetEq(p.constructors, q.constructors) ∧
  p.required = q.required ∧
  p.skipCheck = q.skipCheck
```

## 1.3. Observable Lowering Rules

The repository constrains the following abstract lowering operations:

```text
LowerLiteralProps      : TypeLiteral → RuntimeProp*
LowerInterfaceProps    : InterfaceDecl → RuntimeProp*
LowerIntersectionProps : Type* → RuntimeProp*
LowerUnionProps        : Type* → RuntimeProp*
ApplyDefaults          : RuntimeProp* × DefaultMap → RuntimeProp*
ApplyModelExpansion    : ModelDecl → RuntimeProp*
```

Only the normalized result of these operations is normative. A conforming implementation MAY use any internal type engine that yields the same observable `RuntimeProp*`.

## 2. Requirements

| ID       | Requirement                                                                                                                                                      | Test Suites                                                                                                                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `TYPE-1` | Inline type literals MUST lower into runtime props that preserve key presence and requiredness.                                                                  | [`type-evaluation.props.basic-type-literal`](../testsuites/type-evaluation/props/basic-type-literal.pkl)                                                                                                           |
| `TYPE-2` | Boolean, function, and array members MUST map to `Boolean`, `Function`, and `Array` runtime constructor families.                                                | [`type-evaluation.props.boolean-function-array`](../testsuites/type-evaluation/props/boolean-function-array.pkl)                                                                                                   |
| `TYPE-3` | Extended interfaces MUST contribute inherited members to runtime props.                                                                                          | [`type-evaluation.props.interface-extends`](../testsuites/type-evaluation/props/interface-extends.pkl)                                                                                                             |
| `TYPE-4` | Intersections MUST merge visible members from all branches. Unions MUST preserve every reachable runtime property and widen constructor families when necessary. | [`type-evaluation.props.union-intersection-props`](../testsuites/type-evaluation/props/union-intersection-props.pkl)                                                                                               |
| `TYPE-5` | When a type cannot be narrowed to a runtime constructor family, the prop MUST still remain present in runtime props with an empty constructor set.               | [`type-evaluation.props.unknown-any-null-runtime-type`](../testsuites/type-evaluation/props/unknown-any-null-runtime-type.pkl)                                                                                     |
| `TYPE-6` | `withDefaults` MUST preserve the underlying runtime constructor family of the wrapped optional props.                                                            | [`type-evaluation.props.with-defaults-literal`](../testsuites/type-evaluation/props/with-defaults-literal.pkl)                                                                                                     |
| `TYPE-7` | `defineModel` MUST contribute both the main model prop and its modifiers companion prop to runtime props.                                                        | [`type-evaluation.props.define-model-basic`](../testsuites/type-evaluation/props/define-model-basic.pkl), [`type-evaluation.props.define-model-named`](../testsuites/type-evaluation/props/define-model-named.pkl) |
| `TYPE-8` | Reactive props destructure defaults MUST preserve the underlying runtime constructor family and optionality of the declared props.                               | [`type-evaluation.props.destructure-defaults`](../testsuites/type-evaluation/props/destructure-defaults.pkl)                                                                                                       |

## 3. Inference Boundary

For curated test suites, a conforming type evaluator MUST preserve:

- prop name
- required vs optional
- runtime constructor family set, when inferable
- empty constructor sets for unknown-like cases

Test suites MAY additionally assert binding maps when macro lowering changes which names are visible to later compilation stages.

## 3.1. Normalization Rules

Before comparison, local type-evaluation test suites normalize the output by:

```text
NormalizeProps(props) ::=
  sortByName(map(props, normalizeConstructors))
```

where:

```text
normalizeConstructors(p) ::= removeConstructorOrder(p)
```

Order inside a runtime constructor set is non-normative unless a future test suite explicitly states otherwise.

## 4. Unsupported or Uncovered Constructs

When a construct is outside the curated suite:

- an implementation MAY reject it
- an implementation MAY widen it conservatively
- an implementation MUST NOT silently drop covered properties from otherwise supported inputs

## 5. Coverage Surface

Type-evaluation conformance in this repository is represented by the conjunction of:

- executable local type test suites under [`testsuites/type-evaluation/`](../testsuites/type-evaluation/)
- vendored `vuejs/core` macro and type-resolution source files under [`provenance/vendor/vuejs-core/packages/compiler-sfc/__tests__/compileScript/`](../provenance/vendor/vuejs-core/packages/compiler-sfc/__tests__/compileScript/) and [`provenance/vendor/vuejs-core/packages/compiler-sfc/__tests__/compileScript.spec.ts`](../provenance/vendor/vuejs-core/packages/compiler-sfc/__tests__/compileScript.spec.ts)
- upstream tooling traceability under [`provenance/traceability/vuejs-core.traceability.pkl`](../provenance/traceability/vuejs-core.traceability.pkl) and [`provenance/traceability/vuejs-language-tools.traceability.pkl`](../provenance/traceability/vuejs-language-tools.traceability.pkl)

`covered` entries define the current executable obligation. `planned` entries define the remaining normalization backlog for type-level behavior and MUST remain visible in provenance review.

## 6. Unsupported Surface Registry

Until explicitly promoted into a local executable test suite, the following remain provenance-tracked rather than base-language obligations:

- component-meta extraction conventions from `vuejs/language-tools`
- editor-host-dependent narrowing behavior
- TypeScript-program-dependent diagnostics whose observable contract has not yet been normalized into `RuntimeProp*`
