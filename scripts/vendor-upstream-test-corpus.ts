import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { packageRoot } from "../src/fs.ts";
import { evaluatePklFile } from "../src/pkl.ts";
import type { UpstreamInventory } from "../src/types.ts";

function pklString(value: string): string {
  return JSON.stringify(value);
}

function slugifyRepository(repository: string): string {
  return repository.replaceAll("/", "-");
}

function parseArgs(argv: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value == null) {
      throw new Error("Expected --key value pairs");
    }
    parsed[key.slice(2)] = value;
  }

  return parsed;
}

function formatManifest(args: {
  inventory: UpstreamInventory;
  generatedAt: string;
  files: Array<{
    sourcePath: string;
    kind: "test" | "benchmark";
    copiedPath: string;
    bytes: number;
    sha256: string;
    cases: UpstreamInventory["files"][number]["cases"];
    issues: UpstreamInventory["files"][number]["issues"];
  }>;
}): string {
  const { inventory, generatedAt, files } = args;
  const lines: string[] = [];
  lines.push('amends "../../../schemas/VendoredUpstreamCorpusManifest.pkl"');
  lines.push("");
  lines.push(`originRepository = ${pklString(inventory.repository)}`);
  lines.push(`originCommit = ${pklString(inventory.commit)}`);
  lines.push(`generatedAt = ${pklString(generatedAt)}`);
  lines.push(
    'policy = "Vendored raw upstream test and benchmark source files copied into this repository. These copies are committed so provenance remains local and this repository can evolve toward a self-hosted source of truth for curated Vue language behavior."',
  );
  lines.push("");
  lines.push("counts {");
  lines.push(`  files = ${inventory.counts.files}`);
  lines.push(`  cases = ${inventory.counts.cases}`);
  lines.push(`  issueRefs = ${inventory.counts.issueRefs}`);
  lines.push(`  benchmarks = ${inventory.counts.benchmarks ?? 0}`);
  lines.push("}");
  lines.push("");
  lines.push("files {");

  for (const file of files) {
    lines.push("  new CorpusFile {");
    lines.push(`    sourcePath = ${pklString(file.sourcePath)}`);
    lines.push(`    kind = ${pklString(file.kind)}`);
    lines.push(`    copiedPath = ${pklString(file.copiedPath)}`);
    lines.push(`    bytes = ${file.bytes}`);
    lines.push(`    sha256 = ${pklString(file.sha256)}`);
    lines.push("    cases {");
    for (const entry of file.cases) {
      lines.push("      new CorpusCase {");
      lines.push(`        name = ${pklString(entry.name)}`);
      lines.push(`        kind = ${pklString(entry.kind)}`);
      lines.push(`        line = ${entry.line}`);
      lines.push("      }");
    }
    lines.push("    }");
    if (file.issues.length > 0) {
      lines.push("    issues {");
      for (const issue of file.issues) {
        lines.push("      new IssueRef {");
        lines.push(`        label = ${pklString(issue.label)}`);
        lines.push(`        line = ${issue.line}`);
        lines.push("      }");
      }
      lines.push("    }");
    }
    lines.push("  }");
  }

  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const root = packageRoot(import.meta.url);
  const inventoryFile = resolve(args.inventory ?? "");
  const upstreamRoot = resolve(args.upstream ?? "");

  if (!inventoryFile || !args.inventory) {
    throw new Error("--inventory is required");
  }

  if (!upstreamRoot || !args.upstream) {
    throw new Error("--upstream is required");
  }

  const inventory = evaluatePklFile<UpstreamInventory>(inventoryFile);
  const repositorySlug = slugifyRepository(inventory.repository);
  const outputDirectory = resolve(
    args.outputDir ?? join(root, "sources", "copied", repositorySlug),
  );
  const manifestFile = join(outputDirectory, "test-corpus.pkl");
  const commit = spawnSync("git", ["-C", upstreamRoot, "rev-parse", "HEAD"], {
    encoding: "utf8",
  });

  if (commit.status !== 0) {
    throw new Error(commit.stderr.trim() || "Failed to resolve upstream commit");
  }

  const actualCommit = commit.stdout.trim();
  if (actualCommit !== inventory.commit) {
    throw new Error(
      `Upstream commit mismatch: inventory=${inventory.commit} actual=${actualCommit}`,
    );
  }

  rmSync(outputDirectory, { recursive: true, force: true });
  mkdirSync(outputDirectory, { recursive: true });

  const files = inventory.files.map((entry) => {
    const sourceFile = join(upstreamRoot, entry.path);
    const copiedPath = join("sources", "copied", repositorySlug, entry.path).replaceAll("\\", "/");
    const targetFile = join(root, copiedPath);
    const content = readFileSync(sourceFile);

    mkdirSync(dirname(targetFile), { recursive: true });
    copyFileSync(sourceFile, targetFile);

    return {
      sourcePath: entry.path,
      kind: entry.kind,
      copiedPath,
      bytes: statSync(sourceFile).size,
      sha256: createHash("sha256").update(content).digest("hex"),
      cases: entry.cases.map((caseEntry) => ({
        ...caseEntry,
      })),
      issues: entry.issues.map((issue) => ({
        ...issue,
      })),
    };
  });

  writeFileSync(
    manifestFile,
    formatManifest({
      inventory,
      generatedAt: new Date().toISOString(),
      files,
    }),
  );

  console.log(`wrote ${relative(root, manifestFile)} with ${files.length} files`);
}

main();
