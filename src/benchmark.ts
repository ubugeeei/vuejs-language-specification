import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseSfc, compileScript, compileTemplate } from "@vue/compiler-sfc";
import { computed, effect, ref } from "@vue/reactivity";
import { packageRoot } from "./fs.ts";
import type { BenchmarkResult, BenchmarkSample, BenchmarkTestSuite } from "./types.ts";

type ScriptBindings = NonNullable<ReturnType<typeof compileScript>["bindings"]>;

function nowMs(): number {
  return Number(process.hrtime.bigint()) / 1_000_000;
}

function createSummary(testSuite: BenchmarkTestSuite, samples: BenchmarkSample[]): BenchmarkResult {
  const durations = samples.map((sample) => sample.durationMs);
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  return {
    id: testSuite.id,
    title: testSuite.title,
    unit: testSuite.measure.unit,
    samples,
    mean: total / durations.length,
    min: Math.min(...durations),
    max: Math.max(...durations),
  };
}

function runCompilerSfcBatchTestSuite(
  testSuite: BenchmarkTestSuite,
  root: string,
): BenchmarkSample {
  const fixtures = (testSuite.input.fixtures as string[]).map((file) =>
    readFileSync(join(root, file), "utf8"),
  );
  const repeat = Number(testSuite.input.repeat ?? 1);

  const start = nowMs();
  for (let iteration = 0; iteration < repeat; iteration++) {
    for (const [index, source] of fixtures.entries()) {
      const filename = `fixture-${index}.vue`;
      const { descriptor } = parseSfc(source, { filename });

      let bindings: ScriptBindings = {};
      if (descriptor.script || descriptor.scriptSetup) {
        const script = compileScript(descriptor, {
          id: `${testSuite.id}-${iteration}-${index}`,
        });
        bindings = script.bindings ?? {};
      }

      if (descriptor.template) {
        compileTemplate({
          filename,
          id: `${testSuite.id}-${iteration}-${index}`,
          source: descriptor.template.content,
          compilerOptions: {
            bindingMetadata: bindings,
          },
        });
      }
    }
  }
  const end = nowMs();
  return { durationMs: end - start };
}

function runComputedFanoutTestSuite(testSuite: BenchmarkTestSuite): BenchmarkSample {
  const computedCount = Number(testSuite.input.computedCount ?? 1);
  const updates = Number(testSuite.input.updates ?? 1);
  const source = ref(0);
  const computeds = Array.from({ length: computedCount }, (_, index) =>
    computed(() => source.value + index),
  );
  let sink = 0;

  if (testSuite.input.effectMode === "single") {
    effect(() => {
      for (const entry of computeds) {
        sink = entry.value;
      }

      return sink;
    });
  }

  const start = nowMs();
  for (let index = 0; index < updates; index++) {
    source.value = index;
    for (const entry of computeds) {
      sink = entry.value;
    }
  }
  const end = nowMs();

  if (sink === Number.NEGATIVE_INFINITY) {
    throw new Error("Unreachable sink state");
  }

  return { durationMs: end - start };
}

export function runBenchmarkTestSuite(
  testSuite: BenchmarkTestSuite,
  options: {
    root?: string;
    smoke?: boolean;
  } = {},
): BenchmarkResult {
  const root = options.root ?? packageRoot(import.meta.url);
  const warmups = options.smoke ? 0 : testSuite.measure.warmups;
  const samples = options.smoke ? 1 : testSuite.measure.samples;

  const runner =
    testSuite.kind === "compiler-sfc-batch"
      ? () => runCompilerSfcBatchTestSuite(testSuite, root)
      : () => runComputedFanoutTestSuite(testSuite);

  for (let iteration = 0; iteration < warmups; iteration++) {
    runner();
  }

  const results: BenchmarkSample[] = [];
  for (let iteration = 0; iteration < samples; iteration++) {
    results.push(runner());
  }

  return createSummary(testSuite, results);
}
