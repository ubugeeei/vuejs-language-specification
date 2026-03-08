import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { discoverVizeFixtureFiles, parseVizeFixtureFile } from "./_shared/vize-fixtures.ts";

interface ExtractedCase {
  name: string;
  kind: "test" | "benchmark";
  line: number;
}

interface ExtractedIssue {
  label: string;
  line: number;
}

interface InventoryFile {
  path: string;
  kind: "test" | "benchmark";
  cases: ExtractedCase[];
  issues: ExtractedIssue[];
}

function walkFiles(root: string): string[] {
  const entries = readdirSync(root).sort();
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(root, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }
    files.push(fullPath);
  }

  return files;
}

function escapeString(value: string): string {
  return JSON.stringify(value);
}

function detectKind(path: string): "test" | "benchmark" {
  return path.includes(".bench.") || path.includes("/__benchmarks__/") || path.includes("/bench/")
    ? "benchmark"
    : "test";
}

function extractCases(lines: string[], kind: "test" | "benchmark"): ExtractedCase[] {
  const pattern = /\b(?:it|test|bench)\(\s*(['"`])((?:\\.|(?!\1).)+)\1/g;
  const cases: ExtractedCase[] = [];

  lines.forEach((line, index) => {
    for (const match of line.matchAll(pattern)) {
      cases.push({
        name: match[2],
        kind,
        line: index + 1,
      });
    }
  });

  return cases;
}

function extractIssues(lines: string[]): ExtractedIssue[] {
  const pattern = /(?:[a-z0-9_-]+\/[a-z0-9_-]+#\d+|#\d+)/gi;
  const issues: ExtractedIssue[] = [];

  lines.forEach((line, index) => {
    for (const match of line.matchAll(pattern)) {
      issues.push({
        label: match[0],
        line: index + 1,
      });
    }
  });

  return issues;
}

function formatInventory(args: {
  repository: string;
  commit: string;
  generatedAt: string;
  files: InventoryFile[];
}): string {
  const caseCount = args.files.reduce((sum, file) => sum + file.cases.length, 0);
  const issueCount = args.files.reduce((sum, file) => sum + file.issues.length, 0);
  const benchmarkCount = args.files.filter((file) => file.kind === "benchmark").length;

  const lines: string[] = [];
  lines.push('amends "../../schemas/UpstreamInventory.pkl"');
  lines.push("");
  lines.push(`repository = ${escapeString(args.repository)}`);
  lines.push(`commit = ${escapeString(args.commit)}`);
  lines.push(`generatedAt = ${escapeString(args.generatedAt)}`);
  lines.push("");
  lines.push("counts {");
  lines.push(`  files = ${args.files.length}`);
  lines.push(`  cases = ${caseCount}`);
  lines.push(`  issueRefs = ${issueCount}`);
  lines.push(`  benchmarks = ${benchmarkCount}`);
  lines.push("}");
  lines.push("");
  lines.push("files {");

  for (const file of args.files) {
    lines.push("  new InventoryFile {");
    lines.push(`    path = ${escapeString(file.path)}`);
    lines.push(`    kind = ${escapeString(file.kind)}`);
    lines.push("    cases {");
    for (const entry of file.cases) {
      lines.push("      new InventoryCase {");
      lines.push(`        name = ${escapeString(entry.name)}`);
      lines.push(`        kind = ${escapeString(entry.kind)}`);
      lines.push(`        line = ${entry.line}`);
      lines.push("      }");
    }
    lines.push("    }");
    if (file.issues.length > 0) {
      lines.push("    issues {");
      for (const issue of file.issues) {
        lines.push("      new IssueRef {");
        lines.push(`        label = ${escapeString(issue.label)}`);
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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = resolve(args.root);
  const output = resolve(args.output);
  const repository = args.repository;

  if (!repository) {
    throw new Error("repository is required");
  }

  const files = walkFiles(root)
    .filter((file) => /\.(spec|test|bench)\.(ts|tsx|js|mjs|cjs)$/.test(file))
    .map((file) => {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      const kind = detectKind(file);
      return {
        path: relative(root, file),
        kind,
        cases: extractCases(lines, kind),
        issues: extractIssues(lines),
      } satisfies InventoryFile;
    })
    .filter((file) => file.cases.length > 0 || file.issues.length > 0)
    .sort((left, right) => left.path.localeCompare(right.path));

  if (repository === "ubugeeei/vize") {
    files.push(
      ...discoverVizeFixtureFiles(root)
        .map((file) => parseVizeFixtureFile(root, file))
        .filter((file) => file.cases.length > 0)
        .map(
          (file) =>
            ({
              path: file.path,
              kind: "test",
              cases: file.cases.map((entry) => ({
                name: entry.name,
                kind: "test",
                line: entry.line,
              })),
              issues: [],
            }) satisfies InventoryFile,
        ),
    );
  }

  files.sort((left, right) => left.path.localeCompare(right.path));

  const commit = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const generatedAt = new Date().toISOString();

  writeFileSync(
    output,
    formatInventory({
      repository,
      commit,
      generatedAt,
      files,
    }),
  );

  console.log(`wrote ${relative(dirname(output), output)} with ${files.length} files`);
}

main();
