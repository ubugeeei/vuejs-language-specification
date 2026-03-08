/* oxlint-disable jest/expect-expect, jest/valid-title */

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

function isSuite<T extends GenericTestSuite["suite"]>(
  suite: T,
  value: GenericTestSuite,
): value is Extract<GenericTestSuite, { suite: T }> {
  return value.suite === suite;
}

describe("generic test suites", () => {
  const testSuites = loadGenericTestSuites().map((entry) => entry.data);

  test("loads the expected seed test-suite count", () => {
    expect(testSuites).toHaveLength(96);
  });

  for (const testSuite of testSuites.filter((value) => isSuite("parser", value))) {
    test(testSuite.id, () => {
      runParserReferenceTestSuite(testSuite as ParserTestSuite);
    });
  }

  for (const testSuite of testSuites.filter((value) => isSuite("syntax", value))) {
    test(testSuite.id, () => {
      runSyntaxReferenceTestSuite(testSuite as SyntaxTestSuite);
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
