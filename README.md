# Vue.js Language Specification

`@ubugeeei/vuejs-language-specification` is a specification-first repository for Vue.js syntax, compiler behavior, type evaluation, runtime conformance, and benchmark workloads.

The project has two complementary outputs:

1. A canonical GitHub-hosted repository snapshot, versioned by immutable Git tags, that defines observable behavior, portability boundaries, machine-readable conformance suites, schemas, and provenance.
2. JavaScript-oriented tooling in the repository for validation, cataloging, smoke benchmarking, and the runtime reference harness.

## Motivation

This work started alongside implementing Vize and trying to make Vue behavior reviewable without forcing every implementation to read `vuejs/core` internals directly.

As independent implementations continue to appear across languages and execution models, including Vue runtime (VDOM), Vue Vapor, `vuejs/vue-jsx-vapor`, Vize, Golar, and Verter, there is increasing value in a shared conformance foundation similar to `test262`.

That need becomes more important in the current Agentic Coding trend. Rich suites, especially edge cases, are increasingly part of the practical implementation contract.

## Maturity

This repository is still early.

- it has not yet gone through exhaustive review
- some parts may still be overbuilt from a maintenance perspective
- the useful part already exists now: parsers, compilers, and runtime-adjacent tooling can already reuse curated suites, provenance, and requirement mappings

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
| Runtime conformance   | [`spec/05-runtime-conformance.md`](./spec/05-runtime-conformance.md)                                                                                                               | [`testsuites/runtime/`](./testsuites/runtime/)                                                                                                                                               |
| Benchmark methodology | [`spec/06-benchmark-methodology.md`](./spec/06-benchmark-methodology.md)                                                                                                           | [`testsuites/benchmark/`](./testsuites/benchmark/)                                                                                                                                           |
| Upstream provenance   | [`spec/07-upstream-provenance.md`](./spec/07-upstream-provenance.md)                                                                                                               | [`provenance/vendor/`](./provenance/vendor/), [`provenance/traceability/`](./provenance/traceability/)                                                                                       |
| Artifact model        | [`spec/08-test-suite-artifact-model.md`](./spec/08-test-suite-artifact-model.md)                                                                                                   | [`testsuites/`](./testsuites/), [`testsuites/runtime/`](./testsuites/runtime/), [`verification/repository-validation.spec.ts`](./verification/repository-validation.spec.ts)                 |
| Requirement matrix    | [`spec/09-requirement-matrix-model.md`](./spec/09-requirement-matrix-model.md)                                                                                                     | [`spec/`](./spec/), [`testsuites/`](./testsuites/), [`testsuites/runtime/`](./testsuites/runtime/)                                                                                           |
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

The next planned profile-facing provenance input is `vuejs/vue-jsx-vapor`. It should land as explicit profile-scoped compiler and runtime coverage rather than being merged into the base line implicitly.

## Distribution Model

This repository should be consumed like a conformance corpus, not like a package-registry library.

- The canonical distribution unit is the GitHub Release corpus archive attached to each version tag.
- Implementations should pin a specific tag and vendor or unpack the GitHub archive locally.
- The canonical release manifest lives at [`provenance/releases/current.json`](./provenance/releases/current.json).
- The language specification and machine-readable test suites are usable directly from the archive without package-registry publication or install.
- JavaScript tooling is run from a checkout or unpacked snapshot today.

## Directory Architecture

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the directory map, generation flow, and placement rules.

The short version:

| Layer                  | Paths                                                                      | Purpose                                                             |
| ---------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Release corpus         | `spec/`, `testsuites/`, `schemas/`, `runtime/`, `provenance/`, `fixtures/` | Stable artifacts downstream implementations can vendor.             |
| Repository machinery   | `src/`, `scripts/`, `verification/`, `.github/`                            | Code that generates, validates, and publishes the corpus.           |
| Generated local output | `dist/`, `node_modules/`                                                   | Local build and dependency output; not part of the corpus contract. |

Key distinction: `testsuites/` is shared conformance data; `verification/` is this repository's own Vitest-based self-check layer.

## Toolchain

Repository maintenance is standardized on:

- Node.js 24+
- `vp` (VITE+)
- `oxfmt`
- `oxlint --type-aware --type-check`
- Vitest Browser Mode with Playwright for DOM-observable runtime verification

## GitHub Release Corpus

Each GitHub Release publishes a canonical corpus archive named `vuejs-language-specification-v{version}-corpus.tar.gz`.
It ships the immediately vendorable conformance surface:

