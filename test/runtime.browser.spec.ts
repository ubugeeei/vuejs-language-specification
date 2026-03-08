/* oxlint-disable jest/expect-expect, jest/valid-title */

import { afterEach, describe, test } from "vitest";
import { cleanupDom } from "../src/runtime/dom.ts";
import { browserRuntimeTestSuites } from "../src/runtime/index.ts";

describe("browser runtime test suites", () => {
  afterEach(() => {
    cleanupDom();
  });

  for (const runtimeTestSuite of browserRuntimeTestSuites) {
    test(runtimeTestSuite.id, async () => {
      await runtimeTestSuite.run();
    });
  }
});
