# Upstream Provenance

## 1. Source Policy

This repository does not invent test suites in a vacuum. Every curated test suite should point back to at least one upstream source:

- `vuejs/core` test
- `vuejs/language-tools` test
- issue reference embedded in an upstream test
- copied community test, fixture, or benchmark source

The provenance relation is modeled as:

```text
UpstreamRef = ⟨repository, source, cases*, issues*, kind⟩
InventoryEntry = ⟨repository, commit, source, kind, line, caseName, issueLabels*⟩
```

`cases*` and `caseName` intentionally preserve upstream vocabulary because they denote upstream-inventoried test or benchmark titles, not local executable test suites.

Curated test-suite metadata MUST use repository-local selectors (`repository`, `source`, `case name`, `line`) rather than external blob URLs.

## 2. Inventories

Generated inventories live in:

- `provenance/inventories/vuejs-core.inventory.pkl`
- `provenance/inventories/vuejs-language-tools.inventory.pkl`
- `provenance/inventories/vize.inventory.pkl`
- `provenance/vendor/vuejs-core/test-corpus.pkl`
- `provenance/vendor/ubugeeei-vize/test-corpus.pkl`
- `provenance/traceability/vuejs-core.traceability.pkl`
- `provenance/traceability/vuejs-language-tools.traceability.pkl`
- `provenance/traceability/ubugeeei-vize.traceability.pkl`
- `provenance/vendor/vize/expected-snapshots.pkl`

They record:

- repository identifier
- commit hash
- discovered test and benchmark files
- extracted test titles and line locations
- extracted issue references
- vendored `vuejs/core` raw test and benchmark source files with exact byte hashes
- copied community raw test, fixture, and benchmark source files with exact byte hashes
- vendored snapshot files that this repository intentionally owns

Coverage is computed from local `upstream` metadata against those inventories. The CLI command `vue-language-spec coverage` reports:

- covered upstream test cases
- uncovered upstream test cases
- dangling local provenance references that do not match any inventoried upstream case

The generated traceability manifests classify every inventoried upstream test or benchmark as exactly one of:

- `covered`
- `planned`
- `tracked`

The CLI command `vue-language-spec traceability` reports repository-level totals for those statuses.

## 3. Curation Rules

When promoting an upstream behavior into this repository:

- preserve provenance in the test-suite metadata
- mark non-test evidence with an explicit `kind`, e.g. `snapshot` or `artifact`
- translate implementation-specific assertions into portable assertions when possible
- keep JavaScript-specific assumptions inside the runtime suite
- record profile boundaries explicitly
- vendor `vuejs/core` test source instead of relying on external repository URLs when the repository wants local-first provenance
- vendor copied community fixture/test source instead of relying on external repository URLs when the repository wants local-first provenance
- vendor upstream snapshots instead of linking to them when this repository intends to evolve them into the primary source of truth
- generate imported parser/compiler suites from vendored local fixture corpora rather than from ad hoc external checkouts, and use copied snapshots only where an official oracle is not yet available

## 4. Vapor Provenance

Vapor evidence must not be merged into the base inventory without a profile tag. Because Vapor lives on Vue minor branches rather than the default upstream line, every Vapor case must carry branch-specific provenance.
