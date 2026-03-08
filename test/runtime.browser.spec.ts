/* oxlint-disable jest/expect-expect, jest/valid-title */

import { afterEach, describe, test } from "vitest";
import { cleanupDom } from "../src/runtime/dom.ts";
import { browserRuntimeCases } from "../src/runtime/index.ts";

describe("browser runtime cases", () => {
  afterEach(() => {
    cleanupDom();
  });

  for (const runtimeCase of browserRuntimeCases) {
    test(runtimeCase.id, async () => {
      await runtimeCase.run();
    });
  }
});
