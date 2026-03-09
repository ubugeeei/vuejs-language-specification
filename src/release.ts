import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { discoverTestSuiteFiles } from "./catalog.ts";
import { packageRoot, walkFiles } from "./fs.ts";
import { provenanceInventoriesRoot, provenanceTraceabilityRoot } from "./layout.ts";
import { loadRequirementMatrixEntries } from "./requirements.ts";
import { runtimeTestSuites } from "./runtime/index.ts";
import { loadUpstreamInventories, loadVendoredUpstreamCorpora } from "./upstream.ts";
import type { ReleaseManifest, ReleaseManifestProfile, ReleaseManifestTarget } from "./types.ts";

interface PackageManifest {
  name: string;
  version: string;
  bin?: string | Record<string, string>;
  dependencies?: Record<string, string>;
  exports?: Record<string, string | Record<string, string>>;
}

const releaseManifestRelativePath = "provenance/releases/current.json";
const canonicalRoots = ["spec", "testsuites", "runtime", "schemas", "provenance", "fixtures"];
const targetDefinitions: ReleaseManifestTarget[] = [
  {
    name: "syntax",
    root: "testsuites/syntax",
    executableFormat: "pkl",
  },
  {
    name: "parser",
    root: "testsuites/parser",
    executableFormat: "pkl",
  },
  {
    name: "compiler",
    root: "testsuites/compiler",
    executableFormat: "pkl",
  },
  {
    name: "type-evaluation",
    root: "testsuites/type-evaluation",
    executableFormat: "pkl",
  },
  {
    name: "runtime",
    root: "testsuites/runtime",
    executableFormat: "typescript",
  },
  {
    name: "benchmark",
    root: "testsuites/benchmark",
    executableFormat: "pkl",
  },
];

function loadPackageManifest(root: string): PackageManifest {
  return JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as PackageManifest;
}

function collectVuePackageRanges(
  dependencies: Record<string, string> | undefined,
): Record<string, string> {
  const packageRanges: Record<string, string> = {};

  for (const name of [
    "vue",
    "@vue/compiler-core",
    "@vue/compiler-dom",
    "@vue/compiler-sfc",
    "@vue/reactivity",
  ] as const) {
    const version = dependencies?.[name];
    if (version) {
      packageRanges[name] = version;
    }
  }

  return packageRanges;
}

