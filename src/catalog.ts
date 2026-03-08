import { join, relative } from "node:path";
import { packageRoot, walkFiles } from "./fs.ts";
import { evaluatePklFile } from "./pkl.ts";
import type { CatalogEntry, GenericTestSuite, SuiteName } from "./types.ts";

export function discoverTestSuiteFiles(root: string = packageRoot(import.meta.url)): string[] {
  return walkFiles(join(root, "testsuites"), (file) => file.endsWith(".pkl"));
}

export const discoverCaseFiles = discoverTestSuiteFiles;

export function loadGenericTestSuites(root: string = packageRoot(import.meta.url)): Array<{
  file: string;
  data: GenericTestSuite;
}> {
  return discoverTestSuiteFiles(root).map((file) => ({
    file,
    data: evaluatePklFile<GenericTestSuite>(file),
  }));
}

export const loadGenericCases = loadGenericTestSuites;

export function buildCatalog(
  root: string = packageRoot(import.meta.url),
  suite?: SuiteName,
): CatalogEntry[] {
  return loadGenericTestSuites(root)
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
