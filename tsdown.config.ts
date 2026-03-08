import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    index: "src/index.ts",
    cli: "src/cli.ts",
    "runtime/index": "src/runtime/index.ts",
  },
  format: ["esm"],
  outDir: "dist",
  sourcemap: true,
  unbundle: true,
});
