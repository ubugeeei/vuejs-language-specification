import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { packageRoot } from "./fs.ts";
import { vendoredVizeSnapshotRoot } from "./layout.ts";

export interface VizeExpectedSnapshotCase {
  name: string;
  options: string | null;
  input: string;
  output: string;
  line: number;
}

export interface VizeExpectedSnapshotFile {
  file: string;
  cases: VizeExpectedSnapshotCase[];
}

const parsedSnapshotCache = new Map<string, VizeExpectedSnapshotFile>();

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

export function normalizeVizeSnapshotInput(value: string): string {
  const normalized = normalizeNewlines(value);

  if (normalized.endsWith("\n") && /[^\n]/u.test(normalized.slice(0, -1))) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

function countLines(value: string): number {
  return value === "" ? 0 : value.split("\n").length - 1;
}

function trimTerminalNewlines(value: string): string {
  return value.replace(/\n+$/u, "");
}

export function parseVizeExpectedSnapshotContent(content: string): VizeExpectedSnapshotCase[] {
  const cases: VizeExpectedSnapshotCase[] = [];
  const normalized = normalizeNewlines(content).replace(/^\uFEFF/u, "");
  const separatorPattern = /^===\n/gm;
  const separatorOffsets: number[] = [];
  let separatorMatch = separatorPattern.exec(normalized);

  while (separatorMatch) {
    separatorOffsets.push(separatorMatch.index);
    separatorMatch = separatorPattern.exec(normalized);
  }

  for (let index = 0; index < separatorOffsets.length; index += 1) {
    const blockOffset = separatorOffsets[index]!;
    const nextBlockOffset = separatorOffsets[index + 1] ?? normalized.length;
    const block = normalized.slice(blockOffset + 4, nextBlockOffset);
    const inputMarker = "\n--- INPUT ---\n";
    const outputMarker = "\n--- OUTPUT ---\n";
    const inputStart = block.indexOf(inputMarker);
    const outputStart = block.indexOf(outputMarker);

    if (inputStart < 0 || outputStart < 0 || outputStart < inputStart) {
      continue;
    }

    const header = block.slice(0, inputStart).split("\n");
    const nameLineIndex = header.findIndex((line) => line.startsWith("name: "));
    const nameLine = header.find((line) => line.startsWith("name: "));
    const optionsLine = header.find((line) => line.startsWith("options: "));

    cases.push({
      name: nameLine?.slice("name: ".length).trim() ?? "",
      options: optionsLine?.slice("options: ".length).trim() ?? null,
      input: block.slice(inputStart + inputMarker.length, outputStart),
      output: trimTerminalNewlines(block.slice(outputStart + outputMarker.length)),
      line: countLines(normalized.slice(0, blockOffset)) + 2 + Math.max(nameLineIndex, 0),
    });
  }

  return cases;
}

export function parseVizeExpectedSnapshotFile(file: string): VizeExpectedSnapshotFile {
  const cached = parsedSnapshotCache.get(file);
  if (cached) {
    return cached;
  }

  const parsed = {
    file,
    cases: parseVizeExpectedSnapshotContent(readFileSync(file, "utf8")),
  } satisfies VizeExpectedSnapshotFile;
  parsedSnapshotCache.set(file, parsed);
  return parsed;
}

export function fixtureSourceToVendoredSnapshotPath(
  fixtureSource: string,
  root: string = packageRoot(import.meta.url),
): string | null {
  if (!fixtureSource.startsWith("tests/fixtures/") || !fixtureSource.endsWith(".toml")) {
    return null;
  }

  const snapshotFile = join(
    vendoredVizeSnapshotRoot(root),
    fixtureSource.replace(/^tests\/fixtures\//u, "tests/expected/").replace(/\.toml$/u, ".snap"),
  );

  return existsSync(snapshotFile) ? snapshotFile : null;
}

export function loadVendoredVizeExpectedSnapshotCase(
  fixtureSource: string,
  caseName: string,
  root: string = packageRoot(import.meta.url),
): VizeExpectedSnapshotCase | null {
  const snapshotFile = fixtureSourceToVendoredSnapshotPath(fixtureSource, root);
  if (snapshotFile === null) {
    return null;
  }

  return (
    parseVizeExpectedSnapshotFile(snapshotFile).cases.find((entry) => entry.name === caseName) ??
    null
  );
}
