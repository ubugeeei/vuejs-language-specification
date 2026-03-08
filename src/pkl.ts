import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let cachedEntrypoint: string | null = null;

function resolvePklEntrypoint(): string {
  if (cachedEntrypoint) {
    return cachedEntrypoint;
  }

  const packagePath = require.resolve("@pkl-community/pkl/package.json");
  const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as {
    bin: string | Record<string, string>;
  };

  const relativeEntrypoint = typeof pkg.bin === "string" ? pkg.bin : pkg.bin.pkl;
  assert.ok(relativeEntrypoint, "Expected @pkl-community/pkl to expose a pkl bin entry");
  cachedEntrypoint = join(dirname(packagePath), relativeEntrypoint);
  return cachedEntrypoint;
}

export function evaluatePklFile<T>(file: string): T {
  const entrypoint = resolvePklEntrypoint();
  const result = spawnSync(process.execPath, [entrypoint, "eval", "--format", "json", file], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || `Failed to evaluate ${file}`);
  }

  return JSON.parse(result.stdout) as T;
}
