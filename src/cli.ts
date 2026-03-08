import { buildCatalog, loadGenericTestSuites } from "./catalog.ts";
import { runBenchmarkTestSuite } from "./benchmark.ts";
import { packageRoot } from "./fs.ts";
import { buildUpstreamCoverage, buildUpstreamTraceability } from "./upstream.ts";
import {
  validateTestSuites,
  validateUpstreamInventories,
  validateUpstreamReferences,
  validateUpstreamTraceability,
  validateVendoredSnapshots,
  validateVendoredUpstreamCorpora,
} from "./validate.ts";
import type { BenchmarkTestSuite, SuiteName } from "./types.ts";

function parseArgs(argv: string[]): {
  command: string;
  rest: string[];
  flags: Set<string>;
} {
  const [command = "help", ...rest] = argv;
  const flags = new Set(rest.filter((value) => value.startsWith("--")));
  return {
    command,
    rest: rest.filter((value) => !value.startsWith("--")),
    flags,
  };
}

function readFlagValue(argv: string[], name: string): string | undefined {
  const flagIndex = argv.findIndex((value) => value === name);
  if (flagIndex === -1) {
    return undefined;
  }
  return argv[flagIndex + 1];
}

function readSuiteArg(argv: string[]): SuiteName | undefined {
  return readFlagValue(argv, "--suite") as SuiteName | undefined;
}

function printHelp() {
  console.log(`vue-language-spec

Commands:
  validate [--json]
  catalog [--suite <suite>] [--json]
  benchmark [test-suite-id] [--smoke] [--json]
  coverage [--repository <repo>] [--json]
  traceability [--repository <repo>] [--json]
`);
}

async function main() {
  const root = packageRoot(import.meta.url);
  const { command, rest, flags } = parseArgs(process.argv.slice(2));
  const json = flags.has("--json");

  switch (command) {
    case "validate": {
      const messages = [
        ...validateTestSuites(root),
        ...validateUpstreamInventories(root),
        ...validateUpstreamReferences(root),
        ...validateUpstreamTraceability(root),
        ...validateVendoredUpstreamCorpora(root),
        ...validateVendoredSnapshots(root),
      ];
      const hasErrors = messages.some((message) => !message.valid);
      if (json) {
        console.log(JSON.stringify(messages, null, 2));
      } else {
        for (const message of messages) {
          const label = message.valid ? "PASS" : "FAIL";
          console.log(`${label} ${message.file}`);
          for (const error of message.errors) {
            console.log(`  - ${error}`);
          }
        }
      }
      process.exitCode = hasErrors ? 1 : 0;
      return;
    }
    case "catalog": {
      const suite = readSuiteArg(process.argv.slice(2));
      const catalog = buildCatalog(root, suite);
      console.log(
        json
          ? JSON.stringify(catalog, null, 2)
          : catalog.map((entry) => `${entry.id} ${entry.file}`).join("\n"),
      );
      return;
    }
    case "benchmark": {
      const testSuiteId = rest[0];
      const smoke = flags.has("--smoke");
      const benchmarks = loadGenericTestSuites(root)
        .map((entry) => entry.data)
        .filter((entry): entry is BenchmarkTestSuite => entry.suite === "benchmark");
      const selected = testSuiteId
        ? benchmarks.filter((entry) => entry.id === testSuiteId)
        : benchmarks;
      if (selected.length === 0) {
        throw new Error(
          testSuiteId
            ? `Unknown benchmark test suite: ${testSuiteId}`
            : "No benchmark test suites found",
        );
      }
      const results = selected.map((testSuite) =>
        runBenchmarkTestSuite(testSuite, { root, smoke }),
      );
      console.log(
        json
          ? JSON.stringify(results, null, 2)
          : results
              .map(
                (result) =>
                  `${result.id} mean=${result.mean.toFixed(3)}ms min=${result.min.toFixed(3)}ms max=${result.max.toFixed(3)}ms`,
              )
              .join("\n"),
      );
      return;
    }
    case "coverage": {
      const repository = readFlagValue(process.argv.slice(2), "--repository");
      const report = buildUpstreamCoverage(root);
      const repositories = repository
        ? report.repositories.filter((entry) => entry.repository === repository)
        : report.repositories;
      const uncovered = repository
        ? report.uncovered.filter((entry) => entry.repository === repository)
        : report.uncovered;
      const danglingReferences = repository
        ? report.danglingReferences.filter((entry) => entry.repository === repository)
        : report.danglingReferences;

      if (json) {
        console.log(
          JSON.stringify(
            {
              generatedAt: report.generatedAt,
              repositories,
              uncovered,
              danglingReferences,
            },
            null,
            2,
          ),
        );
        return;
      }

      for (const entry of repositories) {
        console.log(
          `${entry.repository} covered=${entry.coveredCases}/${entry.totalCases} uncovered=${entry.uncoveredCases}`,
        );
      }
      console.log(`uncovered=${uncovered.length}`);
      for (const entry of uncovered.slice(0, repository ? uncovered.length : 25)) {
        console.log(`  - ${entry.repository} ${entry.source}:${entry.line} ${entry.name}`);
      }
      console.log(`danglingReferences=${danglingReferences.length}`);
      for (const entry of danglingReferences.slice(
        0,
        repository ? danglingReferences.length : 25,
      )) {
        console.log(
          `  - ${entry.repository} ${entry.source} :: ${entry.caseName} <- ${entry.localTestSuiteId}`,
        );
      }
      return;
    }
    case "traceability": {
      const repository = readFlagValue(process.argv.slice(2), "--repository");
      const manifests = buildUpstreamTraceability(root);
      const selected = repository
        ? manifests.filter((manifest) => manifest.repository === repository)
        : manifests;

      if (json) {
        console.log(JSON.stringify(selected, null, 2));
        return;
      }

      for (const manifest of selected) {
        console.log(
          `${manifest.repository} covered=${manifest.counts.covered} planned=${manifest.counts.planned} tracked=${manifest.counts.tracked}`,
        );
      }
      return;
    }
    default:
      printHelp();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
