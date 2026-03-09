import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { packageRoot } from "../src/fs.ts";
import {
  loadVendoredVizeExpectedSnapshotCase,
  normalizeVizeSnapshotInput,
  parseVizeExpectedSnapshotContent,
} from "../src/vize-snapshots.ts";

const root = packageRoot(import.meta.url);

describe("provenance snapshot helpers", () => {
  test("preserves whitespace-only parser fixture inputs", () => {
    const snapshot = loadVendoredVizeExpectedSnapshotCase(
      "tests/fixtures/parser/text.toml",
      "only newline",
      root,
    );

    expect(snapshot).not.toBeNull();
    expect(snapshot?.input).toBe("\n");
  });

  test("parses the final snapshot block in a file", () => {
    const file = join(
      root,
      "provenance",
      "vendor",
      "vize",
      "tests",
      "expected",
      "vdom",
      "v-if.snap",
    );
    const cases = parseVizeExpectedSnapshotContent(readFileSync(file, "utf8"));

    expect(cases.at(-1)?.name).toBe("v-if with negation");
  });

  test("normalizes boundary newlines the same way as snapshot-backed SFC fixtures", () => {
    const fixtureSource =
      "<script setup>\nconst count = 0\n</script>\n\n<template>\n  <div>{{ count }}</div>\n</template>\n";
    const snapshotSource =
      "<script setup>\nconst count = 0\n</script>\n\n<template>\n  <div>{{ count }}</div>\n</template>";

    expect(normalizeVizeSnapshotInput(fixtureSource)).toBe(
      normalizeVizeSnapshotInput(snapshotSource),
    );
    expect(normalizeVizeSnapshotInput("\n")).toBe("\n");
  });
});
