# Benchmark Methodology

## 1. Purpose

Benchmarks in this repository are workload definitions, not leaderboard claims.

They exist to answer:

- does an implementation exercise the same class of work?
- are two runs comparable under the same declared scenario?
- can regressions be tracked against a stable workload definition?

## 2. Benchmark Test-Suite Shape

Each benchmark test suite declares:

- workload kind
- input dataset or graph description
- warmup count
- sample count
- reported unit
- optional budget metadata

## 3. Reporting

Reference runners must report:

- test-suite id
- samples
- mean
- min
- max
- unit

Optional fields may include standard deviation, throughput, bytes processed, or environment metadata.

## 4. Pass/Fail Semantics

Benchmarks are informational unless a test suite opts into a budget.

If a budget is present, it must be explicit and reproducible. Relative budgets are preferred over absolute hardware-dependent ceilings.

## 5. Seed Workloads

The initial benchmark suite covers:

- SFC batch compilation throughput
- reactivity computed fan-out pressure

These workloads are derived from patterns used in `vuejs/core` benchmark files and `ubugeeei/vize` benchmark generators.
