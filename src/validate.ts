import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { packageRoot, walkFiles } from "./fs.ts";
import { discoverCaseFiles } from "./catalog.ts";
import { evaluatePklFile } from "./pkl.ts";
import {
  buildUpstreamCoverage,
  buildUpstreamTraceability,
  loadLocalUpstreamReferences,
  loadVendoredUpstreamCorpora,
} from "./upstream.ts";
import type {
  UpstreamInventory,
  UpstreamTraceabilityManifest,
  ValidationMessage,
  VendoredSnapshotManifest,
  VendoredUpstreamCorpusManifest,
} from "./types.ts";

function repositoryToTraceabilityFile(root: string, repository: string): string {
  return join(
    root,
    "sources",
    "traceability",
    `${repository.replaceAll("/", "-")}.traceability.pkl`,
  );
}

function extractSnapshotNames(content: string): Set<string> {
  return new Set(
    [...content.matchAll(/^name:\s*(.+)$/gm)]
      .map((match) => match[1]?.trim())
      .filter(Boolean) as string[],
  );
}

function normalizeTraceabilityManifest(
  manifest: UpstreamTraceabilityManifest,
): UpstreamTraceabilityManifest {
  return {
    ...manifest,
    entries: manifest.entries.map((entry) => ({
      ...entry,
      profile: entry.profile ?? null,
    })),
  };
}

