import { readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function packageRoot(fromMetaUrl: string): string {
  return resolve(dirname(fileURLToPath(fromMetaUrl)), "..");
}

export function walkFiles(root: string, predicate: (path: string) => boolean): string[] {
  const entries = readdirSync(root).sort();
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(root, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...walkFiles(fullPath, predicate));
      continue;
    }
    if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}
