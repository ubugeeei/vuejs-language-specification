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
- Track upstream evidence from `vuejs/core` tests, issue references, and copied community fixture corpora.

## Normative Map

| Area                  | Specification                                                                                                                                                                      | Primary Test Suites                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formal notation       | [`spec/00-formal-notation.md`](./spec/00-formal-notation.md)                                                                                                                       | [`spec/`](./spec/)                                                                                                                                                                           |
| Conformance model     | [`spec/01-conformance-model.md`](./spec/01-conformance-model.md)                                                                                                                   | [`testsuites/`](./testsuites/)                                                                                                                                                               |
| SFC syntax and parser | [`spec/02-sfc-syntax.md`](./spec/02-sfc-syntax.md)                                                                                                                                 | [`testsuites/syntax/sfc/`](./testsuites/syntax/sfc/), [`testsuites/parser/template/`](./testsuites/parser/template/)                                                                         |
| Compiler semantics    | [`spec/03-template-and-compiler.md`](./spec/03-template-and-compiler.md)                                                                                                           | [`testsuites/compiler/`](./testsuites/compiler/)                                                                                                                                             |
| Type evaluation       | [`spec/04-type-evaluation.md`](./spec/04-type-evaluation.md)                                                                                                                       | [`testsuites/type-evaluation/`](./testsuites/type-evaluation/)                                                                                                                               |
| Runtime conformance   | [`spec/05-runtime-conformance.md`](./spec/05-runtime-conformance.md)                                                                                                               | [`runtime/testsuites/`](./runtime/testsuites/)                                                                                                                                               |
| Benchmark methodology | [`spec/06-benchmark-methodology.md`](./spec/06-benchmark-methodology.md)                                                                                                           | [`testsuites/benchmark/`](./testsuites/benchmark/)                                                                                                                                           |
| Upstream provenance   | [`spec/07-upstream-provenance.md`](./spec/07-upstream-provenance.md)                                                                                                               | [`provenance/vendor/`](./provenance/vendor/), [`provenance/traceability/`](./provenance/traceability/)                                                                                       |
| Artifact model        | [`spec/08-test-suite-artifact-model.md`](./spec/08-test-suite-artifact-model.md)                                                                                                   | [`testsuites/`](./testsuites/), [`runtime/testsuites/`](./runtime/testsuites/), [`test/validation.spec.ts`](./test/validation.spec.ts)                                                       |
| Requirement matrix    | [`spec/09-requirement-matrix-model.md`](./spec/09-requirement-matrix-model.md)                                                                                                     | [`spec/`](./spec/), [`testsuites/`](./testsuites/), [`runtime/testsuites/`](./runtime/testsuites/)                                                                                           |
| Imported input corpus | [`spec/10-imported-parser-input-corpus.md`](./spec/10-imported-parser-input-corpus.md), [`spec/11-imported-compiler-input-corpus.md`](./spec/11-imported-compiler-input-corpus.md) | [`testsuites/parser/template/`](./testsuites/parser/template/), [`testsuites/compiler/template/`](./testsuites/compiler/template/), [`testsuites/compiler/sfc/`](./testsuites/compiler/sfc/) |

Each normative chapter uses explicit `MUST`/`MAY` requirements and links to the corresponding test suites that operationalize that requirement.
Those links are part of the maintained artifact surface and are validated against local executable test suites.
Normative chapter shape is also validated so that required formal sections stay present over time.

The artifact-model chapter additionally defines repository-level structural invariants for local executable test suites. Those invariants are enforced by the validator and repository verification tests.

## Scope

- `parser`
  - template AST shape, directive/attribute classification, interpolation nodes, recoverable parse diagnostics, parser option semantics, text modes, and DOM namespace behavior
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
  - machine-readable conformance test suites written in Pkl for syntax, parser, compiler, type evaluation, and benchmark coverage
- `runtime/`
  - JavaScript-only runtime harness modules and source-first runtime test suites
- `schemas/`
  - Pkl schema modules that define every machine-readable suite
- `provenance/inventories/`
  - generated inventories derived from upstream tests and issue references
- `provenance/vendor/vuejs-core/`
  - vendored raw `vuejs/core` test and benchmark source files plus a manifest that keeps provenance local to this repository
- `provenance/vendor/ubugeeei-vize/`
  - copied community fixture/test source files and manifests used as local input corpora
- `provenance/traceability/`
  - generated Pkl manifests that represent every inventoried upstream test or benchmark with status `covered`, `planned`, or `tracked`
- `provenance/vendor/vize/`
  - copied snapshot assets retained for provisional/profile-specific or historical provenance
- `fixtures/benchmarks/`
  - reusable benchmark inputs
- `src/`
  - package API, CLI, validators, and benchmark orchestration
- `test/`
  - repository verification for schemas, reference execution, and smoke benchmarks

## Package Model

The npm package ships:

- raw specification assets (`spec/`, `testsuites/`, `runtime/`, `schemas/`, `provenance/`)
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
npx vue-language-spec requirements
npx vue-language-spec coverage --repository vuejs/language-tools
npx vue-language-spec traceability --repository vuejs/core
npx vue-language-spec benchmark --smoke
```

## Provenance

The initial suite is curated from:

- `vuejs/core` compiler, runtime, reactivity, and SFC tests
- `vuejs/language-tools` component-meta, language server, and type-check oriented tests
- issue references embedded in those upstream tests
- copied community SFC, CSS, playground, and benchmark-oriented tests

Generated inventories are committed under `provenance/inventories/` and can be refreshed with `scripts/generate-upstream-inventory.ts`.
Vendored `vuejs/core` test and benchmark source files are committed under `provenance/vendor/vuejs-core/` and can be refreshed with `npm run vendor:vue-core:tests`.
Copied community test and fixture source files are committed under `provenance/vendor/ubugeeei-vize/` and can be refreshed with `npm run vendor:vize:tests`.
Imported parser/compiler suites can be refreshed with `npm run generate:imported:testsuites`.
That generator consumes the copied local corpus under [`provenance/vendor/ubugeeei-vize/`](./provenance/vendor/ubugeeei-vize/). Default-profile parser/compiler expectations are derived from the official `vuejs/core` implementation and stored statically; copied snapshots under [`provenance/vendor/vize/tests/expected/`](./provenance/vendor/vize/tests/expected/) remain only for provisional Vapor coverage and provenance.
Generated traceability manifests are committed under `provenance/traceability/` and can be refreshed with `npm run generate:traceability`.
Copied snapshot assets are committed under `provenance/vendor/vize/tests/expected/` and can be refreshed with `npm run vendor:vize:snapshots`.
Stable catalog and requirement id manifests are committed under `provenance/stability/` and can be refreshed with `npm run generate:stability`.
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
The current imported fixture lift already includes parser suites, base compiler suites, SFC suites, and profile-scoped Vapor compiler suites. Default-profile expectations come from the official `vuejs/core` oracle; Vapor remains provisional until an official oracle is vendored.
