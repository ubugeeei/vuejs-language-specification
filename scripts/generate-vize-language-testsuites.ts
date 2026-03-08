import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import * as CompilerCore from "@vue/compiler-core";
import * as CompilerDom from "@vue/compiler-dom";
import { compile as compileDomTemplate } from "@vue/compiler-dom";
import {
  compileScript,
  compileStyle,
  compileTemplate as compileSfcTemplate,
  parse as parseSfc,
} from "@vue/compiler-sfc";
import type { SFCDescriptor } from "@vue/compiler-sfc";
import { packageRoot } from "../src/fs.ts";
import {
  loadVendoredVizeExpectedSnapshotCase,
  type VizeExpectedSnapshotCase,
} from "../src/vize-snapshots.ts";
import { provenanceVendorRoot } from "../src/layout.ts";
import {
  discoverVizeFixtureFiles,
  parseVizeFixtureFile,
  type VizeFixtureCase,
} from "./_shared/vize-fixtures.ts";

type TemplateDomCompileOptions = Parameters<typeof compileDomTemplate>[1];
type ScriptCompileOptions = NonNullable<Parameters<typeof compileScript>[1]>;
type SfcTemplateCompileOptions = Parameters<typeof compileSfcTemplate>[0];

const parserSkipKeys = new Set(["ast", "codegenNode", "ssrCodegenNode"]);
const helperSymbolNames = new Map<symbol, string>(
  [...Object.entries(CompilerCore), ...Object.entries(CompilerDom)].flatMap(([name, value]) =>
    typeof value === "symbol" ? [[value, name] satisfies [symbol, string]] : [],
  ),
);

interface RequirementRow {
  id: string;
  statement: string;
  references: Array<{ id: string; path: string }>;
}

interface BaseSuiteArgs {
  id: string;
  title: string;
  summary: string;
  features: string[];
  profile?: string;
  source: string;
  copiedPath: string;
  caseName: string;
  vendoredSnapshot?: VizeExpectedSnapshotCase | null;
}

interface OracleArgs {
  repository: string;
  moduleName: string;
  operation: string;
  profile?: string;
  provisional?: boolean;
}

function parseArgs(argv: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key?.startsWith("--") || value == null) {
      throw new Error("Expected --key value pairs");
    }

    parsed[key.slice(2)] = value;
  }

  return parsed;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function normalizeDiagnosticText(value: string): string {
  return normalizeNewlines(value).trimEnd();
}

function pklScalar(value: string | number | boolean | null): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  return String(value);
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

function pushListingString(lines: string[], indent: string, value: string): void {
  if (!value.includes("\n")) {
    lines.push(`${indent}${JSON.stringify(value)}`);
    return;
  }

  const hashes = rawStringHashes(value);
  lines.push(`${indent}${hashes}"""`);
  for (const line of normalizeNewlines(value).split("\n")) {
    lines.push(`${indent}${line}`);
  }
  lines.push(`${indent}"""${hashes}`);
}

function normalizeEnumField(key: string, value: unknown): unknown {
  if (typeof value !== "number") {
    return value;
  }

  switch (key) {
    case "type":
      return CompilerCore.NodeTypes[value] ?? value;
    case "tagType":
      return CompilerCore.ElementTypes[value] ?? value;
    case "constType":
      return CompilerCore.ConstantTypes[value] ?? value;
    case "ns":
      return CompilerCore.Namespaces[value] ?? value;
    case "code":
      return CompilerCore.ErrorCodes[value] ?? value;
    default:
      return value;
  }
}

function normalizeCompilerErrorCode(value: unknown): string | number | undefined {
  if (typeof value !== "number") {
    return typeof value === "string" ? value : undefined;
  }

  return CompilerDom.DOMErrorCodes[value] ?? CompilerCore.ErrorCodes[value] ?? value;
}

function normalizeStructuredArtifact(value: unknown, parentKey?: string): unknown {
  const normalizedValue = parentKey ? normalizeEnumField(parentKey, value) : value;

  if (Array.isArray(normalizedValue)) {
    return normalizedValue.map((entry) => normalizeStructuredArtifact(entry));
  }

  if (normalizedValue && typeof normalizedValue === "object") {
    return Object.fromEntries(
      Object.entries(normalizedValue)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, normalizeStructuredArtifact(entry, key)]),
    );
  }

  return normalizedValue;
}

