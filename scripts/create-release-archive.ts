import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  buildReleaseManifest,
  canonicalCorpusArchiveName,
  canonicalReleaseArchiveContents,
} from "../src/release.ts";
import { packageRoot } from "../src/fs.ts";

const root = packageRoot(import.meta.url);
const manifest = buildReleaseManifest(root);
const archiveName = canonicalCorpusArchiveName(manifest.version);
const archiveRoot = archiveName.replace(/\.tar\.gz$/u, "");
const outputDir = join(root, "dist", "release");
const stagingDir = join(outputDir, ".staging");
const stagingRoot = join(stagingDir, archiveRoot);
const archiveFile = join(outputDir, archiveName);
const checksumFile = `${archiveFile}.sha256`;

rmSync(stagingDir, { recursive: true, force: true });
rmSync(archiveFile, { force: true });
rmSync(checksumFile, { force: true });
mkdirSync(stagingRoot, { recursive: true });

for (const entry of canonicalReleaseArchiveContents()) {
  cpSync(join(root, entry), join(stagingRoot, entry), {
    recursive: true,
    dereference: false,
    force: true,
  });
}

const tar = spawnSync("tar", ["-czf", archiveFile, "-C", stagingDir, archiveRoot], {
  stdio: "inherit",
});

rmSync(stagingDir, { recursive: true, force: true });

if (tar.status !== 0) {
  process.exit(tar.status ?? 1);
}

const checksum = createHash("sha256").update(readFileSync(archiveFile)).digest("hex");
writeFileSync(checksumFile, `${checksum}  ${basename(archiveFile)}\n`);

for (const asset of manifest.distribution.canonical.releaseAssets) {
  if (asset.name === archiveName && asset.checksumFile === basename(checksumFile)) {
    console.log(`created ${archiveFile}`);
    console.log(`created ${checksumFile}`);
    process.exit(0);
  }
}

console.error(`release manifest does not describe ${archiveName}`);
process.exit(1);
