import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { packageRoot } from "./fs.ts";
import { vendoredRepositoryRoot } from "./layout.ts";

export interface JsxVaporExpectedSnapshotCase {
  name: string;
  output: string;
  line: number;
}

export interface JsxVaporExpectedSnapshotFile {
  file: string;
  cases: JsxVaporExpectedSnapshotCase[];
}

const parsedSnapshotCache = new Map<string, JsxVaporExpectedSnapshotFile>();
const vitestSnapshotPattern = /exports\[`([^`]+)`\] = `([\s\S]*?)`;/g;

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function countLines(value: string): number {
  return value === "" ? 0 : value.split("\n").length - 1;
}

function decodeVitestStringSnapshot(body: string): string {
  let decoded = normalizeNewlines(body).replace(/^\uFEFF/u, "");

  if (decoded.startsWith("\n")) {
    decoded = decoded.slice(1);
  }

  if (decoded.endsWith("\n")) {
    decoded = decoded.slice(0, -1);
  }

  if (decoded.startsWith('"') && decoded.endsWith('"')) {
    return decoded.slice(1, -1);
  }

  return decoded;
}

export function parseJsxVaporExpectedSnapshotContent(
  content: string,
): JsxVaporExpectedSnapshotCase[] {
  const normalized = normalizeNewlines(content).replace(/^\uFEFF/u, "");
  const cases: JsxVaporExpectedSnapshotCase[] = [];

  for (const match of normalized.matchAll(vitestSnapshotPattern)) {
    const name = match[1];
    const body = match[2];

    if (name === undefined || body === undefined) {
      continue;
    }

    cases.push({
      name,
      output: decodeVitestStringSnapshot(body),
      line: countLines(normalized.slice(0, match.index ?? 0)) + 1,
    });
  }

  return cases;
}

export function parseJsxVaporExpectedSnapshotFile(file: string): JsxVaporExpectedSnapshotFile {
  const cached = parsedSnapshotCache.get(file);
  if (cached) {
    return cached;
  }

  const parsed = {
    file,
    cases: parseJsxVaporExpectedSnapshotContent(readFileSync(file, "utf8")),
  } satisfies JsxVaporExpectedSnapshotFile;
  parsedSnapshotCache.set(file, parsed);
  return parsed;
}

export function loadVendoredJsxVaporExpectedSnapshotCase(
  snapshotSource: string,
  caseName: string,
  root: string = packageRoot(import.meta.url),
): JsxVaporExpectedSnapshotCase | null {
  const snapshotFile = join(vendoredRepositoryRoot(root, "vuejs/vue-jsx-vapor"), snapshotSource);
  if (!existsSync(snapshotFile)) {
    return null;
  }

  return (
    parseJsxVaporExpectedSnapshotFile(snapshotFile).cases.find((entry) => entry.name === caseName) ??
    null
  );
}
