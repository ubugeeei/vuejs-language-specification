import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { buildReleaseManifest, releaseManifestFile } from "../src/release.ts";

const manifestFile = releaseManifestFile();
mkdirSync(dirname(manifestFile), { recursive: true });
writeFileSync(`${manifestFile}`, `${JSON.stringify(buildReleaseManifest(), null, 2)}\n`);
