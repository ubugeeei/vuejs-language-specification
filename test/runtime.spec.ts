/* oxlint-disable jest/expect-expect, jest/valid-title */

import { describe, test } from "vitest";
import { nodeRuntimeCases } from "../src/runtime/index.ts";

describe("runtime cases", () => {
  for (const runtimeCase of nodeRuntimeCases) {
    test(runtimeCase.id, async () => {
      await runtimeCase.run();
    });
  }
});
