import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { buildCatalog, loadRequirementMatrixEntries } from "../src/index.ts";
import { packageRoot } from "../src/fs.ts";
import { provenanceStabilityRoot } from "../src/layout.ts";

function writeLines(file: string, lines: string[]): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${lines.join("\n")}\n`);
}

function main(): void {
  const root = packageRoot(import.meta.url);
  const catalogIds = buildCatalog(root).map((entry) => entry.id);
  const requirementIds = loadRequirementMatrixEntries(root).map((entry) => entry.id);

  writeLines(join(provenanceStabilityRoot(root), "stable-catalog-ids.txt"), catalogIds);
  writeLines(join(provenanceStabilityRoot(root), "stable-requirement-ids.txt"), requirementIds);

  console.log(
    `wrote ${catalogIds.length} catalog ids and ${requirementIds.length} requirement ids`,
  );
}

main();