function collectModuleEntrypoints(exportsField: PackageManifest["exports"]): string[] {
  const entrypoints = new Set<string>();

  for (const entry of Object.values(exportsField ?? {})) {
    if (typeof entry === "string") {
      if (entry.endsWith(".js")) {
        entrypoints.add(entry.replace(/^\.\//u, ""));
      }
      continue;
    }

    const importEntrypoint = entry.import;
    if (typeof importEntrypoint === "string" && importEntrypoint.endsWith(".js")) {
      entrypoints.add(importEntrypoint.replace(/^\.\//u, ""));
    }
  }

  return [...entrypoints].sort((left, right) => left.localeCompare(right));
}

function collectCliEntrypoint(bin: PackageManifest["bin"]): {
  cliCommand: string;
  cliEntrypoint: string;
} {
  if (typeof bin === "string") {
    return {
      cliCommand: "vue-language-spec",
      cliEntrypoint: bin.replace(/^\.\//u, ""),
    };
  }

  const [cliCommand, cliEntrypoint] = Object.entries(bin ?? {})[0] ?? [
    "vue-language-spec",
    "./dist/cli.js",
  ];

  return {
    cliCommand,
    cliEntrypoint: cliEntrypoint.replace(/^\.\//u, ""),
  };
}

function buildProfiles(root: string): ReleaseManifestProfile[] {
  const explicitProfiles = new Set<string>();

  for (const file of discoverTestSuiteFiles(root)) {
    const content = readFileSync(file, "utf8");
    for (const match of content.matchAll(/^\s*profile\s*=\s*"([^"]+)"/gmu)) {
      const profile = match[1];
      if (profile) {
        explicitProfiles.add(profile);
      }
    }
  }

  const profiles: ReleaseManifestProfile[] = [
    {
      name: "base",
      default: true,
      stability: "stable",
      upstreamRepository: "vuejs/core",
      upstreamLine: "mainline",
      isolation: "base",
    },
  ];

  for (const profile of [...explicitProfiles].sort((left, right) => left.localeCompare(right))) {
    profiles.push({
      name: profile,
      default: false,
      stability: profile === "vapor" ? "provisional" : "stable",
      upstreamRepository: "vuejs/core",
      upstreamLine: profile === "vapor" ? "minor-branch snapshot" : "profile-specific snapshot",
      isolation: "opt-in",
    });
  }

  return profiles;
}

function countNormativeChapters(root: string): number {
  const specRoot = join(root, "spec");
  if (!existsSync(specRoot)) {
    return 0;
  }

  return readdirSync(specRoot).filter((file) => /^\d{2}-.+\.md$/u.test(file)).length;
}

export function canonicalReleaseManifestPath(): string {
  return releaseManifestRelativePath;
}

export function releaseManifestFile(root: string = packageRoot(import.meta.url)): string {
  return join(root, releaseManifestRelativePath);
}

export function buildReleaseManifest(root: string = packageRoot(import.meta.url)): ReleaseManifest {
  const packageManifest = loadPackageManifest(root);
  const { cliCommand, cliEntrypoint } = collectCliEntrypoint(packageManifest.bin);

  return {
    schemaVersion: 1,
    packageName: packageManifest.name,
    version: packageManifest.version,
    tagFormat: "v{version}",
    distribution: {
      canonical: {
        kind: "repository-snapshot",
        manifestPath: canonicalReleaseManifestPath(),
        consumption: "pin a git tag or vendor a release tarball",
        requiredRoots: [...canonicalRoots],
      },
      secondaryChannels: [
        {
          kind: "npm-package",
          identifier: packageManifest.name,
          purpose: ["cli", "programmatic-api", "javascript-runtime-harness"],
        },
      ],
    },
    baseline: {
      repository: "vuejs/core",
      packageRanges: collectVuePackageRanges(packageManifest.dependencies),
      evidenceRepositories: loadUpstreamInventories(root).map((inventory) => inventory.repository),
    },
    profiles: buildProfiles(root),
    artifacts: {
      targets: targetDefinitions.map((entry) => ({
        ...entry,
      })),
      roots: {
        spec: "spec",
        testsuites: "testsuites",
        runtime: "runtime",
        schemas: "schemas",
        provenance: "provenance",
        fixtures: "fixtures",
      },
      jsTooling: {
        cliCommand,
        cliEntrypoint,
        moduleEntrypoints: collectModuleEntrypoints(packageManifest.exports),
      },
      counts: {
        pklTestSuites: discoverTestSuiteFiles(root).length,
        runtimeTestSuites: runtimeTestSuites.length,
        requirementMatrixEntries: loadRequirementMatrixEntries(root).length,
        normativeChapters: countNormativeChapters(root),
        schemas: walkFiles(join(root, "schemas"), (file) => file.endsWith(".pkl")).length,
        upstreamInventories: walkFiles(provenanceInventoriesRoot(root), (file) =>
          file.endsWith(".pkl"),
        ).length,
        traceabilityManifests: walkFiles(provenanceTraceabilityRoot(root), (file) =>
          file.endsWith(".pkl"),
        ).length,
        vendoredCorpora: loadVendoredUpstreamCorpora(root).length,
      },
    },
  };
}

export function loadReleaseManifest(root: string = packageRoot(import.meta.url)): ReleaseManifest {
  return JSON.parse(readFileSync(releaseManifestFile(root), "utf8")) as ReleaseManifest;
}