function collectScalarPointers(
  value: unknown,
  path: string = "",
  parentKey?: string,
): Array<{ pointer: string; equals: string | number | boolean | null }> {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectScalarPointers(entry, `${path}/${index}`));
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .filter(([key]) => !parserSkipKeys.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .flatMap(([key, entry]) => {
        const escaped = key.replace(/~/g, "~0").replace(/\//g, "~1");
        return collectScalarPointers(entry, `${path}/${escaped}`, key);
      });
  }

  if (value === undefined) {
    return [];
  }

  const normalizedValue = normalizeEnumField(parentKey ?? "", value) as
    | string
    | number
    | boolean
    | null;
  return [{ pointer: path || "/", equals: normalizedValue }];
}

function formatPointerAssertions(
  assertions: Array<{ pointer: string; equals: string | number | boolean | null }>,
  indent: string = "    ",
): string[] {
  if (assertions.length === 0) {
    return [];
  }

  const lines: string[] = [];
  lines.push(`${indent}ast {`);
  for (const assertion of assertions) {
    lines.push(`${indent}  new PointerAssertion {`);
    lines.push(`${indent}    pointer = ${JSON.stringify(assertion.pointer)}`);
    lines.push(`${indent}    equals = ${pklScalar(assertion.equals)}`);
    lines.push(`${indent}  }`);
  }
  lines.push(`${indent}}`);
  return lines;
}

function formatErrorPointerAssertions(
  assertions: Array<{ pointer: string; equals: string | number | boolean | null }>,
  indent: string = "    ",
): string[] {
  if (assertions.length === 0) {
    return [];
  }

  const lines: string[] = [];
  lines.push(`${indent}errors {`);
  for (const assertion of assertions) {
    lines.push(`${indent}  new PointerAssertion {`);
    lines.push(`${indent}    pointer = ${JSON.stringify(assertion.pointer)}`);
    lines.push(`${indent}    equals = ${pklScalar(assertion.equals)}`);
    lines.push(`${indent}  }`);
  }
  lines.push(`${indent}}`);
  return lines;
}

function descriptorExpectation(descriptor: SFCDescriptor): string[] {
  const styleLangs = descriptor.styles
    .map((style) => style.lang)
    .filter((value): value is string => Boolean(value));
  const lines: string[] = [];
  lines.push("    descriptor = new DescriptorExpectation {");
  lines.push(`      template = ${Boolean(descriptor.template)}`);
  lines.push(`      script = ${Boolean(descriptor.script)}`);
  lines.push(`      scriptSetup = ${Boolean(descriptor.scriptSetup)}`);
  lines.push(`      styles = ${descriptor.styles.length}`);
  lines.push(`      customBlocks = ${descriptor.customBlocks.length}`);
  if (descriptor.script?.lang) {
    lines.push(`      scriptLang = ${JSON.stringify(descriptor.script.lang)}`);
  }
  if (descriptor.scriptSetup?.lang) {
    lines.push(`      scriptSetupLang = ${JSON.stringify(descriptor.scriptSetup.lang)}`);
  }
  if (styleLangs.length > 0) {
    lines.push("      styleLangs {");
    for (const value of styleLangs) {
      lines.push(`        ${JSON.stringify(value)}`);
    }
    lines.push("      }");
  }
  lines.push(`      scopedStyles = ${descriptor.styles.filter((style) => style.scoped).length}`);
  lines.push("    }");
  return lines;
}

function formatUpstream(source: string, caseName: string): string[] {
  return [
    "upstream {",
    "  new UpstreamReference {",
    '    repository = "ubugeeei/vize"',
    `    source = ${JSON.stringify(source)}`,
    "    cases {",
    `      ${JSON.stringify(caseName)}`,
    "    }",
    "  }",
    "}",
  ];
}

function formatFeatures(features: string[]): string[] {
  return ["features {", ...features.map((feature) => `  ${JSON.stringify(feature)}`), "}"];
}

function formatProfile(profile: string | undefined): string[] {
  return profile ? [`profile = ${JSON.stringify(profile)}`, ""] : [];
}

