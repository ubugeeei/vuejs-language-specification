import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { packageRoot, walkFiles } from "../src/fs.ts";
import { vendoredRepositoryRoot } from "../src/layout.ts";

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
    'originRepository = "vuejs/vue-jsx-vapor"',
    `originCommit = ${pklString(originCommit)}`,
    `generatedAt = ${pklString(generatedAt)}`,
    'policy = "Vendored raw Vitest snapshot files copied from vuejs/vue-jsx-vapor. These copies are committed so profile-scoped JSX Vapor expectations remain locally auditable and stable even when upstream formatting evolves."',
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
  const upstreamRoot = resolve(process.argv[2] ?? "/tmp/vue-jsx-vapor-spec.4def6Z");
  const upstreamSnapshotRoot = join(upstreamRoot, "packages", "macros", "tests", "__snapshots__");
  const vendoredRoot = vendoredRepositoryRoot(root, "vuejs/vue-jsx-vapor");
  const vendoredSnapshotRoot = join(vendoredRoot, "packages", "macros", "tests", "__snapshots__");
  const manifestPath = join(vendoredRoot, "expected-snapshots.pkl");
  const originCommit = spawnSync("git", ["-C", upstreamRoot, "rev-parse", "HEAD"], {
    encoding: "utf8",
  });

  if (originCommit.status !== 0) {
    throw new Error(originCommit.stderr.trim() || "Failed to resolve vue-jsx-vapor commit");
  }

  const snapshotFiles = walkFiles(upstreamSnapshotRoot, (file) => file.endsWith(".snap"));
  rmSync(vendoredSnapshotRoot, { recursive: true, force: true });
  mkdirSync(vendoredSnapshotRoot, { recursive: true });

  const entries = snapshotFiles.map((file) => {
    const originPath = relative(upstreamRoot, file).replaceAll("\\", "/");
    const copiedPath = join("provenance", "vendor", "vuejs-vue-jsx-vapor", originPath).replaceAll(
      "\\",
      "/",
    );
    const target = join(root, copiedPath);
    const content = readFileSync(file);

    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(file, target);

    return {
      suite: "macros",
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

  console.log(`wrote ${relative(root, manifestPath)} with ${entries.length} files`);
}

main();
