/* oxlint-disable jest/expect-expect, jest/valid-title */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  loadGenericTestSuites,
  runCompilerReferenceTestSuite,
  runParserReferenceTestSuite,
  runSyntaxReferenceTestSuite,
  runTypeEvaluationReferenceTestSuite,
} from "../src/index.ts";
import type {
  BenchmarkTestSuite,
  CompilerTestSuite,
  GenericTestSuite,
  ParserTestSuite,
  SyntaxTestSuite,
  TypeEvaluationTestSuite,
} from "../src/types.ts";
import { runBenchmarkTestSuite } from "../src/benchmark.ts";

function loadStableIds(file: string): string[] {
  return readFileSync(new URL(file, import.meta.url), "utf8")
    .split(/\r?\n/u)
    .filter((line) => line.length > 0);
}

function isSuite<T extends GenericTestSuite["suite"]>(
  suite: T,
  value: GenericTestSuite,
): value is Extract<GenericTestSuite, { suite: T }> {
  return value.suite === suite;
}

describe("canonical Pkl conformance suites", () => {
  const testSuites = loadGenericTestSuites().map((entry) => entry.data);
  const stableCatalogIds = loadStableIds("../provenance/stability/stable-catalog-ids.txt");

  test("loads the expected seed test-suite count", () => {
    expect(testSuites).toHaveLength(stableCatalogIds.length);
  });

  for (const testSuite of testSuites.filter((value) => isSuite("syntax", value))) {
    test(testSuite.id, () => {
      runSyntaxReferenceTestSuite(testSuite as SyntaxTestSuite);
    });
  }

  for (const testSuite of testSuites.filter((value) => isSuite("parser", value))) {
    test(testSuite.id, () => {
      runParserReferenceTestSuite(testSuite as ParserTestSuite);
    });
  }

  for (const testSuite of testSuites.filter((value) => isSuite("compiler", value))) {
    test(testSuite.id, () => {
      runCompilerReferenceTestSuite(testSuite as CompilerTestSuite);
    });
  }

  for (const testSuite of testSuites.filter((value) => isSuite("type-evaluation", value))) {
    test(testSuite.id, () => {
      runTypeEvaluationReferenceTestSuite(testSuite as TypeEvaluationTestSuite);
    });
  }

  for (const testSuite of testSuites.filter((value) => isSuite("benchmark", value))) {
    test(`${testSuite.id} smoke`, () => {
      const result = runBenchmarkTestSuite(testSuite as BenchmarkTestSuite, { smoke: true });
      expect(result.samples).toHaveLength(1);
      expect(result.mean).toBeGreaterThanOrEqual(0);
    });
  }
});