export function validateCases(root: string = packageRoot(import.meta.url)): ValidationMessage[] {
  return discoverCaseFiles(root).map((file) => {
    try {
      const data = evaluatePklFile<{ id: string }>(file);
      return {
        file,
        id: data.id,
        valid: true,
        errors: [],
      };
    } catch (error) {
      return {
        file,
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  });
}

export function validateUpstreamInventories(
  root: string = packageRoot(import.meta.url),
): ValidationMessage[] {
  const inventoryFiles = walkFiles(join(root, "sources", "upstream"), (file) =>
    file.endsWith(".pkl"),
  );

  return inventoryFiles.map((file) => {
    try {
      evaluatePklFile(file);
      return {
        file,
        valid: true,
        errors: [],
      };
    } catch (error) {
      return {
        file,
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  });
}

export function validateVendoredSnapshots(
  root: string = packageRoot(import.meta.url),
): ValidationMessage[] {
  const manifestFile = join(root, "sources", "copied", "vize", "expected-snapshots.pkl");

  try {
    const manifest = evaluatePklFile<VendoredSnapshotManifest>(manifestFile);
    const entries = Object.entries(manifest.entries);
    const errors: string[] = [];

    if (entries.length !== manifest.snapshotCount) {
      errors.push(
        `snapshotCount mismatch: manifest=${manifest.snapshotCount} actual=${entries.length}`,
      );
    }

    for (const [key, entry] of entries) {
      const file = join(root, entry.copiedPath);
      if (!existsSync(file)) {
        errors.push(`Missing vendored snapshot for ${key}: ${entry.copiedPath}`);
        continue;
      }

      const content = readFileSync(file);
      const actualSha = createHash("sha256").update(content).digest("hex");
      if (actualSha !== entry.sha256) {
        errors.push(`sha256 mismatch for ${key}`);
      }

      if (content.byteLength !== entry.bytes) {
        errors.push(
          `byte length mismatch for ${key}: manifest=${entry.bytes} actual=${content.byteLength}`,
        );
      }
    }

    return [
      {
        file: manifestFile,
        valid: errors.length === 0,
        errors,
      },
    ];
  } catch (error) {
    return [
      {
        file: manifestFile,
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      },
    ];
  }
}

function normalizeVendoredCorpusManifest(
  manifest: VendoredUpstreamCorpusManifest,
): VendoredUpstreamCorpusManifest {
  return {
    ...manifest,
    files: manifest.files.map((file) => ({
      ...file,
      issues: file.issues ?? [],
    })),
  };
}

function normalizeInventoryForVendoredComparison(
  inventory: UpstreamInventory,
  generatedAt: string,
): {
  repository: string;
  commit: string;
  generatedAt: string;
  counts: UpstreamInventory["counts"];
  files: Array<{
    sourcePath: string;
    kind: "test" | "benchmark";
    cases: UpstreamInventory["files"][number]["cases"];
    issues: UpstreamInventory["files"][number]["issues"];
  }>;
} {
  return {
    repository: inventory.repository,
    commit: inventory.commit,
    generatedAt,
    counts: {
      ...inventory.counts,
    },
    files: inventory.files.map((file) => ({
      sourcePath: file.path,
      kind: file.kind,
      cases: file.cases.map((entry) => ({
        ...entry,
      })),
      issues: file.issues.map((issue) => ({
        ...issue,
      })),
    })),
  };
}

function normalizeVendoredCorpusForInventoryComparison(
  manifest: VendoredUpstreamCorpusManifest,
): ReturnType<typeof normalizeInventoryForVendoredComparison> {
  return {
    repository: manifest.originRepository,
    commit: manifest.originCommit,
    generatedAt: manifest.generatedAt,
    counts: {
      ...manifest.counts,
    },
    files: manifest.files.map((file) => ({
      sourcePath: file.sourcePath,
      kind: file.kind,
      cases: file.cases.map((entry) => ({
        ...entry,
      })),
      issues: (file.issues ?? []).map((issue) => ({
        ...issue,
      })),
    })),
  };
}

export function validateVendoredUpstreamCorpora(
  root: string = packageRoot(import.meta.url),
): ValidationMessage[] {
  const manifests = loadVendoredUpstreamCorpora(root);
  const inventoryByRepository = new Map(
    walkFiles(join(root, "sources", "upstream"), (file) => file.endsWith(".pkl")).map((file) => {
      const inventory = evaluatePklFile<UpstreamInventory>(file);
      return [inventory.repository, inventory] as const;
    }),
  );

  return manifests.map((manifest) => {
    const manifestFile = join(
      root,
      "sources",
      "copied",
      manifest.originRepository.replaceAll("/", "-"),
      "test-corpus.pkl",
    );
    const normalizedManifest = normalizeVendoredCorpusManifest(manifest);
    const errors: string[] = [];
    const fileCount = normalizedManifest.files.length;
    const caseCount = normalizedManifest.files.reduce((sum, entry) => sum + entry.cases.length, 0);
    const issueCount = normalizedManifest.files.reduce(
      (sum, entry) => sum + entry.issues.length,
      0,
    );
    const benchmarkCount = normalizedManifest.files.filter(
      (entry) => entry.kind === "benchmark",
    ).length;

    if (normalizedManifest.counts.files !== fileCount) {
      errors.push(
        `files mismatch: manifest=${normalizedManifest.counts.files} actual=${fileCount}`,
      );
    }

    if (normalizedManifest.counts.cases !== caseCount) {
      errors.push(
        `cases mismatch: manifest=${normalizedManifest.counts.cases} actual=${caseCount}`,
      );
    }

    if (normalizedManifest.counts.issueRefs !== issueCount) {
      errors.push(
        `issueRefs mismatch: manifest=${normalizedManifest.counts.issueRefs} actual=${issueCount}`,
      );
    }

    if (normalizedManifest.counts.benchmarks !== benchmarkCount) {
      errors.push(
        `benchmarks mismatch: manifest=${normalizedManifest.counts.benchmarks} actual=${benchmarkCount}`,
      );
    }

    for (const entry of normalizedManifest.files) {
      const copiedFile = join(root, entry.copiedPath);
      if (!existsSync(copiedFile)) {
        errors.push(`Missing vendored source for ${entry.sourcePath}: ${entry.copiedPath}`);
        continue;
      }

      const content = readFileSync(copiedFile);
      const actualSha = createHash("sha256").update(content).digest("hex");
      if (actualSha !== entry.sha256) {
        errors.push(`sha256 mismatch for ${entry.sourcePath}`);
      }

      if (content.byteLength !== entry.bytes) {
        errors.push(
          `byte length mismatch for ${entry.sourcePath}: manifest=${entry.bytes} actual=${content.byteLength}`,
        );
      }
    }

    const inventory = inventoryByRepository.get(normalizedManifest.originRepository);
    if (!inventory) {
      errors.push(`Missing upstream inventory for ${normalizedManifest.originRepository}`);
    } else {
      try {
        assert.deepStrictEqual(
          normalizeVendoredCorpusForInventoryComparison(normalizedManifest),
          normalizeInventoryForVendoredComparison(inventory, normalizedManifest.generatedAt),
        );
      } catch {
        errors.push(
          `Vendored corpus diverges from upstream inventory for ${normalizedManifest.originRepository}`,
        );
      }
    }

    return {
      file: manifestFile,
      valid: errors.length === 0,
      errors,
    };
  });
}

export function validateUpstreamReferences(
  root: string = packageRoot(import.meta.url),
): ValidationMessage[] {
  const report = buildUpstreamCoverage(root);
  const snapshotManifestFile = join(root, "sources", "copied", "vize", "expected-snapshots.pkl");
  const errors: string[] = report.danglingReferences.map(
    (reference) =>
      `Unresolved ${reference.kind} reference: ${reference.repository} ${reference.source} :: ${reference.caseName} <- ${reference.localCaseId}`,
  );

  try {
    const manifest = evaluatePklFile<VendoredSnapshotManifest>(snapshotManifestFile);
    const snapshotNameIndex = new Map<string, Set<string>>();

    for (const [source, entry] of Object.entries(manifest.entries)) {
      const copiedPath = join(root, entry.copiedPath);
      if (!existsSync(copiedPath)) {
        continue;
      }
      snapshotNameIndex.set(source, extractSnapshotNames(readFileSync(copiedPath, "utf8")));
    }

    for (const reference of loadLocalUpstreamReferences(root).filter(
      (entry) => entry.kind === "snapshot",
    )) {
      const snapshotNames = snapshotNameIndex.get(reference.source);
      if (!snapshotNames) {
        errors.push(
          `Snapshot source is not vendored: ${reference.repository} ${reference.source} <- ${reference.localCaseId}`,
        );
        continue;
      }

      if (!snapshotNames.has(reference.caseName)) {
        errors.push(
          `Snapshot case is missing: ${reference.repository} ${reference.source} :: ${reference.caseName} <- ${reference.localCaseId}`,
        );
      }
    }
  } catch (error) {
    errors.push(
      `Failed to validate snapshot references: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return [
    {
      file: join(root, "sources", "upstream"),
      valid: errors.length === 0,
      errors,
    },
  ];
}

export function validateUpstreamTraceability(
  root: string = packageRoot(import.meta.url),
): ValidationMessage[] {
  const expectedManifests = buildUpstreamTraceability(root);
  const actualFiles = walkFiles(join(root, "sources", "traceability"), (file) =>
    file.endsWith(".pkl"),
  );
  const actualByRepository = new Map<string, UpstreamTraceabilityManifest>();
  const messages: ValidationMessage[] = [];

  for (const file of actualFiles) {
    try {
      const manifest = evaluatePklFile<UpstreamTraceabilityManifest>(file);
      actualByRepository.set(manifest.repository, manifest);
    } catch (error) {
      messages.push({
        file,
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
      });
    }
  }

  for (const expected of expectedManifests) {
    const file = repositoryToTraceabilityFile(root, expected.repository);
    const actual = actualByRepository.get(expected.repository);

    if (!actual) {
      messages.push({
        file,
        valid: false,
        errors: [`Missing traceability manifest for ${expected.repository}`],
      });
      continue;
    }

    const normalizedActual = normalizeTraceabilityManifest({
      ...actual,
      generatedAt: expected.generatedAt,
    });
    const normalizedExpected = normalizeTraceabilityManifest(expected);

    try {
      assert.deepStrictEqual(normalizedActual, normalizedExpected);
      messages.push({
        file,
        valid: true,
        errors: [],
      });
    } catch {
      messages.push({
        file,
        valid: false,
        errors: [`Traceability manifest is out of date for ${expected.repository}`],
      });
    }
  }

  const expectedRepositories = new Set(expectedManifests.map((manifest) => manifest.repository));
  for (const [repository] of actualByRepository) {
    if (expectedRepositories.has(repository)) {
      continue;
    }

    messages.push({
      file: repositoryToTraceabilityFile(root, repository),
      valid: false,
      errors: [`Unexpected traceability manifest for ${repository}`],
    });
  }

  return messages.sort((left, right) => left.file.localeCompare(right.file));
}
