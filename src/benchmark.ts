import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseSfc, compileScript, compileTemplate } from "@vue/compiler-sfc";
import { computed, effect, ref } from "@vue/reactivity";
import { packageRoot } from "./fs.ts";
import type { BenchmarkCase, BenchmarkResult, BenchmarkSample } from "./types.ts";

type ScriptBindings = NonNullable<ReturnType<typeof compileScript>["bindings"]>;

function nowMs(): number {
  return Number(process.hrtime.bigint()) / 1_000_000;
}

function createSummary(caseData: BenchmarkCase, samples: BenchmarkSample[]): BenchmarkResult {
  const durations = samples.map((sample) => sample.durationMs);
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  return {
    id: caseData.id,
    title: caseData.title,
    unit: caseData.measure.unit,
    samples,
    mean: total / durations.length,
    min: Math.min(...durations),
    max: Math.max(...durations),
  };
}

function runCompilerSfcBatchCase(caseData: BenchmarkCase, root: string): BenchmarkSample {
  const fixtures = (caseData.input.fixtures as string[]).map((file) =>
    readFileSync(join(root, file), "utf8"),
  );
  const repeat = Number(caseData.input.repeat ?? 1);

  const start = nowMs();
  for (let iteration = 0; iteration < repeat; iteration++) {
    for (const [index, source] of fixtures.entries()) {
      const filename = `fixture-${index}.vue`;
      const { descriptor } = parseSfc(source, { filename });

      let bindings: ScriptBindings = {};
      if (descriptor.script || descriptor.scriptSetup) {
        const script = compileScript(descriptor, {
          id: `${caseData.id}-${iteration}-${index}`,
        });
        bindings = script.bindings ?? {};
      }

      if (descriptor.template) {
        compileTemplate({
          filename,
          id: `${caseData.id}-${iteration}-${index}`,
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

function runComputedFanoutCase(caseData: BenchmarkCase): BenchmarkSample {
  const computedCount = Number(caseData.input.computedCount ?? 1);
  const updates = Number(caseData.input.updates ?? 1);
  const source = ref(0);
  const computeds = Array.from({ length: computedCount }, (_, index) =>
    computed(() => source.value + index),
  );
  let sink = 0;

  if (caseData.input.effectMode === "single") {
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

export function runBenchmarkCase(
  caseData: BenchmarkCase,
  options: {
    root?: string;
    smoke?: boolean;
  } = {},
): BenchmarkResult {
  const root = options.root ?? packageRoot(import.meta.url);
  const warmups = options.smoke ? 0 : caseData.measure.warmups;
  const samples = options.smoke ? 1 : caseData.measure.samples;

  const runner =
    caseData.kind === "compiler-sfc-batch"
      ? () => runCompilerSfcBatchCase(caseData, root)
      : () => runComputedFanoutCase(caseData);

  for (let iteration = 0; iteration < warmups; iteration++) {
    runner();
  }

  const results: BenchmarkSample[] = [];
  for (let iteration = 0; iteration < samples; iteration++) {
    results.push(runner());
  }

  return createSummary(caseData, results);
}
