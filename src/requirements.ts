import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { packageRoot, walkFiles } from "./fs.ts";
import type { RequirementMatrixEntry, RequirementMatrixReference } from "./types.ts";

const requirementRowPattern = /^\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|$/u;
const markdownLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/gu;

export const requiredRequirementMatrixFiles = [
  "spec/02-sfc-syntax.md",
  "spec/03-template-and-compiler.md",
  "spec/04-type-evaluation.md",
  "spec/05-runtime-conformance.md",
  "spec/06-benchmark-methodology.md",
] as const;

function normalizeLinkLabel(value: string): string {
  return value.replace(/^`|`$/gu, "").trim();
}

function parseRequirementReferences(
  value: string,
  sourceFile: string,
  root: string,
): RequirementMatrixReference[] {
  const references: RequirementMatrixReference[] = [];

  for (const match of value.matchAll(markdownLinkPattern)) {
    const label = match[1]?.trim();
    const href = match[2]?.trim();

    if (!label || !href) {
      continue;
    }

    references.push({
      label: normalizeLinkLabel(label),
      href,
      targetPath: relative(root, resolve(dirname(sourceFile), href)),
    });
  }

  return references;
}

export function discoverRequirementMatrixFiles(
  root: string = packageRoot(import.meta.url),
): string[] {
  const specRoot = join(root, "spec");
  return walkFiles(specRoot, (file) => file.endsWith(".md"));
}

export function loadRequirementMatrixEntries(
  root: string = packageRoot(import.meta.url),
): RequirementMatrixEntry[] {
  const entries: RequirementMatrixEntry[] = [];

  for (const file of discoverRequirementMatrixFiles(root)) {
    const content = readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/u);
    let inCodeFence = false;
    let inRequirementsSection = false;

    for (const [index, line] of lines.entries()) {
      if (line.startsWith("```")) {
        inCodeFence = !inCodeFence;
        continue;
      }

      if (!inCodeFence && /^##+\s+/u.test(line)) {
        inRequirementsSection = /^##+\s+(?:\d+(?:\.\d+)?\.\s+)?Requirements$/u.test(line.trim());
        continue;
      }

      if (!inRequirementsSection || inCodeFence) {
        continue;
      }

      const match = line.match(requirementRowPattern);

      if (!match) {
        continue;
      }

      const [, id = "", statement = "", references = ""] = match;
      entries.push({
        id: id.trim(),
        statement: statement.trim(),
        file: relative(root, file),
        line: index + 1,
        references: parseRequirementReferences(references, file, root),
      });
    }
  }

  return entries.sort((left, right) => left.id.localeCompare(right.id));
}
