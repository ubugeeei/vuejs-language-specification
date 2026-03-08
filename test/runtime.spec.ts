/* oxlint-disable jest/expect-expect, jest/valid-title */

import { describe, test } from "vitest";
import { nodeRuntimeTestSuites } from "../src/runtime/index.ts";

describe("runtime test suites", () => {
  for (const runtimeTestSuite of nodeRuntimeTestSuites) {
    test(runtimeTestSuite.id, async () => {
      await runtimeTestSuite.run();
    });
  }
});