function formatImportedInputOrigin(args: {
  copiedPath: string;
  source: string;
  caseName: string;
  originRepository?: string;
}): string[] {
  return [
    "inputOrigin = new ImportedInputOrigin {",
    `  copiedPath = ${JSON.stringify(args.copiedPath)}`,
    `  source = ${JSON.stringify(args.source)}`,
    `  caseName = ${JSON.stringify(args.caseName)}`,
    ...(args.originRepository
      ? [`  originRepository = ${JSON.stringify(args.originRepository)}`]
      : []),
    "}",
  ];
}

function formatOracle(oracle: OracleArgs): string[] {
  return [
    "oracle = new ReferenceOracle {",
    `  repository = ${JSON.stringify(oracle.repository)}`,
    `  moduleName = ${JSON.stringify(oracle.moduleName)}`,
    `  operation = ${JSON.stringify(oracle.operation)}`,
    ...(oracle.profile ? [`  profile = ${JSON.stringify(oracle.profile)}`] : []),
    ...(oracle.provisional ? ["  provisional = true"] : []),
    "}",
  ];
}

function formatVendoredSnapshotExpectation(
  snapshot: VizeExpectedSnapshotCase | null | undefined,
  indent: string = "  ",
): string[] {
  if (!snapshot) {
    return [];
  }

  const lines: string[] = [];
  pushAssignedString(lines, indent, "vendoredSnapshotOutput", snapshot.output);
  if (snapshot.options) {
    lines.push(`${indent}vendoredSnapshotOptions = ${JSON.stringify(snapshot.options)}`);
  }
  return lines;
}

function formatDiagnostics(
  diagnostics: Array<{ name: string; message: string; code?: string | number }>,
  indent: string = "  ",
): string[] {
  if (diagnostics.length === 0) {
    return [];
  }

  const lines: string[] = [];
  lines.push(`${indent}diagnostics {`);
  for (const diagnostic of diagnostics) {
    lines.push(`${indent}  new ErrorExpectation {`);
    lines.push(`${indent}    name = ${JSON.stringify(diagnostic.name)}`);
    pushAssignedString(lines, `${indent}    `, "message", diagnostic.message);
    if (diagnostic.code !== undefined) {
      lines.push(`${indent}    code = ${pklScalar(diagnostic.code)}`);
    }
    lines.push(`${indent}  }`);
  }
  lines.push(`${indent}}`);
  return lines;
}

