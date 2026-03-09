import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { loadVendoredJsxVaporExpectedSnapshotCase } from "../src/jsx-vapor-snapshots.ts";
import { vendoredRepositoryRoot } from "../src/layout.ts";
import { packageRoot } from "../src/fs.ts";

interface SuiteDefinition {
  name: string;
  title: string;
  summary: string;
  features: string[];
  inputSource: string;
  inputCaseName: string;
  snapshotSource: string;
  snapshotCaseName: string;
  moduleName: string;
  operation: string;
}

const fixtureSnapshotSource = "packages/macros/tests/__snapshots__/fixtures.spec.ts.snap";
const restructureSnapshotSource = "packages/macros/tests/__snapshots__/restructure.spec.ts.snap";

const fixtureSuites: SuiteDefinition[] = [
  {
    name: "define-component-macro",
    title: "JSX Vapor defineComponent and defineVaporComponent macro lowering",
    summary:
      "JSX Vapor macro compilation must preserve the authored VDOM or Vapor component surface while collecting referenced props, async setup rewrites, and model channels into the copied snapshot oracle.",
    features: [
      "compiler.snapshot",
      "compiler.profile.jsx-vapor",
      "compiler.jsx-vapor",
      "jsx-vapor.defineComponent",
      "imported.input",
      "imported.input.jsx-vapor",
    ],
    inputSource: "packages/macros/tests/fixtures/define-component.tsx",
    inputCaseName: "./fixtures/define-component.tsx",
    snapshotSource: fixtureSnapshotSource,
    snapshotCaseName: "fixtures > ./fixtures/define-component.tsx 1",
    moduleName: "@vue-jsx-vapor/macros",
    operation: "transformJsxMacros",
  },
  {
    name: "define-expose-macro",
    title: "JSX Vapor defineExpose lowering",
    summary:
      "JSX Vapor macro compilation must lower defineExpose to the exposed-instance assignment shape captured by the copied snapshot oracle.",
    features: [
      "compiler.snapshot",
      "compiler.profile.jsx-vapor",
      "compiler.jsx-vapor",
      "jsx-vapor.defineExpose",
      "imported.input",
      "imported.input.jsx-vapor",
    ],
    inputSource: "packages/macros/tests/fixtures/define-expose.tsx",
    inputCaseName: "./fixtures/define-expose.tsx",
    snapshotSource: fixtureSnapshotSource,
    snapshotCaseName: "fixtures > ./fixtures/define-expose.tsx 1",
    moduleName: "@vue-jsx-vapor/macros",
    operation: "transformJsxMacros",
  },
  {
    name: "define-model-macro",
    title: "JSX Vapor defineModel lowering",
    summary:
      "JSX Vapor macro compilation must lower defineModel into model props, update channels, modifier companions, and author-facing reads that match the copied snapshot oracle exactly.",
    features: [
      "compiler.snapshot",
      "compiler.profile.jsx-vapor",
      "compiler.jsx-vapor",
      "jsx-vapor.defineModel",
      "imported.input",
      "imported.input.jsx-vapor",
    ],
    inputSource: "packages/macros/tests/fixtures/define-model.tsx",
    inputCaseName: "./fixtures/define-model.tsx",
    snapshotSource: fixtureSnapshotSource,
    snapshotCaseName: "fixtures > ./fixtures/define-model.tsx 1",
    moduleName: "@vue-jsx-vapor/macros",
    operation: "transformJsxMacros",
  },
  {
    name: "define-slots-macro",
    title: "JSX Vapor defineSlots lowering",
    summary:
      "JSX Vapor macro compilation must lower defineSlots into the slot helper surface and optional invocation shape captured by the copied snapshot oracle.",
    features: [
      "compiler.snapshot",
      "compiler.profile.jsx-vapor",
      "compiler.jsx-vapor",
      "jsx-vapor.defineSlots",
      "imported.input",
      "imported.input.jsx-vapor",
    ],
    inputSource: "packages/macros/tests/fixtures/define-slots.tsx",
    inputCaseName: "./fixtures/define-slots.tsx",
    snapshotSource: fixtureSnapshotSource,
    snapshotCaseName: "fixtures > ./fixtures/define-slots.tsx 1",
    moduleName: "@vue-jsx-vapor/macros",
    operation: "transformJsxMacros",
  },
  {
    name: "define-style-macro",
    title: "JSX Vapor defineStyle lowering",
    summary:
      "JSX Vapor macro compilation must inject scoped style imports, CSS variable bindings, and slot scope ids exactly as recorded in the copied snapshot oracle.",
    features: [
      "compiler.snapshot",
      "compiler.profile.jsx-vapor",
      "compiler.jsx-vapor",
      "jsx-vapor.defineStyle",
      "imported.input",
      "imported.input.jsx-vapor",
    ],
    inputSource: "packages/macros/tests/fixtures/define-style.tsx",
    inputCaseName: "./fixtures/define-style.tsx",
    snapshotSource: fixtureSnapshotSource,
    snapshotCaseName: "fixtures > ./fixtures/define-style.tsx 1",
    moduleName: "@vue-jsx-vapor/macros",
    operation: "transformJsxMacros",
  },
  {
    name: "slot-object-lowering",
    title: "JSX Vapor slot object lowering",
    summary:
      "JSX-authored slot objects and <slot> outlets in JSX Vapor must lower to the copied snapshot oracle without losing the authored default-slot function structure.",
    features: [
      "compiler.snapshot",
      "compiler.profile.jsx-vapor",
      "compiler.jsx-vapor",
      "jsx-vapor.slot",
      "imported.input",
      "imported.input.jsx-vapor",
    ],
    inputSource: "packages/macros/tests/fixtures/slot.tsx",
    inputCaseName: "./fixtures/slot.tsx",
    snapshotSource: fixtureSnapshotSource,
    snapshotCaseName: "fixtures > ./fixtures/slot.tsx 1",
    moduleName: "@vue-jsx-vapor/macros",
    operation: "transformJsxMacros",
  },
];

