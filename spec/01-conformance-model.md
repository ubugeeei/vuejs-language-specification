# Conformance Model

## 1. Declared Target

A conformance claim for this repository MUST declare one or more target classes:

1. `parser`
2. `syntax`
3. `compiler`
4. `type-evaluation`
5. `runtime`
6. `benchmark`

An implementation MAY conform to a proper subset of the targets above. It MUST NOT imply full-suite conformance when only a subset is implemented.

## 1.1. Formal Conformance Predicate

Using the notation from [`00-formal-notation.md`](./00-formal-notation.md):

```text
Claim(I) = ⟨Targets, Profiles⟩
```

A conformance claim is valid iff:

```text
ValidClaim(I) ⇔
  Targets ≠ ∅ ∧
  ∀ T ∈ Targets. ∀ P ∈ Profiles(T). I ⊨target T under profile P
```

An implementation MUST NOT claim `I ⊨target T` unless every `covered` test suite for `T` and the claimed profile set passes.

The normative binding from requirement identifiers to executable local test suites is defined by the validated requirement matrices in [`09-requirement-matrix-model.md`](./09-requirement-matrix-model.md).

## 2. Normative Order

Normative authority is ordered as follows:

1. machine-readable test suites under [`testsuites/`](../testsuites/)
2. normative requirements under [`spec/`](./README.md)
3. vendored upstream artifacts under [`provenance/vendor/`](../provenance/vendor/)
4. traceability manifests under [`provenance/traceability/`](../provenance/traceability/)
5. provenance inventories under [`provenance/inventories/`](../provenance/inventories/)

Upstream repositories are evidence sources. They are not normative by themselves after curation into this repository.

## 2.1. Upstream Representation Completeness

Every inventoried upstream test or benchmark MUST be represented by exactly one generated traceability entry under [`provenance/traceability/`](../provenance/traceability/).

When a repository has a vendored corpus under [`provenance/vendor/`](../provenance/vendor/), that corpus MUST preserve the exact upstream commit, file path, case title inventory, and raw source bytes for the copied evidence.

Each traceability entry MUST declare exactly one status:

- `covered`
- `planned`
- `tracked`

`covered` means the upstream behavior is backed by one or more executable local test suites.
`planned` means the upstream behavior is within the intended executable suite but has not yet been normalized into a local test suite.
`tracked` means the upstream behavior is intentionally represented only as provenance because it depends on host, editor, application, or visual-regression context.

## 3. Profiles

The base language is the shared Vue surface curated against `vuejs/core` mainline behavior.

A profile:

- MUST declare `profile`
- MUST identify the upstream branch or snapshot it was derived from
- MUST NOT silently override the meaning of a base-language test suite

`Vapor` is modeled as a profile, not as part of the default base line, because its upstream source of truth lives on Vue minor branches rather than the default stable mainline.

## 4. Observability Boundary

This repository only standardizes observable outcomes. A conforming implementation MUST preserve, where covered:

- descriptor structure
- parser AST facts
- compiler helper sets and codegen invariants
- runtime prop inference
- DOM-observable runtime behavior
- benchmark workload definitions and result shape

Implementation-private details remain non-normative unless promoted into observable output by a curated test suite.

Formally, for any executable test suite `t`, only the asserted projection `Proj(t)` is normative:

```text
Pass(I, t) ⇔ Proj_actual(I, t) = Proj_expected(t)
```

No additional implementation state is normative unless `Proj(t)` names it.

## 5. Diagnostics

Diagnostics do not need byte-for-byte identical text. When a test suite asserts diagnostics, a conforming implementation MUST preserve:

- severity
- stable error code, when the test suite names one
- primary source location

## 6. Portability Rules

All non-runtime suites MUST remain language-neutral:

- source-of-truth test-suite data MUST be stored as Pkl modules, text fixtures, or copied source artifacts
- expectations MUST target structured observables rather than engine-specific object identity
- copied upstream artifacts MUST be committed into this repository when they are part of the curated source of truth

The runtime suite MAY use the JavaScript reference harness, but its assertions MUST still be expressed in DOM or state terms.

## 7. Suite Map

| Target            | Normative document                                             | Primary Test-Suite Roots                                        |
| ----------------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| `parser`          | [`02-sfc-syntax.md`](./02-sfc-syntax.md)                       | [`testsuites/parser/template/`](../testsuites/parser/template/) |
| `syntax`          | [`02-sfc-syntax.md`](./02-sfc-syntax.md)                       | [`testsuites/syntax/sfc/`](../testsuites/syntax/sfc/)           |
| `compiler`        | [`03-template-and-compiler.md`](./03-template-and-compiler.md) | [`testsuites/compiler/`](../testsuites/compiler/)               |
| `type-evaluation` | [`04-type-evaluation.md`](./04-type-evaluation.md)             | [`testsuites/type-evaluation/`](../testsuites/type-evaluation/) |
| `runtime`         | [`05-runtime-conformance.md`](./05-runtime-conformance.md)     | [`runtime/testsuites/`](../runtime/testsuites/)                 |
| `benchmark`       | [`06-benchmark-methodology.md`](./06-benchmark-methodology.md) | [`testsuites/benchmark/`](../testsuites/benchmark/)             |
