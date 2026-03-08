# Test-Suite Artifact Model

## 1. Scope

This chapter defines the machine-readable artifact contract for local executable test suites in this repository.

It covers:

- Pkl executable test suites under [`testsuites/`](../testsuites/)
- JavaScript runtime test suites under [`runtime/testsuites/`](../runtime/testsuites/)
- repository-level validation obligations enforced by [`src/validate.ts`](../src/validate.ts) and [`test/validation.spec.ts`](../test/validation.spec.ts)

It does not redefine the semantic obligations of parser, compiler, type-evaluation, runtime, or benchmark behavior. Those remain defined by the target-specific chapters.
The mapping from semantic requirements to these artifacts is defined separately by [`09-requirement-matrix-model.md`](./09-requirement-matrix-model.md).

## 2. Artifact Domains

The local artifact layer is modeled by:

```text
PklSuitePath     ::= "testsuites/" SuiteName "/" Group "/" Name ".pkl"
RuntimeSuitePath ::= "runtime/testsuites/" Name ".ts"

PklSuiteId       ::= SuiteName "." Group "." Name
RuntimeSuiteId   ::= "runtime." Segment ("." Segment)+

FeatureId        ::= identifier describing an observable behavior family
```

The repository distinguishes:

```text
LocalExecutableArtifact ::= PklExecutableTestSuite | RuntimeExecutableTestSuite
```

where:

```text
PklExecutableTestSuite     ::= ⟨id, suite, kind, title, summary, features*, inputOrigin?, oracle?, upstream*, profile?, vendoredSnapshot?⟩
RuntimeExecutableTestSuite ::= ⟨id, title, summary, environment, features*, upstream*, input, run⟩
RuntimeSourceInput         ::= SfcRuntimeInput
SfcRuntimeInput            ::= ⟨kind = "sfc", filename, source⟩
VendoredSnapshot           ::= ⟨output, options?⟩
```

## 3. Well-Formedness

### 3.1. Pkl Test Suites

For a Pkl test suite stored at path `p` with decoded value `t`, define:

```text
PathId(p)       ::= SuiteName "." Group "." Name
PathSuite(p)    ::= SuiteName
SchemaSuite(t)  ::= suite field stored in t
```

Then:

```text
WellFormedPklSuite(p, t) ⇔
  t.id = PathId(p) ∧
  t.suite = PathSuite(p) ∧
  NonEmpty(t.title) ∧
  NonEmpty(t.summary) ∧
  t.features ≠ ∅ ∧
  Distinct(t.features) ∧
  t.upstream ≠ ∅ ∧
  ∀ u ∈ t.upstream. WellFormedUpstreamSelector(u) ∧
  WellFormedImportedOracle(t) ∧
  WellFormedVendoredSnapshot(t)
```

where:

```text
WellFormedImportedOracle(t) ⇔
  t.inputOrigin = ⊥ ∧ t.oracle = ⊥
    ∨
  NonEmpty(t.inputOrigin.copiedPath) ∧
  NonEmpty(t.inputOrigin.source) ∧
  NonEmpty(t.inputOrigin.caseName) ∧
  FileExists(t.inputOrigin.copiedPath) ∧
  NonEmpty(t.oracle.repository) ∧
  NonEmpty(t.oracle.moduleName) ∧
  NonEmpty(t.oracle.operation)
```

where:

```text
WellFormedVendoredSnapshot(t) ⇔
  t.expect.vendoredSnapshotOutput = ⊥
    ∨
  ∃ u ∈ t.upstream.
    u.repository = "ubugeeei/vize" ∧
    Prefix(u.source, "tests/fixtures/") ∧
    CopiedSnapshotExists(u.source, Head(u.cases)) ∧
    SnapshotInputEq(t, u.source, Head(u.cases)) ∧
    SnapshotOutputEq(t, u.source, Head(u.cases))
```

