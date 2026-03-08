import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { packageRoot, walkFiles } from "../src/fs.ts";

interface VendoredEntry {
  suite: string;
  originPath: string;
  copiedPath: string;
  bytes: number;
  sha256: string;
}

function pklString(value: string): string {
  return JSON.stringify(value);
}

function renderManifest(
  originCommit: string,
  generatedAt: string,
  entries: VendoredEntry[],
): string {
  const lines = [
    'amends "../../../schemas/VendoredSnapshotManifest.pkl"',
    "",
    'originRepository = "ubugeeei/vize"',
    `originCommit = ${pklString(originCommit)}`,
    `generatedAt = ${pklString(generatedAt)}`,
    'policy = "Vendored raw snapshot files copied from vize/tests/expected. This repository owns the copied artifacts so it can evolve them into the primary source of truth for curated Vue language expectations."',
    `snapshotCount = ${entries.length}`,
    "",
    "entries {",
  ];

  for (const entry of entries) {
    lines.push(`  [${pklString(entry.originPath)}] = new SnapshotEntry {`);
    lines.push(`    suite = ${pklString(entry.suite)}`);
    lines.push(`    originPath = ${pklString(entry.originPath)}`);
    lines.push(`    copiedPath = ${pklString(entry.copiedPath)}`);
    lines.push(`    bytes = ${entry.bytes}`);
    lines.push(`    sha256 = ${pklString(entry.sha256)}`);
    lines.push("  }");
  }

  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

function main(): void {
  const root = packageRoot(import.meta.url);
  const upstreamRoot = resolve(process.argv[2] ?? "/tmp/vize-spec-ref");
  const upstreamExpectedRoot = join(upstreamRoot, "tests", "expected");
  const vendoredRoot = join(root, "sources", "copied", "vize");
  const vendoredExpectedRoot = join(vendoredRoot, "tests", "expected");
  const manifestPath = join(vendoredRoot, "expected-snapshots.pkl");
  const originCommit = spawnSync("git", ["-C", upstreamRoot, "rev-parse", "HEAD"], {
    encoding: "utf8",
  });

  if (originCommit.status !== 0) {
    throw new Error(originCommit.stderr.trim() || "Failed to resolve vize commit");
  }

  const snapshotFiles = walkFiles(upstreamExpectedRoot, (file) => file.endsWith(".snap"));
  rmSync(vendoredExpectedRoot, { recursive: true, force: true });
  mkdirSync(vendoredExpectedRoot, { recursive: true });

  const entries = snapshotFiles.map((file) => {
    const originPath = relative(upstreamRoot, file).replaceAll("\\", "/");
    const copiedPath = join("sources", "copied", "vize", originPath).replaceAll("\\", "/");
    const target = join(root, copiedPath);
    const content = readFileSync(file);
    const suite = originPath.split("/")[2] ?? "unknown";

    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(file, target);

    return {
      suite,
      originPath,
      copiedPath,
      bytes: statSync(file).size,
      sha256: createHash("sha256").update(content).digest("hex"),
    } satisfies VendoredEntry;
  });

  writeFileSync(
    manifestPath,
    renderManifest(originCommit.stdout.trim(), new Date().toISOString(), entries),
  );
}

main();
