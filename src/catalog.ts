import { join, relative } from "node:path";
import { packageRoot, walkFiles } from "./fs.ts";
import { evaluatePklFile } from "./pkl.ts";
import type { CatalogEntry, GenericCase, SuiteName } from "./types.ts";

export function discoverCaseFiles(root: string = packageRoot(import.meta.url)): string[] {
  return walkFiles(join(root, "cases"), (file) => file.endsWith(".pkl"));
}

export function loadGenericCases(root: string = packageRoot(import.meta.url)): Array<{
  file: string;
  data: GenericCase;
}> {
  return discoverCaseFiles(root).map((file) => ({
    file,
    data: evaluatePklFile<GenericCase>(file),
  }));
}

export function buildCatalog(
  root: string = packageRoot(import.meta.url),
  suite?: SuiteName,
): CatalogEntry[] {
  return loadGenericCases(root)
    .filter((entry) => (suite ? entry.data.suite === suite : true))
    .map((entry) => {
      const catalogEntry: CatalogEntry = {
        id: entry.data.id,
        title: entry.data.title,
        suite: entry.data.suite,
        kind: entry.data.kind,
        file: relative(root, entry.file),
        features: entry.data.features,
      };

      if (entry.data.profile !== undefined) {
        catalogEntry.profile = entry.data.profile;
      }

      return catalogEntry;
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}