const restructureSuites: SuiteDefinition[] = [
  {
    name: "restructure-basic",
    title: "JSX Vapor restructure preserves nested destructure reads",
    summary:
      "JSX Vapor parameter restructure must rewrite nested destructure reads back to stable __props access while preserving inner function parameter shadowing.",
    features: [
      "compiler.snapshot",
      "compiler.profile.jsx-vapor",
      "compiler.jsx-vapor",
      "jsx-vapor.restructure",
      "jsx-vapor.destructure",
      "imported.input",
      "imported.input.jsx-vapor",
    ],
    inputSource: "packages/macros/tests/restructure.spec.ts",
    inputCaseName: "reconstruct",
    snapshotSource: restructureSnapshotSource,
    snapshotCaseName: "transform > reconstruct 1",
    moduleName: "@vue-jsx-vapor/macros/restructure",
    operation: "restructure",
  },
  {
    name: "restructure-arrow-function",
    title: "JSX Vapor restructure preserves arrow-function props access",
    summary:
      "JSX Vapor parameter restructure must rewrite arrow-function destructure reads to canonical __props access without changing the JSX return surface.",
    features: [
      "compiler.snapshot",
      "compiler.profile.jsx-vapor",
      "compiler.jsx-vapor",
      "jsx-vapor.restructure",
      "jsx-vapor.destructure",
      "imported.input",
      "imported.input.jsx-vapor",
    ],
    inputSource: "packages/macros/tests/restructure.spec.ts",
    inputCaseName: "reconstruct arrowFunctionExpression",
    snapshotSource: restructureSnapshotSource,
    snapshotCaseName: "transform > reconstruct arrowFunctionExpression 1",
    moduleName: "@vue-jsx-vapor/macros/restructure",
    operation: "restructure",
  },
  {
    name: "restructure-defaults",
    title: "JSX Vapor restructure lowers defaults and rest props through proxies",
    summary:
      "JSX Vapor parameter restructure must lower default-bearing bindings and rest props to the copied helper proxy shape captured by the snapshot oracle.",
    features: [
      "compiler.snapshot",
      "compiler.profile.jsx-vapor",
      "compiler.jsx-vapor",
      "jsx-vapor.restructure",
      "jsx-vapor.defaults",
      "imported.input",
      "imported.input.jsx-vapor",
    ],
    inputSource: "packages/macros/tests/restructure.spec.ts",
    inputCaseName: "reconstruct default-prop",
    snapshotSource: restructureSnapshotSource,
    snapshotCaseName: "transform > reconstruct default-prop 1",
    moduleName: "@vue-jsx-vapor/macros/restructure",
    operation: "restructure",
  },
  {
    name: "restructure-rest",
    title: "JSX Vapor restructure lowers rest props through createPropsRestProxy",
    summary:
      "JSX Vapor parameter restructure must lower rest bindings through createPropsRestProxy and preserve default-bearing prop access exactly as captured in the copied snapshot oracle.",
    features: [
      "compiler.snapshot",
      "compiler.profile.jsx-vapor",
      "compiler.jsx-vapor",
      "jsx-vapor.restructure",
      "jsx-vapor.rest",
      "imported.input",
      "imported.input.jsx-vapor",
    ],
    inputSource: "packages/macros/tests/restructure.spec.ts",
    inputCaseName: "reconstruct rest-prop",
    snapshotSource: restructureSnapshotSource,
    snapshotCaseName: "transform > reconstruct rest-prop 1",
    moduleName: "@vue-jsx-vapor/macros/restructure",
    operation: "restructure",
  },
  {
    name: "restructure-assignment-pattern",
    title: "JSX Vapor restructure lowers nested assignment patterns through default proxies",
    summary:
      "JSX Vapor parameter restructure must lower nested assignment patterns to createPropsDefaultProxy with stable path-based keys that match the copied snapshot oracle.",
    features: [
      "compiler.snapshot",
      "compiler.profile.jsx-vapor",
      "compiler.jsx-vapor",
      "jsx-vapor.restructure",
      "jsx-vapor.assignment-pattern",
      "imported.input",
      "imported.input.jsx-vapor",
    ],
    inputSource: "packages/macros/tests/restructure.spec.ts",
    inputCaseName: "reconstruct AssignmentPattern",
    snapshotSource: restructureSnapshotSource,
    snapshotCaseName: "transform > reconstruct AssignmentPattern 1",
    moduleName: "@vue-jsx-vapor/macros/restructure",
    operation: "restructure",
  },
];

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function rawStringHashes(value: string): string {
  let hashes = "#";
  while (value.includes(`"""${hashes}`)) {
    hashes += "#";
  }
  return hashes;
}

