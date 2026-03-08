# Requirement Matrix Model

## 1. Purpose

Requirement matrices in the normative Markdown chapters are not editorial decoration. They are part of the maintained conformance artifact surface.

Each matrix row binds:

- one normative requirement identifier
- one normative statement
- one or more executable local test suites

## 2. Concrete Syntax

The repository-standard row shape is:

```text
| `RequirementId` | Normative statement | [LocalTestSuiteId](LocalArtifactPath), ... |
```

Formally:

```text
RequirementId      ::= Upper (Upper | Digit | "-")*
RequirementStmt    ::= non-empty markdown text
PklSuitePath       ::= "../testsuites/" Segment "/" Segment "/" Segment ".pkl"
RuntimeSuitePath   ::= "../runtime/testsuites/" Segment ".ts"
RequirementLink    ::= ⟨label, path⟩
RequirementRow     ::= ⟨id, stmt, links+⟩
RequirementMatrix  ::= RequirementRow*
```

`Segment` is any repository path segment without `/`.

## 3. Well-Formedness

A requirement matrix is well-formed iff:

```text
WellFormedRequirementRow(r) ⇔
  NonEmpty(r.id) ∧
  NonEmpty(r.stmt) ∧
  Distinct(Paths(r.links)) ∧
  ∀ l ∈ r.links . LocalExecutableArtifact(l.path)

WellFormedRequirementCorpus(R) ⇔
  ∀ r ∈ R . WellFormedRequirementRow(r) ∧
  Distinct({ r.id | r ∈ R }) ∧
  ∀ a ∈ LocalExecutableArtifacts . ∃ r ∈ R . a ∈ Paths(r.links)
```

Where:

```text
LocalExecutableArtifact(path) ⇔ PklSuitePath(path) ∨ RuntimeSuitePath(path)
```

## 4. Binding Rule

The link label of every requirement reference MUST equal the canonical local artifact identifier resolved from the target file.

Formally:

```text
BindLabel(path) =
  if PklSuitePath(path) then EvalPkl(path).id
  else ExtractRuntimeSuiteId(path)

RequirementBindingOk(r) ⇔ ∀ l ∈ r.links . l.label = BindLabel(l.path)
```

This rule prevents drift between prose-facing labels and machine-readable artifact ids.

## 5. Validation Obligations

The repository validator MUST reject any state where:

- a required normative chapter has no requirement rows
- a requirement id is duplicated
- a requirement row links a missing artifact
- a requirement row links a non-executable local artifact
- a requirement row repeats the same artifact path
- a local executable artifact is not linked from any requirement row
- a requirement link label does not equal the target artifact id

These obligations are implemented by [`src/requirements.ts`](../src/requirements.ts), [`src/validate.ts`](../src/validate.ts), and [`test/validation.spec.ts`](../test/validation.spec.ts).

## 6. Conformance Boundary

The requirement matrix does not redefine implementation semantics by itself. Instead, it defines the normative mapping:

```text
RequirementId ↔ ExecutableLocalTestSuite+
```

An implementation claim remains governed by the semantic chapters and executable artifact results. The matrix guarantees that every local executable artifact is justified by at least one normative requirement and that every normative requirement row remains mechanically traceable to executable evidence.
