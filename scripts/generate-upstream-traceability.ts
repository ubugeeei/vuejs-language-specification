import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { buildUpstreamTraceability } from "../src/upstream.ts";
import { provenanceTraceabilityRoot } from "../src/layout.ts";
import type { UpstreamTraceabilityManifest } from "../src/types.ts";

function escapeString(value: string): string {
  return JSON.stringify(value);
}

function slugifyRepository(repository: string): string {
  return repository.replaceAll("/", "-");
}

function formatManifest(manifest: UpstreamTraceabilityManifest): string {
  const lines: string[] = [];
  lines.push('amends "../../schemas/UpstreamTraceabilityManifest.pkl"');
  lines.push("");
  lines.push(`repository = ${escapeString(manifest.repository)}`);
  lines.push(`commit = ${escapeString(manifest.commit)}`);
  lines.push(`generatedAt = ${escapeString(manifest.generatedAt)}`);
  lines.push("");
  lines.push("counts {");
  lines.push(`  total = ${manifest.counts.total}`);
  lines.push(`  covered = ${manifest.counts.covered}`);
  lines.push(`  planned = ${manifest.counts.planned}`);
  lines.push(`  tracked = ${manifest.counts.tracked}`);
  lines.push("}");
  lines.push("");
  lines.push("entries {");

  for (const entry of manifest.entries) {
    lines.push("  new TraceabilityEntry {");
    lines.push(`    source = ${escapeString(entry.source)}`);
    lines.push(`    name = ${escapeString(entry.name)}`);
    lines.push(`    kind = ${escapeString(entry.kind)}`);
    lines.push(`    line = ${entry.line}`);
    lines.push(`    classification = ${escapeString(entry.classification)}`);
    lines.push(`    status = ${escapeString(entry.status)}`);
    if (entry.profile === null || entry.profile === undefined) {
      lines.push("    profile = null");
    } else {
      lines.push(`    profile = ${escapeString(entry.profile)}`);
    }
    lines.push("    localTestSuites {");
    for (const localTestSuiteId of entry.localTestSuites) {
      lines.push(`      ${escapeString(localTestSuiteId)}`);
    }
    lines.push("    }");
    lines.push("    fileIssues {");
    for (const issue of entry.fileIssues) {
      lines.push(`      ${escapeString(issue)}`);
    }
    lines.push("    }");
    lines.push(`    rationale = ${escapeString(entry.rationale)}`);
    lines.push("  }");
  }

  lines.push("}");
  lines.push("");
  return lines.join("\n");
}

function main() {
  const root = resolve(process.argv[2] ?? process.cwd());
  const outputDirectory = provenanceTraceabilityRoot(root);
  mkdirSync(outputDirectory, { recursive: true });

  for (const manifest of buildUpstreamTraceability(root)) {
    const file = join(
      outputDirectory,
      `${slugifyRepository(manifest.repository)}.traceability.pkl`,
    );
    writeFileSync(file, formatManifest(manifest));
    console.log(`wrote ${relative(root, file)}`);
  }
}

main();
