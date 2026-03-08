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

Formally:

```text
BenchmarkTestSuite ::= ⟨id, kind, input, warmups, samples, unit, budget?⟩
BenchmarkResult    ::= ⟨id, samples*, mean, min, max, unit⟩
BenchmarkSample    ::= ⟨durationMs⟩
```

Measurement is modeled by:

```text
measure : Impl × BenchmarkTestSuite × Env → BenchmarkResult
```

## 2.1. Benchmark Environment

The benchmark environment is constrained only by declared workload inputs and runner metadata:

```text
BenchmarkEnv ::= ⟨runtime, hardwareClass?, warmupPolicy, samplePolicy⟩
```

Hardware identity is not itself normative unless a benchmark test suite declares a concrete budget that depends on it.

## 3. Reporting

Reference runners must report:

- test-suite id
- samples
- mean
- min
- max
- unit

Optional fields may include standard deviation, throughput, bytes processed, or environment metadata.

The minimum result projection required by this repository is:

```text
BenchmarkProj(r) ::= ⟨id, samples, mean, min, max, unit⟩
```

## 4. Pass/Fail Semantics

Benchmarks are informational unless a test suite opts into a budget.

If a budget is present, it must be explicit and reproducible. Relative budgets are preferred over absolute hardware-dependent ceilings.

Without a declared budget:

```text
BenchmarkPass(I, t) ⇔ WellFormed(BenchmarkProj(measure(I, t, env)))
```

With a declared budget:

```text
BenchmarkPass(I, t) ⇔
  WellFormed(BenchmarkProj(measure(I, t, env))) ∧
  BudgetSatisfied(measure(I, t, env), t.budget)
```

## 5. Requirements

| ID        | Requirement                                                                                                                                              | Test Suites                                                                                      |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `BENCH-1` | Compiler benchmark runners MUST preserve SFC batch-workload identity, including repeated end-to-end compilation across a stable corpus and sample count. | [`benchmark.compiler.sfc-batch-compile`](../testsuites/benchmark/compiler/sfc-batch-compile.pkl) |
| `BENCH-2` | Reactivity benchmark runners MUST preserve the declared computed fan-out graph shape and report one sample per measured run after the declared warmups.  | [`benchmark.reactivity.computed-fanout`](../testsuites/benchmark/reactivity/computed-fanout.pkl) |

## 6. Seed Workloads

The initial benchmark suite covers:

- SFC batch compilation throughput
- reactivity computed fan-out pressure

These workloads are derived from patterns used in `vuejs/core` benchmark files and `ubugeeei/vize` benchmark generators.

## 7. Reproducibility Rules

A benchmark runner used for conformance reporting MUST:

- execute the declared warmup count before collecting reported samples
- emit exactly the declared sample count unless the runner is explicitly in smoke mode
- report results in the unit declared by the local benchmark test suite
- avoid mixing incomparable workloads under the same benchmark id

The local smoke benchmark path is a harness convenience, not a semantic redefinition of the workload.

## 8. Coverage Surface

Benchmark conformance in this repository is represented by the conjunction of:

- executable local benchmark test suites under [`testsuites/benchmark/`](../testsuites/benchmark/)
- reusable benchmark fixtures under [`fixtures/benchmarks/`](../fixtures/benchmarks/)
- vendored upstream benchmark evidence under [`sources/copied/vuejs-core/`](../sources/copied/vuejs-core/) and [`sources/traceability/ubugeeei-vize.traceability.pkl`](../sources/traceability/ubugeeei-vize.traceability.pkl)

The executable obligation today is intentionally limited to workload identity and result-shape stability, not cross-machine leaderboard ranking.