function writeGeneratedFile(file: string, content: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${content.trimEnd()}\n`);
}

function cleanGeneratedSuites(root: string): void {
  const directories = [
    join(root, "testsuites", "parser", "template"),
    join(root, "testsuites", "compiler", "template"),
    join(root, "testsuites", "compiler", "sfc"),
  ];

  for (const directory of directories) {
    if (!existsSync(directory)) {
      continue;
    }
    for (const entry of readdirSync(directory)) {
      if (entry.startsWith("vize-") && entry.endsWith(".pkl")) {
        rmSync(join(directory, entry));
      }
    }
  }
}

function createParserSuite(
  args: BaseSuiteArgs & {
    input: string;
  },
): string {
  const errors: CompilerCore.CompilerError[] = [];
  const ast = CompilerCore.baseParse(args.input, {
    onError: (error) => {
      errors.push(error);
    },
  });
  const normalizedAst = normalizeStructuredArtifact(ast);
  const normalizedErrors = normalizeStructuredArtifact(errors);
  const astPointers = collectScalarPointers(normalizedAst);
  const errorPointers = collectScalarPointers(normalizedErrors);
  const lines: string[] = [];

  lines.push('amends "../../../schemas/ParserTestSuite.pkl"');
  lines.push("");
  lines.push(`id = ${JSON.stringify(args.id)}`);
  lines.push(`title = ${JSON.stringify(args.title)}`);
  lines.push('kind = "template-base-parse"');
  lines.push(`summary = ${JSON.stringify(args.summary)}`);
  lines.push("");
  lines.push(...formatFeatures(args.features));
  lines.push("");
  lines.push(...formatProfile(args.profile));
  lines.push(
    ...formatImportedInputOrigin({
      copiedPath: args.copiedPath,
      source: args.source,
      caseName: args.caseName,
      originRepository: "ubugeeei/vize",
    }),
  );
  lines.push("");
  lines.push(
    ...formatOracle({
      repository: "vuejs/core",
      moduleName: "@vue/compiler-core",
      operation: "baseParse",
    }),
  );
  lines.push("");
  lines.push(...formatUpstream(args.source, args.caseName));
  lines.push("");
  lines.push("input {");
  pushAssignedString(lines, "  ", "source", args.input);
  lines.push("}");
  lines.push("");
  lines.push("expect {");
  lines.push(`  errorCount = ${errors.length}`);
  pushAssignedString(lines, "  ", "normalizedAst", JSON.stringify(normalizedAst, null, 2));
  pushAssignedString(lines, "  ", "normalizedErrors", JSON.stringify(normalizedErrors, null, 2));
  lines.push(...formatPointerAssertions(astPointers, "  "));
  lines.push(...formatErrorPointerAssertions(errorPointers, "  "));
  lines.push("}");

  return lines.join("\n");
}

function createCompilerTemplateSuite(
  args: BaseSuiteArgs & {
    input: string;
  },
): string {
  const diagnostics: CompilerCore.CompilerError[] = [];
  const result = compileDomTemplate(args.input, {
    onError: (error) => {
      diagnostics.push(error);
    },
  });
  const helperNames = [...result.ast.helpers].map(
    (helper) => helperSymbolNames.get(helper) ?? String(helper),
  );
  const normalizedDiagnostics = diagnostics.map((diagnostic) => {
    const normalizedCode = normalizeCompilerErrorCode(diagnostic.code);
    return {
      name: diagnostic.name,
      message: normalizeDiagnosticText(diagnostic.message),
      ...(normalizedCode !== undefined ? { code: normalizedCode } : {}),
    };
  });
  const lines: string[] = [];

  lines.push('amends "../../../schemas/CompilerTestSuite.pkl"');
  lines.push("");
  lines.push(`id = ${JSON.stringify(args.id)}`);
  lines.push(`title = ${JSON.stringify(args.title)}`);
  lines.push('kind = "template-dom-compile"');
  lines.push(`summary = ${JSON.stringify(args.summary)}`);
  lines.push("");
  lines.push(...formatFeatures(args.features));
  lines.push("");
  lines.push(...formatProfile(args.profile));
  lines.push(
    ...formatImportedInputOrigin({
      copiedPath: args.copiedPath,
      source: args.source,
      caseName: args.caseName,
      originRepository: "ubugeeei/vize",
    }),
  );
  lines.push("");
  lines.push(
    ...formatOracle({
      repository: "vuejs/core",
      moduleName: "@vue/compiler-dom",
      operation: "compile",
      profile: args.profile,
    }),
  );
  lines.push("");
  lines.push(...formatUpstream(args.source, args.caseName));
  lines.push("");
  lines.push("input {");
  pushAssignedString(lines, "  ", "source", args.input);
  lines.push("}");
  lines.push("");
  lines.push("expect {");
  if (helperNames.length > 0) {
    lines.push("  helpers {");
    for (const name of helperNames) {
      lines.push("    new HelperExpectation {");
      lines.push(`      name = ${JSON.stringify(name)}`);
      lines.push("    }");
    }
    lines.push("  }");
  }
  lines.push(`  hoistCount = ${result.ast.hoists.length}`);
  lines.push(...formatDiagnostics(normalizedDiagnostics, "  "));
  pushAssignedString(lines, "  ", "normalizedCode", result.code);
  lines.push("}");

  return lines.join("\n");
}

function createCompilerErrorSuite(
  args: BaseSuiteArgs & {
    input: string;
  },
): string | null {
  let thrown: unknown;
  const capturedErrors: CompilerCore.CompilerError[] = [];

  try {
    compileDomTemplate(args.input, {
      onError: (error) => {
        capturedErrors.push(error);
      },
    });
  } catch (error) {
    thrown = error;
  }

  const resolvedError = capturedErrors[0] ?? thrown;

  if (!(resolvedError instanceof Error)) {
    return null;
  }

  const error = resolvedError as Error & { code?: string | number };
  const lines: string[] = [];

  lines.push('amends "../../../schemas/CompilerTestSuite.pkl"');
  lines.push("");
  lines.push(`id = ${JSON.stringify(args.id)}`);
  lines.push(`title = ${JSON.stringify(args.title)}`);
  lines.push('kind = "template-dom-compile"');
  lines.push(`summary = ${JSON.stringify(args.summary)}`);
  lines.push("");
  lines.push(...formatFeatures(args.features));
  lines.push("");
  lines.push(...formatProfile(args.profile));
  lines.push(
    ...formatImportedInputOrigin({
      copiedPath: args.copiedPath,
      source: args.source,
      caseName: args.caseName,
      originRepository: "ubugeeei/vize",
    }),
  );
  lines.push("");
  lines.push(
    ...formatOracle({
      repository: "vuejs/core",
      moduleName: "@vue/compiler-dom",
      operation: "compile",
      profile: args.profile,
    }),
  );
  lines.push("");
  lines.push(...formatUpstream(args.source, args.caseName));
  lines.push("");
  lines.push("input {");
  pushAssignedString(lines, "  ", "source", args.input);
  lines.push("}");
  lines.push("");
  lines.push("expect {");
  lines.push("  error = new ErrorExpectation {");
  lines.push(`    name = ${JSON.stringify(error.name)}`);
  pushAssignedString(lines, "    ", "message", error.message);
  const normalizedCode = normalizeCompilerErrorCode(error.code);
  if (normalizedCode != null) {
    lines.push(`    code = ${pklScalar(normalizedCode)}`);
  }
  lines.push("  }");
  lines.push("}");

  return lines.join("\n");
}

function createSfcSuite(
  args: BaseSuiteArgs & {
    input: string;
  },
): string {
  const filename = `${args.id}.vue`;
  const { descriptor } = parseSfc(args.input, {
    filename,
  });
  const scriptCapture =
    descriptor.script || descriptor.scriptSetup
      ? (() => {
          const warnings: string[] = [];
          const originalWarn = console.warn;
          console.warn = (...entries: unknown[]) => {
            warnings.push(entries.map((entry) => String(entry)).join(" "));
          };
          try {
            return {
              result: compileScript(descriptor, {
                id: args.id,
              } as ScriptCompileOptions),
              warnings,
            };
          } finally {
            console.warn = originalWarn;
          }
        })()
      : null;
  const templateResult = descriptor.template
    ? compileSfcTemplate({
        id: args.id,
        filename,
        source: descriptor.template.content,
        scoped: descriptor.styles.some((style) => style.scoped),
        compilerOptions: {
          bindingMetadata: scriptCapture?.result.bindings,
        } as TemplateDomCompileOptions,
      } as SfcTemplateCompileOptions)
    : null;

  if ((templateResult?.errors.length ?? 0) > 0) {
    throw new Error(`Unexpected SFC template errors for ${args.id}`);
  }

  const styleCodes = descriptor.styles
    .filter((style) => !style.lang || style.lang === "css")
    .map((style, index) =>
      compileStyle({
        source: style.content,
        filename,
        id: `${args.id}-style-${index}`,
        scoped: style.scoped,
      }),
    )
    .map((result) => {
      if (result.errors.length > 0) {
        throw new Error(`Unexpected SFC style errors for ${args.id}`);
      }
      return result.code;
    });

  const lines: string[] = [];
  lines.push('amends "../../../schemas/CompilerTestSuite.pkl"');
  lines.push("");
  lines.push(`id = ${JSON.stringify(args.id)}`);
  lines.push(`title = ${JSON.stringify(args.title)}`);
  lines.push('kind = "sfc-full-compile"');
  lines.push(`summary = ${JSON.stringify(args.summary)}`);
  lines.push("");
  lines.push(...formatFeatures(args.features));
  lines.push("");
  lines.push(...formatProfile(args.profile));
  lines.push(
    ...formatImportedInputOrigin({
      copiedPath: args.copiedPath,
      source: args.source,
      caseName: args.caseName,
      originRepository: "ubugeeei/vize",
    }),
  );
  lines.push("");
  lines.push(
    ...formatOracle({
      repository: "vuejs/core",
      moduleName: "@vue/compiler-sfc",
      operation: "parse + compileScript + compileTemplate + compileStyle",
      profile: args.profile,
    }),
  );
  lines.push("");
  lines.push(...formatUpstream(args.source, args.caseName));
  lines.push("");
  lines.push("input {");
  lines.push(`  filename = ${JSON.stringify(filename)}`);
  pushAssignedString(lines, "  ", "sfc", args.input);
  lines.push("}");
  lines.push("");
  lines.push("expect {");
  lines.push(...descriptorExpectation(descriptor));
  if (scriptCapture?.result.content) {
    pushAssignedString(lines, "  ", "normalizedCode", scriptCapture.result.content);
  }
  if (templateResult?.code) {
    pushAssignedString(lines, "  ", "templateCode", templateResult.code);
  }
  if (styleCodes.length > 0) {
    lines.push("  styleCodes {");
    for (const styleCode of styleCodes) {
      pushListingString(lines, "    ", styleCode);
    }
    lines.push("  }");
  }
  lines.push("}");

  return lines.join("\n");
}

function createCompilerSnapshotSuite(
  args: BaseSuiteArgs & {
    kind: "template-expected-snapshot" | "sfc-expected-snapshot";
    input: string;
  },
): string {
  const snapshot = args.vendoredSnapshot;

  if (!snapshot) {
    throw new Error(`Missing vendored snapshot for ${args.source} :: ${args.caseName}`);
  }

  const lines: string[] = [];
  lines.push('amends "../../../schemas/CompilerTestSuite.pkl"');
  lines.push("");
  lines.push(`id = ${JSON.stringify(args.id)}`);
  lines.push(`title = ${JSON.stringify(args.title)}`);
  lines.push(`kind = ${JSON.stringify(args.kind)}`);
  lines.push(`summary = ${JSON.stringify(args.summary)}`);
  lines.push("");
  lines.push(...formatFeatures(args.features));
  lines.push("");
  lines.push(...formatProfile(args.profile));
  lines.push(
    ...formatImportedInputOrigin({
      copiedPath: args.copiedPath,
      source: args.source,
      caseName: args.caseName,
      originRepository: "ubugeeei/vize",
    }),
  );
  lines.push("");
  lines.push(
    ...formatOracle({
      repository: "vuejs/core",
      moduleName: "minor/vapor compiler snapshot",
      operation: "copied snapshot oracle",
      profile: args.profile,
      provisional: true,
    }),
  );
  lines.push("");
  lines.push(...formatUpstream(args.source, args.caseName));
  lines.push("");
  lines.push("input {");
  if (args.kind === "sfc-expected-snapshot") {
    lines.push(`  filename = ${JSON.stringify(`${args.id}.vue`)}`);
    pushAssignedString(lines, "  ", "sfc", args.input);
  } else {
    pushAssignedString(lines, "  ", "source", args.input);
  }
  lines.push("}");
  lines.push("");
  lines.push("expect {");
  pushAssignedString(lines, "  ", "normalizedCode", snapshot.output);
  lines.push(...formatVendoredSnapshotExpectation(snapshot, "  "));
  lines.push("}");

  return lines.join("\n");
}

function writeRequirementDoc(args: {
  file: string;
  title: string;
  section: string;
  summary: string;
  rows: RequirementRow[];
}): void {
  const lines: string[] = [];
  lines.push(`# ${args.title}`);
  lines.push("");
  lines.push("## Scope");
  lines.push("");
  lines.push(args.summary);
  lines.push("");
  lines.push("## Requirements");
  lines.push("");
  lines.push("| Requirement | Statement | Test Suites |");
  lines.push("| --- | --- | --- |");
  for (const row of args.rows) {
    const references = row.references.map(({ id, path }) => `[\`${id}\`](${path})`).join(", ");
    lines.push(`| \`${row.id}\` | ${row.statement} | ${references} |`);
  }
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push(
    "This annex is generated from copied community fixture inputs. Unless a row explicitly says otherwise, expected parser/compiler artifacts are derived from the official `vuejs/core` implementation and stored statically in this repository.",
  );
  writeGeneratedFile(args.file, lines.join("\n"));
}

