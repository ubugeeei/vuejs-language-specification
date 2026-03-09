import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { packageRoot } from "../src/fs.ts";
import {
  loadVendoredJsxVaporExpectedSnapshotCase,
  parseJsxVaporExpectedSnapshotContent,
} from "../src/jsx-vapor-snapshots.ts";

const root = packageRoot(import.meta.url);

describe("JSX Vapor provenance snapshot helpers", () => {
  test("preserves leading newlines from Vitest string snapshots", () => {
    const snapshot = loadVendoredJsxVaporExpectedSnapshotCase(
      "packages/macros/tests/__snapshots__/fixtures.spec.ts.snap",
      "fixtures > ./fixtures/define-component.tsx 1",
      root,
    );

    expect(snapshot).not.toBeNull();
    expect(snapshot?.output.startsWith("\nimport { useAttrs as __useAttrs }")).toBe(true);
  });

  test("parses the final snapshot block in a Vitest snapshot file", () => {
    const file = join(
      root,
      "provenance",
      "vendor",
      "vuejs-vue-jsx-vapor",
      "packages",
      "macros",
      "tests",
      "__snapshots__",
      "fixtures.spec.ts.snap",
    );
    const cases = parseJsxVaporExpectedSnapshotContent(readFileSync(file, "utf8"));

    expect(cases.at(-1)?.name).toBe("fixtures > ./fixtures/slot.tsx 1");
  });
});
