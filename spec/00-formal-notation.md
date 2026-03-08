# Formal Notation

## 1. Domains

This repository uses the following abstract domains:

```text
Impl        ::= an implementation under test
Target      ::= parser | syntax | compiler | type-evaluation | runtime | benchmark
Profile     ::= base | identifier
LocalTestSuiteId ::= repository-local executable test-suite identifier
UpstreamCase ::= ⟨repository, source, caseName⟩
Status      ::= covered | planned | tracked
```

`LocalTestSuiteId` names this repository's executable artifacts.
`UpstreamCase` names an inventoried upstream test or benchmark title inside a vendored or inventoried source file.

## 1.1. Observable Values

Observable data used by the specification is modeled by:

```text
Source       ::= UTF-8 text
Code         ::= Source
Identifier   ::= non-empty text token
Pointer      ::= JSON Pointer
SourceSpan   ::= ⟨offset, line, column⟩
Diagnostic   ::= ⟨class, code?, primarySpan?, message, codeframe?⟩
Warning      ::= ⟨message⟩
Projection   ::= finite mapping from selector to observable value
Env          ::= execution environment visible to a test suite
```

`SourceSpan` is used only when a test suite explicitly asserts location-bearing behavior.

## 1.2. Normalization Operators

Unless a chapter overrides them, the following normalizations are available:

```text
normalizeNewlines : Source → Source
sortByName        : Sequence<⟨name, ...⟩> → Sequence<⟨name, ...⟩>
dedupeSetLike     : Sequence<Value> → Sequence<Value>
```

These operators are observable only through the equality relations defined below.

## 2. Core Judgments

The written specification uses the following judgment forms:

```text
I ⊨target T
```

`I` conforms to target `T`.

```text
parse_sfc : Source → Descriptor
parse_tpl_base : Source × ParserOptions → ⟨TemplateAst, Error*⟩
parse_tpl_dom : Source × ParserOptions → ⟨TemplateAst, Error*⟩
compile_tpl : Template × CompileOptions → ⟨TemplateAst, HelperSet, Code⟩
compile_script : Sfc × ScriptOptions → ⟨ComponentOptions, Bindings, Code⟩
compile_style : Css × StyleOptions → ⟨Css, Error*⟩
eval_props : Sfc × ScriptOptions → RuntimeProp*
step : RuntimeState × Action → RuntimeState
observe : RuntimeState → Observation
```

`Code` is normalized source text after newline normalization only. `Observation` is limited to the test-suite-defined observable surface.

## 2.1. Projection Operators

Each executable local test suite defines a partial observation function:

```text
Proj_t : RawResult → Projection
```

Conformance is always judged on `Proj_t`, not on unprojected implementation output:

```text
Pass(I, t) ::= Eq_t(Proj_t(run(I, t)), Proj_t(expected(t)))
```

## 3. Test-Suite Semantics

For every executable test suite `t`, define:

```text
Pass(I, t) ::= implementation I satisfies every asserted projection in t
```

For a target/profile pair, define:

```text
CoveredTestSuites(T, P) ::= { t | t is executable ∧ t.target = T ∧ t.profile ∈ {null, P} }
```

Then:

```text
I ⊨target T under profile P  ⇔  ∀ t ∈ CoveredTestSuites(T, P). Pass(I, t)
```

## 4. Upstream Representation

For each inventoried upstream case `u = UpstreamCase`, exactly one traceability entry exists:

```text
Trace(u) = ⟨status, classification, localTestSuites⟩
```

Subject to:

```text
status = covered  ⇒  localTestSuites ≠ ∅
status = planned  ⇒  u is intended for future executable normalization
status = tracked  ⇒  u remains provenance-only by explicit scope decision
```

## 5. Equality Model

Unless a test suite states otherwise, equality is defined on normalized observable projections rather than implementation-internal identity:

```text
AstEq(a, b)      ::= selected JSON-pointer projections are equal
HelperEq(a, b)   ::= helper sets are equal as unordered sets
CodeEq(a, b)     ::= normalizeNewlines(a) = normalizeNewlines(b)
PropsEq(a, b)    ::= runtime prop tuples are equal after canonical sorting by name
ObsEq(a, b)      ::= test-suite-specific observation equality
```

Substring containment is non-normative.

## 5.1. Diagnostic Equality

When diagnostics are part of the asserted projection:

```text
DiagEq(d1, d2) ::=
  d1.class = d2.class ∧
  OptionalEq(d1.code, d2.code) ∧
  OptionalEq(d1.primarySpan, d2.primarySpan) ∧
  d1.message = d2.message
```

`codeframe` is compared only when a test suite explicitly asserts it.
