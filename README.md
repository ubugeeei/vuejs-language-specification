# Vue.js Language Specification

`@ubugeeei/vuejs-language-specification` is a specification-first repository for Vue.js syntax, compiler behavior, type evaluation, runtime conformance, and benchmark workloads.

The project has two equally important outputs:

1. A written specification that defines observable behavior and portability boundaries.
2. A distributable npm package that ships machine-readable conformance test suites, Pkl schema modules, provenance metadata, and a JavaScript reference harness.

## Goals

- Define Vue.js behavior in a form that is reviewable without reading a specific implementation.
- Provide cross-implementation conformance test suites for parsers, compilers, type evaluators, and tooling.
- Keep non-runtime suites language-neutral so Rust, Go, Zig, Java, and JavaScript implementations can share the same source of truth.
- Preserve runtime coverage with a JavaScript reference harness for DOM-observable behavior.
- Track upstream evidence from `vuejs/core` tests, issue references, and `ubugeeei/vize` tests.

## Normative Map

| Area                  | Specification                                                            | Primary Test Suites                                                                                                  |
| --------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Formal notation       | [`spec/00-formal-notation.md`](./spec/00-formal-notation.md)             | [`spec/`](./spec/)                                                                                                   |
| Conformance model     | [`spec/01-conformance-model.md`](./spec/01-conformance-model.md)         | [`testsuites/`](./testsuites/)                                                                                       |
| SFC syntax and parser | [`spec/02-sfc-syntax.md`](./spec/02-sfc-syntax.md)                       | [`testsuites/syntax/sfc/`](./testsuites/syntax/sfc/), [`testsuites/parser/template/`](./testsuites/parser/template/) |
| Compiler semantics    | [`spec/03-template-and-compiler.md`](./spec/03-template-and-compiler.md) | [`testsuites/compiler/`](./testsuites/compiler/)                                                                     |
| Type evaluation       | [`spec/04-type-evaluation.md`](./spec/04-type-evaluation.md)             | [`testsuites/type-evaluation/`](./testsuites/type-evaluation/)                                                       |
| Runtime conformance   | [`spec/05-runtime-conformance.md`](./spec/05-runtime-conformance.md)     | [`src/runtime/testsuites/`](./src/runtime/testsuites/)                                                               |
| Benchmark methodology | [`spec/06-benchmark-methodology.md`](./spec/06-benchmark-methodology.md) | [`testsuites/benchmark/`](./testsuites/benchmark/)                                                                   |
| Upstream provenance   | [`spec/07-upstream-provenance.md`](./spec/07-upstream-provenance.md)     | [`sources/copied/`](./sources/copied/), [`sources/traceability/`](./sources/traceability/)                           |

Each normative chapter uses explicit `MUST`/`MAY` requirements and links to the corresponding test suites that operationalize that requirement.

## Scope

- `parser`
  - template AST shape, directive/attribute classification, interpolation nodes, and recoverable parse diagnostics
- `syntax`
  - SFC block structure, template surface syntax, style block semantics, descriptor-level parsing.
- `compiler`
  - Template transforms, script compilation, scoped style output, code generation invariants.
- `type-evaluation`
  - `defineProps`, macro-driven runtime type inference, union/intersection merging, defaulting behavior.
- `runtime`
  - DOM-observable behavior, events, `v-model`, slots, lifecycle, keyed children, provide/inject, and selected reactivity edge cases.
- `benchmark`
  - Stable workload descriptions for compiler throughput and reactivity pressure tests.

## Non-Goals

- Replacing `vuejs/core` as the reference implementation.
- Defining every internal optimization detail as normative behavior.
- Treating experimental profiles as if they were already part of the stable base language.

## Vapor Profile

`Vapor` is intentionally treated as a separate profile. It does not currently live on the default `vuejs/core` line in a stable, always-on form, so this repository models it as an opt-in compatibility layer that is versioned against the relevant Vue minor branch snapshot rather than against `main`.

The base specification in this repository is therefore:

- normative for the shared Vue language surface backed by `vuejs/core` mainline behavior
- extensible for additional profiles such as Vapor
- explicit about which test suites are profile-specific

## Repository Layout

- `spec/`
  - normative and semi-normative documents
- `testsuites/`
  - machine-readable conformance test suites written in Pkl, including parser, syntax, compiler, type, runtime, and benchmark coverage
- `schemas/`
  - Pkl schema modules that define every machine-readable suite
- `sources/upstream/`
  - generated inventories derived from upstream tests and issue references
- `sources/copied/vuejs-core/`
  - vendored raw `vuejs/core` test and benchmark source files plus a manifest that keeps provenance local to this repository
- `sources/traceability/`
  - generated Pkl manifests that represent every inventoried upstream test or benchmark with status `covered`, `planned`, or `tracked`
- `sources/copied/vize/`
  - vendored `ubugeeei/vize` snapshot assets copied into this repository
- `fixtures/benchmarks/`
  - reusable benchmark inputs
- `src/`
  - package API, CLI, validators, benchmark harness, and runtime reference suite
- `test/`
  - repository verification for schemas, reference execution, and smoke benchmarks

## Package Model

The npm package ships:

- raw specification assets (`spec/`, `testsuites/`, `schemas/`, `sources/`)
- a CLI for Pkl-backed validation, catalog generation, and smoke benchmarking
- a JavaScript reference harness for runtime-only suites
- Vitest Browser Mode runtime tests for DOM-observable conformance

Install:

```bash
npm install @ubugeeei/vuejs-language-specification
```

Examples:

```bash
npx vue-language-spec validate
npx vue-language-spec catalog --suite compiler
npx vue-language-spec coverage --repository vuejs/language-tools
npx vue-language-spec traceability --repository vuejs/core
npx vue-language-spec benchmark --smoke
```

## Provenance

The initial suite is curated from:

- `vuejs/core` compiler, runtime, reactivity, and SFC tests
- `vuejs/language-tools` component-meta, language server, and type-check oriented tests
- issue references embedded in those upstream tests
- `ubugeeei/vize` SFC, CSS, playground, and benchmark-oriented tests

Generated inventories are committed under `sources/upstream/` and can be refreshed with `scripts/generate-upstream-inventory.ts`.
Vendored `vuejs/core` test and benchmark source files are committed under `sources/copied/vuejs-core/` and can be refreshed with `npm run vendor:vue-core:tests`.
Generated traceability manifests are committed under `sources/traceability/` and can be refreshed with `npm run generate:traceability`.
Vendored `vize` snapshots are committed under `sources/copied/vize/tests/expected/` and can be refreshed with `npm run vendor:vize:snapshots`.
`npm run coverage:upstream` reports which inventoried upstream cases are already covered by executable local test suites.
`npm run traceability:upstream` summarizes how every inventoried upstream case is represented:

- `covered`
  - backed by one or more executable local test suites
- `planned`
  - within scope for eventual executable conformance coverage
- `tracked`
  - intentionally represented only in the traceability layer because the behavior is host-, editor-, app-, or visual-regression-specific

## Status

This repository is structured to be publishable and extensible now. The current version focuses on:

- a durable suite format
- strong provenance
- a vendored `vuejs/core` test corpus for local-first provenance
- exact `compileScript` macro coverage for `defineOptions`, `defineExpose`, and `defineSlots`
- linked normative requirements across syntax, compiler, type evaluation, and runtime
- structured, exact assertions rather than substring matching
- Browser Mode runtime validation for DOM-observable behavior, including `v-model` text, checkbox, radio, and select coverage

The next increments should continue expanding upstream-derived coverage, especially for issue regressions and profile-specific suites such as Vapor.