function uniqueSuiteName(
  prefix: string,
  testCase: VizeFixtureCase,
  seen: Map<string, number>,
): string {
  const base = `${prefix}-${slugify(testCase.name)}`;
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const root = packageRoot(import.meta.url);
  const upstreamRoot = resolve(args.upstream ?? join(provenanceVendorRoot(root), "ubugeeei-vize"));

  if (!existsSync(upstreamRoot)) {
    throw new Error(`Vize corpus root does not exist: ${upstreamRoot}`);
  }

  cleanGeneratedSuites(root);

  const fixtures = discoverVizeFixtureFiles(upstreamRoot).map((file) =>
    parseVizeFixtureFile(upstreamRoot, file),
  );

  const parserRows: RequirementRow[] = [];
  const compilerRows: RequirementRow[] = [];
  const skippedCases: string[] = [];

  for (const fixture of fixtures) {
    const directory = fixture.path.split("/")[2] ?? "";
    const base = basename(fixture.path, ".toml");
    const seen = new Map<string, number>();
    const references: Array<{ id: string; path: string }> = [];

    for (const testCase of fixture.cases) {
      const copiedPath = join("provenance", "vendor", "ubugeeei-vize", fixture.path).replaceAll(
        "\\",
        "/",
      );

      if (directory === "parser" || fixture.path === "tests/fixtures/errors/parse-errors.toml") {
        const suiteName = uniqueSuiteName(
          `vize-${slugify(directory || "parse")}-${slugify(base)}`,
          testCase,
          seen,
        );
        const file = join(root, "testsuites", "parser", "template", `${suiteName}.pkl`);
        const id = `parser.template.${suiteName}`;
        writeGeneratedFile(
          file,
          createParserSuite({
            id,
            title: `Imported parser input: ${testCase.name}`,
            summary: `Static parser conformance derived from copied input ${fixture.path} and the official vuejs/core parser oracle.`,
            features: [
              "parser.template",
              "imported.input",
              `imported.input.${directory || "parse"}`,
              `imported.input.${base}`,
            ],
            source: fixture.path,
            copiedPath,
            caseName: testCase.name,
            input: testCase.input,
          }),
        );
        references.push({ id, path: relative(join(root, "spec"), file).replaceAll("\\", "/") });
        continue;
      }

      if (fixture.path === "tests/fixtures/errors/transform-errors.toml") {
        const suiteName = uniqueSuiteName("vize-transform-errors", testCase, seen);
        const file = join(root, "testsuites", "compiler", "template", `${suiteName}.pkl`);
        const id = `compiler.template.${suiteName}`;
        try {
          writeGeneratedFile(
            file,
            createCompilerTemplateSuite({
              id,
              title: `Imported transform input: ${testCase.name}`,
              summary: `Static compiler conformance derived from copied input ${fixture.path} and the official vuejs/core compiler oracle, including exact diagnostics when emitted.`,
              features: [
                "compiler.template",
                "compiler.errors",
                "imported.input",
                `imported.input.${base}`,
              ],
              source: fixture.path,
              copiedPath,
              caseName: testCase.name,
              input: testCase.input,
            }),
          );
        } catch {
          const content = createCompilerErrorSuite({
            id,
            title: `Imported transform input: ${testCase.name}`,
            summary: `Static compiler conformance derived from copied input ${fixture.path} and the official vuejs/core compiler oracle.`,
            features: [
              "compiler.template",
              "compiler.errors",
              "imported.input",
              `imported.input.${base}`,
            ],
            source: fixture.path,
            copiedPath,
            caseName: testCase.name,
            input: testCase.input,
          });
          if (content === null) {
            skippedCases.push(`${fixture.path} :: ${testCase.name}`);
            continue;
          }
          writeGeneratedFile(file, content);
        }
        references.push({ id, path: relative(join(root, "spec"), file).replaceAll("\\", "/") });
        continue;
      }

      if (directory === "vdom") {
        const suiteName = uniqueSuiteName(`vize-vdom-${slugify(base)}`, testCase, seen);
        const file = join(root, "testsuites", "compiler", "template", `${suiteName}.pkl`);
        const id = `compiler.template.${suiteName}`;
        try {
          writeGeneratedFile(
            file,
            createCompilerTemplateSuite({
              id,
              title: `Imported template input: ${testCase.name}`,
              summary: `Static template compiler conformance derived from copied input ${fixture.path} and the official vuejs/core compiler oracle.`,
              features: [
                "compiler.template",
                "imported.input",
                "imported.input.vdom",
                `imported.input.${base}`,
              ],
              source: fixture.path,
              copiedPath,
              caseName: testCase.name,
              input: testCase.input,
            }),
          );
        } catch {
          skippedCases.push(`${fixture.path} :: ${testCase.name}`);
          continue;
        }
        references.push({ id, path: relative(join(root, "spec"), file).replaceAll("\\", "/") });
        continue;
      }

      if (directory === "sfc") {
        const suiteName = uniqueSuiteName(`vize-sfc-${slugify(base)}`, testCase, seen);
        const file = join(root, "testsuites", "compiler", "sfc", `${suiteName}.pkl`);
        const id = `compiler.sfc.${suiteName}`;
        try {
          writeGeneratedFile(
            file,
            createSfcSuite({
              id,
              title: `Imported SFC input: ${testCase.name}`,
              summary: `Static SFC compiler pipeline conformance derived from copied input ${fixture.path} and the official vuejs/core SFC oracle.`,
              features: [
                "compiler.sfc",
                "imported.input",
                "imported.input.sfc",
                `imported.input.${base}`,
              ],
              source: fixture.path,
              copiedPath,
              caseName: testCase.name,
              input: testCase.input,
            }),
          );
        } catch {
          skippedCases.push(`${fixture.path} :: ${testCase.name}`);
          continue;
        }
        references.push({ id, path: relative(join(root, "spec"), file).replaceAll("\\", "/") });
        continue;
      }

      if (directory === "vapor") {
        const vendoredSnapshot = loadVendoredVizeExpectedSnapshotCase(
          fixture.path,
          testCase.name,
          root,
        );
        const suiteName = uniqueSuiteName(`vize-vapor-${slugify(base)}`, testCase, seen);
        const file = join(root, "testsuites", "compiler", "template", `${suiteName}.pkl`);
        const id = `compiler.template.${suiteName}`;

        if (!vendoredSnapshot) {
          skippedCases.push(`${fixture.path} :: ${testCase.name}`);
          continue;
        }

        writeGeneratedFile(
          file,
          createCompilerSnapshotSuite({
            id,
            title: `Imported vapor input: ${testCase.name}`,
            summary: `Provisional Vapor compiler conformance derived from copied input ${fixture.path}. This suite remains snapshot-backed until an official vuejs/core Vapor oracle is vendored.`,
            features: [
              "compiler.template",
              "compiler.snapshot",
              "compiler.profile.vapor",
              "imported.input",
              "imported.input.vapor",
              `imported.input.${base}`,
            ],
            profile: "vapor",
            source: fixture.path,
            copiedPath,
            caseName: testCase.name,
            vendoredSnapshot,
            kind: "template-expected-snapshot",
            input: testCase.input,
          }),
        );
        references.push({ id, path: relative(join(root, "spec"), file).replaceAll("\\", "/") });
      }
    }

    if (references.length === 0) {
      continue;
    }

    if (directory === "parser" || fixture.path === "tests/fixtures/errors/parse-errors.toml") {
      parserRows.push({
        id: `IMP-PARSE-${parserRows.length + 1}`,
        statement: `The copied ${base} parser input corpus MUST remain executable as local parser test suites with static source and exact parser artifacts derived from the official vuejs/core parser implementation.`,
        references,
      });
      continue;
    }

    if (
      directory === "vdom" ||
      fixture.path === "tests/fixtures/errors/transform-errors.toml" ||
      directory === "sfc" ||
      directory === "vapor"
    ) {
      compilerRows.push({
        id: `IMP-CMP-${compilerRows.length + 1}`,
        statement:
          directory === "vapor"
            ? `The copied ${base} Vapor input corpus remains provisional. Until an official vuejs/core Vapor oracle is vendored, these suites MUST remain isolated under profile = "vapor" and MUST match the copied snapshot oracle exactly.`
            : `The copied ${base} compiler input corpus MUST remain executable as local compiler test suites with exact generated output and exact diagnostics derived from the official vuejs/core implementation.`,
        references,
      });
    }
  }

  writeRequirementDoc({
    file: join(root, "spec", "10-imported-parser-input-corpus.md"),
    title: "10. Imported Parser Input Corpus",
    section: "parser",
    summary:
      "This annex lifts copied community parser fixture inputs into local static parser test suites. Every linked suite MUST remain self-contained and MUST compare parser artifacts produced by the official vuejs/core parser implementation exactly.",
    rows: parserRows,
  });

  writeRequirementDoc({
    file: join(root, "spec", "11-imported-compiler-input-corpus.md"),
    title: "11. Imported Compiler Input Corpus",
    section: "compiler",
    summary:
      "This annex lifts copied community compiler fixture inputs into local static compiler test suites. Default-profile outputs and diagnostics MUST come from the official vuejs/core implementation; copied Vapor snapshots remain provisional until the official Vapor oracle is vendored.",
    rows: compilerRows,
  });

  console.log(
    `generated ${parserRows.reduce((sum, row) => sum + row.references.length, 0)} parser suites and ${compilerRows.reduce((sum, row) => sum + row.references.length, 0)} compiler suites; skipped ${skippedCases.length} cases`,
  );
}

main();
