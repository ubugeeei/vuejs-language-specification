# Formal Notation

## 1. Domains

This repository uses the following abstract domains:

```text
Impl        ::= an implementation under test
Target      ::= parser | syntax | compiler | type-evaluation | runtime | benchmark
Profile     ::= base | identifier
CaseId      ::= repository-local executable case identifier
RepoCase    ::= ⟨repository, source, caseName⟩
Status      ::= covered | planned | tracked
```

## 2. Core Judgments

The written specification uses the following judgment forms:

```text
I ⊨target T
```

`I` conforms to target `T`.

```text
parse_sfc : Source → Descriptor
parse_tpl : Source × ParserOptions → ⟨TemplateAst, Error*⟩
compile_tpl : Template × CompileOptions → ⟨TemplateAst, HelperSet, Code⟩
compile_script : Sfc × ScriptOptions → ⟨ComponentOptions, Bindings, Code⟩
compile_style : Css × StyleOptions → ⟨Css, Error*⟩
eval_props : Sfc × ScriptOptions → RuntimeProp*
step : RuntimeState × Action → RuntimeState
observe : RuntimeState → Observation
```

`Code` is normalized source text after newline normalization only. `Observation` is limited to the case-defined observable surface.

## 3. Case Semantics

For every executable case `c`, define:

```text
Pass(I, c) ::= implementation I satisfies every asserted projection in c
```

For a target/profile pair, define:

```text
CoveredCases(T, P) ::= { c | c is executable ∧ c.target = T ∧ c.profile ∈ {null, P} }
```

Then:

```text
I ⊨target T under profile P  ⇔  ∀ c ∈ CoveredCases(T, P). Pass(I, c)
```

## 4. Upstream Representation

For each inventoried upstream case `u = RepoCase`, exactly one traceability entry exists:

```text
Trace(u) = ⟨status, classification, localCases⟩
```

Subject to:

```text
status = covered  ⇒  localCases ≠ ∅
status = planned  ⇒  u is intended for future executable normalization
status = tracked  ⇒  u remains provenance-only by explicit scope decision
```

## 5. Equality Model

Unless a case states otherwise, equality is defined on normalized observable projections rather than implementation-internal identity:

```text
AstEq(a, b)      ::= selected JSON-pointer projections are equal
HelperEq(a, b)   ::= helper sets are equal as unordered sets
CodeEq(a, b)     ::= normalizeNewlines(a) = normalizeNewlines(b)
PropsEq(a, b)    ::= runtime prop tuples are equal after canonical sorting by name
ObsEq(a, b)      ::= case-specific observation equality
```

Substring containment is non-normative.