function pushAssignedString(lines: string[], indent: string, key: string, value: string): void {
  if (!value.includes("\n")) {
    lines.push(`${indent}${key} = ${JSON.stringify(value)}`);
    return;
  }

  const hashes = rawStringHashes(value);
  lines.push(`${indent}${key} = ${hashes}"""`);
  for (const line of normalizeNewlines(value).split("\n")) {
    lines.push(`${indent}${line}`);
  }
  lines.push(`${indent}"""${hashes}`);
}

function writeGeneratedFile(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

function loadVendoredSource(root: string, source: string): string {
  return normalizeNewlines(
    readFileSync(join(vendoredRepositoryRoot(root, "vuejs/vue-jsx-vapor"), source), "utf8"),
  );
}

function extractRestructureInputs(source: string): Map<string, string> {
  const inputs = new Map<string, string>();
  const pattern =
    /test\('([^']+)',\s*\(\)\s*=>\s*{\s*const code = transformRestructure\(\s*`([\s\S]*?)`,\s*\)!\s*expect\(code\)\.toMatchSnapshot\(\)\s*}\)/g;

  for (const match of source.matchAll(pattern)) {
    const name = match[1];
    const input = match[2];

    if (name === undefined || input === undefined) {
      continue;
    }

    inputs.set(name, normalizeNewlines(input));
  }

  return inputs;
}

