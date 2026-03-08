/* oxlint-disable jest/expect-expect, jest/valid-title */

import { describe, expect, test } from "vitest";
import {
  loadGenericCases,
  runCompilerReferenceCase,
  runParserReferenceCase,
  runSyntaxReferenceCase,
  runTypeEvaluationReferenceCase,
} from "../src/index.ts";
import type {
  BenchmarkCase,
  CompilerCase,
  GenericCase,
  ParserCase,
  SyntaxCase,
  TypeEvaluationCase,
} from "../src/types.ts";
import { runBenchmarkCase } from "../src/benchmark.ts";

function isSuite<T extends GenericCase["suite"]>(
  suite: T,
  value: GenericCase,
): value is Extract<GenericCase, { suite: T }> {
  return value.suite === suite;
}

describe("generic cases", () => {
  const cases = loadGenericCases().map((entry) => entry.data);

  test("loads the expected seed case count", () => {
    expect(cases).toHaveLength(52);
  });

  for (const caseData of cases.filter((value) => isSuite("parser", value))) {
    test(caseData.id, () => {
      runParserReferenceCase(caseData as ParserCase);
    });
  }

  for (const caseData of cases.filter((value) => isSuite("syntax", value))) {
    test(caseData.id, () => {
      runSyntaxReferenceCase(caseData as SyntaxCase);
    });
  }

  for (const caseData of cases.filter((value) => isSuite("compiler", value))) {
    test(caseData.id, () => {
      runCompilerReferenceCase(caseData as CompilerCase);
    });
  }

  for (const caseData of cases.filter((value) => isSuite("type-evaluation", value))) {
    test(caseData.id, () => {
      runTypeEvaluationReferenceCase(caseData as TypeEvaluationCase);
    });
  }

  for (const caseData of cases.filter((value) => isSuite("benchmark", value))) {
    test(`${caseData.id} smoke`, () => {
      const result = runBenchmarkCase(caseData as BenchmarkCase, { smoke: true });
      expect(result.samples).toHaveLength(1);
      expect(result.mean).toBeGreaterThanOrEqual(0);
    });
  }
});
