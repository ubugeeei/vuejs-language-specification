# Specification Index

This directory contains the written specification layer for the repository.

The specification uses the following document classes:

- normative
  - statements that define required behavior for conforming implementations
- explanatory
  - rationale, boundaries, and design guidance for readers and implementers
- registry
  - indices that connect the written specification to machine-readable test suites and upstream evidence

## Document Set

- `00-formal-notation.md`
  - domains, judgments, and equality relations shared by the normative chapters
- `01-conformance-model.md`
  - conformance classes, portability boundaries, profiles, diagnostics, and versioning
- `02-sfc-syntax.md`
  - SFC structure, block semantics, and descriptor-level parsing rules
- `03-template-and-compiler.md`
  - template parsing, directive semantics, compiler transforms, and code generation invariants
- `compiler/ast.md`
  - portable AST model and stability rules for non-source-compatible implementations
- `04-type-evaluation.md`
  - script macro semantics and runtime type inference rules
- `05-runtime-conformance.md`
  - DOM-observable behavior and the JavaScript runtime reference harness
- `06-benchmark-methodology.md`
  - benchmark taxonomy, reporting, and reproducibility constraints
- `07-upstream-provenance.md`
  - how upstream tests and issue references are turned into suite evidence

## Normative Conventions

- `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, and `MAY` are used with their RFC 2119 meaning.
- Symbolic judgments and algebraic definitions use the notation defined in `00-formal-notation.md`.
- The machine-readable suites under `testsuites/` are normative whenever a document explicitly references them.
- Implementation internals are non-normative unless an observable output depends on them.
- Experimental profiles, including Vapor, are only normative when a test suite or document explicitly marks them as part of that profile.