- the repository architecture guide at `ARCHITECTURE.md`
- language specification chapters under `spec/`
- machine-readable test suites under `testsuites/`
- Pkl schemas under `schemas/`
- upstream provenance and release metadata under `provenance/`
- JavaScript runtime harness sources under `runtime/`
- benchmark fixtures under `fixtures/`
- the canonical release manifest at `provenance/releases/current.json`

Download a tagged corpus archive:

```bash
curl -LO https://github.com/ubugeeei/vuejs-language-specification/releases/download/v0.1.1/vuejs-language-specification-v0.1.1-corpus.tar.gz
tar -xzf vuejs-language-specification-v0.1.1-corpus.tar.gz -C vendor
```

The same release also has a checksum file:

```bash
curl -LO https://github.com/ubugeeei/vuejs-language-specification/releases/download/v0.1.1/vuejs-language-specification-v0.1.1-corpus.tar.gz.sha256
shasum -a 256 -c vuejs-language-specification-v0.1.1-corpus.tar.gz.sha256
```

## Local Tooling

The repository also contains JavaScript tooling for validation, catalog generation, traceability reports, and smoke benchmarking.
Run it from a checkout:

```bash
vp install --frozen-lockfile
vp run validate
vp run manifest
vp run catalog --suite compiler
vp run coverage:upstream --repository vuejs/language-tools
vp run traceability:upstream --repository vuejs/core
vp run benchmark:smoke
```

## Provenance

The initial suite is curated from:

- `vuejs/core` compiler, runtime, reactivity, and SFC tests
- `vuejs/language-tools` component-meta, language server, and type-check oriented tests
- issue references embedded in those upstream tests
- copied community SFC, CSS, playground, and benchmark-oriented tests

Generated inventories are committed under `provenance/inventories/` and can be refreshed with `scripts/generate-upstream-inventory.ts`.
Vendored `vuejs/core` test and benchmark source files are committed under `provenance/vendor/vuejs-core/` and can be refreshed with `vp run vendor:vue-core:tests`.
Copied community test and fixture source files are committed under `provenance/vendor/ubugeeei-vize/` and can be refreshed with `vp run vendor:vize:tests`.
Imported parser/compiler suites can be refreshed with `vp run generate:imported:testsuites`.
That generator consumes the copied local corpus under [`provenance/vendor/ubugeeei-vize/`](./provenance/vendor/ubugeeei-vize/). Default-profile parser/compiler expectations are derived from the official `vuejs/core` implementation and stored statically; copied snapshots under [`provenance/vendor/vize/tests/expected/`](./provenance/vendor/vize/tests/expected/) remain only for provisional Vapor coverage and provenance.
Generated traceability manifests are committed under `provenance/traceability/` and can be refreshed with `vp run generate:traceability`.
Copied snapshot assets are committed under `provenance/vendor/vize/tests/expected/` and can be refreshed with `vp run vendor:vize:snapshots`.
Stable catalog and requirement id manifests are committed under `provenance/stability/` and can be refreshed with `vp run generate:stability`.
`vp run coverage:upstream` reports which inventoried upstream cases are already covered by executable local test suites.
`vp run traceability:upstream` summarizes how every inventoried upstream case is represented:

- `covered`
  - backed by one or more executable local test suites
- `planned`
  - within scope for eventual executable conformance coverage
- `tracked`
  - intentionally represented only in the traceability layer because the behavior is host-, editor-, app-, or visual-regression-specific

## Status

This repository is structured to be distributed as a GitHub-hosted canonical conformance snapshot now. The current version focuses on:

- a durable suite format
- strong provenance
- a vendored `vuejs/core` test corpus for local-first provenance
- exact `compileScript` macro coverage for `defineOptions`, `defineExpose`, and `defineSlots`
- linked normative requirements across syntax, compiler, type evaluation, and runtime
- structured, exact assertions rather than substring matching
- Browser Mode runtime validation for DOM-observable behavior, including `v-model` text, checkbox, radio, and select coverage

The next increments should continue expanding upstream-derived coverage, especially for issue regressions and profile-specific suites such as Vapor and `vuejs/vue-jsx-vapor`.
The current imported fixture lift already includes parser suites, base compiler suites, runtime/compiler-adjacent suites, and profile-scoped Vapor compiler suites. Default-profile expectations come from the official `vuejs/core` oracle; Vapor remains provisional until an official oracle is vendored.
