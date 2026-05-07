import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { buildReleaseManifest, releaseManifestFile } from "../src/release.ts";

const manifestFile = releaseManifestFile();
mkdirSync(dirname(manifestFile), { recursive: true });
writeFileSync(`${manifestFile}`, `${JSON.stringify(buildReleaseManifest(), null, 2)}\n`);

const format = spawnSync("oxfmt", [manifestFile], { stdio: "inherit" });
if (format.status !== 0) {
  process.exit(format.status ?? 1);
}