function formatSuite(args: {
  definition: SuiteDefinition;
  input: string;
  snapshotOutput: string;
}): string {
  const { definition, input, snapshotOutput } = args;
  const lines: string[] = [];

  lines.push('amends "../../../schemas/CompilerTestSuite.pkl"');
  lines.push("");
  lines.push(`id = "compiler.jsx-vapor.${definition.name}"`);
  lines.push(`title = ${JSON.stringify(definition.title)}`);
  lines.push('kind = "jsx-expected-snapshot"');
  lines.push(`summary = ${JSON.stringify(definition.summary)}`);
  lines.push("");
  lines.push("features {");
  for (const feature of definition.features) {
    lines.push(`  ${JSON.stringify(feature)}`);
  }
  lines.push("}");
  lines.push("");
  lines.push('profile = "jsx-vapor"');
  lines.push("");
  lines.push("inputOrigin = new ImportedInputOrigin {");
  lines.push(
    `  copiedPath = ${JSON.stringify(
      join("provenance", "vendor", "vuejs-vue-jsx-vapor", definition.inputSource).replaceAll(
        "\\",
        "/",
      ),
    )}`,
  );
  lines.push(`  source = ${JSON.stringify(definition.inputSource)}`);
  lines.push(`  caseName = ${JSON.stringify(definition.inputCaseName)}`);
  lines.push('  originRepository = "vuejs/vue-jsx-vapor"');
  lines.push("}");
  lines.push("");
  lines.push("oracle = new ReferenceOracle {");
  lines.push('  repository = "vuejs/vue-jsx-vapor"');
  lines.push(`  moduleName = ${JSON.stringify(definition.moduleName)}`);
  lines.push(`  operation = ${JSON.stringify("copied snapshot oracle via " + definition.operation)}`);
  lines.push('  profile = "jsx-vapor"');
  lines.push("  provisional = true");
  lines.push("}");
  lines.push("");
  lines.push("upstream {");
  lines.push("  new UpstreamReference {");
  lines.push('    repository = "vuejs/vue-jsx-vapor"');
  lines.push(`    source = ${JSON.stringify(definition.inputSource)}`);
  lines.push("    cases {");
  lines.push(`      ${JSON.stringify(definition.inputCaseName)}`);
  lines.push("    }");
  lines.push("  }");
  lines.push("  new UpstreamReference {");
  lines.push('    kind = "snapshot"');
  lines.push('    repository = "vuejs/vue-jsx-vapor"');
  lines.push(`    source = ${JSON.stringify(definition.snapshotSource)}`);
  lines.push("    cases {");
  lines.push(`      ${JSON.stringify(definition.snapshotCaseName)}`);
  lines.push("    }");
  lines.push("  }");
  lines.push("}");
  lines.push("");
  lines.push("input {");
  pushAssignedString(lines, "  ", "source", input);
  lines.push("}");
  lines.push("");
  lines.push("expect {");
  pushAssignedString(lines, "  ", "normalizedCode", snapshotOutput);
  pushAssignedString(lines, "  ", "vendoredSnapshotOutput", snapshotOutput);
  lines.push("}");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function main(): void {
  const root = packageRoot(import.meta.url);
  const outputDir = join(root, "testsuites", "compiler", "jsx-vapor");
  const vendoredRoot = vendoredRepositoryRoot(root, "vuejs/vue-jsx-vapor");
  const restructureInputs = extractRestructureInputs(
    normalizeNewlines(readFileSync(join(vendoredRoot, "packages", "macros", "tests", "restructure.spec.ts"), "utf8")),
  );

  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  for (const definition of fixtureSuites) {
    const input = loadVendoredSource(root, definition.inputSource);
    const snapshot = loadVendoredJsxVaporExpectedSnapshotCase(
      definition.snapshotSource,
      definition.snapshotCaseName,
      root,
    );
    if (!snapshot) {
      throw new Error(`Missing vendored snapshot ${definition.snapshotSource} :: ${definition.snapshotCaseName}`);
    }

    const file = join(outputDir, `${definition.name}.pkl`);
    writeGeneratedFile(
      file,
      formatSuite({
        definition,
        input,
        snapshotOutput: snapshot.output,
      }),
    );
    console.log(`wrote ${relative(root, file)}`);
  }

  for (const definition of restructureSuites) {
    const input = restructureInputs.get(definition.inputCaseName);
    if (input === undefined) {
      throw new Error(`Missing vendored restructure input for ${definition.inputCaseName}`);
    }

    const snapshot = loadVendoredJsxVaporExpectedSnapshotCase(
      definition.snapshotSource,
      definition.snapshotCaseName,
      root,
    );
    if (!snapshot) {
      throw new Error(`Missing vendored snapshot ${definition.snapshotSource} :: ${definition.snapshotCaseName}`);
    }

    const file = join(outputDir, `${definition.name}.pkl`);
    writeGeneratedFile(
      file,
      formatSuite({
        definition,
        input,
        snapshotOutput: snapshot.output,
      }),
    );
    console.log(`wrote ${relative(root, file)}`);
  }

  console.log(
    `generated ${fixtureSuites.length + restructureSuites.length} JSX Vapor suites in ${relative(root, outputDir)}`,
  );
}

main();