Additionally, if `t.oracle.repository = "vuejs/core"` and `t.oracle.provisional ≠ true`, then `t.kind` MUST NOT be a snapshot-only kind and `t.expect.vendoredSnapshotOutput` MUST be `⊥`.

Additionally, the first non-blank line of every Pkl test suite MUST amend the canonical suite schema:

```text
SyntaxTestSuite         → schemas/SyntaxTestSuite.pkl
ParserTestSuite         → schemas/ParserTestSuite.pkl
CompilerTestSuite       → schemas/CompilerTestSuite.pkl
TypeEvaluationTestSuite → schemas/TypeEvaluationTestSuite.pkl
BenchmarkTestSuite      → schemas/BenchmarkTestSuite.pkl
```

### 3.2. Runtime Test Suites

For a runtime test suite value `r`, define:

```text
WellFormedRuntimeSuite(r) ⇔
  Prefix(r.id, "runtime.") ∧
  NonEmpty(r.title) ∧
  NonEmpty(r.summary) ∧
  r.features ≠ ∅ ∧
  Distinct(r.features) ∧
  r.upstream ≠ ∅ ∧
  ∀ u ∈ r.upstream. WellFormedUpstreamSelector(u) ∧
  WellFormedRuntimeInput(r.input)
```

where:

```text
WellFormedRuntimeInput(i) ⇔
  i.kind = "sfc" ∧
  NonEmpty(i.filename) ∧
  Suffix(i.filename, ".vue") ∧
  NonEmpty(i.source) ∧
  Contains(i.source, "<template>")
```

Each runtime test-suite module under [`runtime/testsuites/`](../runtime/testsuites/) MUST export exactly one canonical binding named `*TestSuite` whose value satisfies `WellFormedRuntimeSuite`.

### 3.3. Upstream Selectors

For any local executable artifact, upstream selectors are well-formed iff:

```text
WellFormedUpstreamSelector(u) ⇔
  NonEmpty(u.repository) ∧
  NonEmpty(u.source) ∧
  (u.cases ≠ ∅ ∨ u.issues ≠ ∅) ∧
  Distinct(u.cases) ∧
  Distinct(u.issues)
```

The term `cases` is preserved here because it refers to upstream-inventoried test or benchmark titles, not local test suites.

## 4. Repository Invariants

The repository MUST satisfy:

```text
Distinct({ t.id | t ∈ PklExecutableTestSuites })
Distinct({ r.id | r ∈ RuntimeExecutableTestSuites })
```

Legacy local naming forms are forbidden:

```text
"cases/"
"src/runtime/cases/"
"discoverCaseFiles"
"loadGenericCases"
"validateCases"
"runBenchmarkCase"
"runCompilerReferenceCase"
"runParserReferenceCase"
"runSyntaxReferenceCase"
"runTypeEvaluationReferenceCase"
"runtimeCases"
"browserRuntimeCases"
"nodeRuntimeCases"
"runRuntimeCases"
```

These names MUST NOT appear in the maintained local artifact surface, because this repository standardizes `test suite` as the local executable concept.

## 5. Validation Obligations

The reference validator MUST reject any repository state that violates:

- `WellFormedPklSuite`
- `WellFormedRuntimeSuite`
- canonical schema amendment
- local executable id uniqueness
- canonical local naming rules
- copied snapshot equality for snapshot-backed suites
- runtime source-input well-formedness

Those checks are operationalized by:

- [`src/validate.ts`](../src/validate.ts)
- [`test/validation.spec.ts`](../test/validation.spec.ts)

## 6. Conformance Boundary

Artifact well-formedness is necessary but not sufficient for semantic conformance.

Formally:

```text
WellFormedRepository(R) ⇏ SemanticConformance(I)
SemanticConformance(I) ⇏ permission to ignore WellFormedRepository(R)
```

An implementation claim depends on both:

```text
RepositoryWellFormed ∧ ExecutableTestSuitePass
```

The artifact model therefore acts as a structural precondition for every target-specific claim.
