/* oxlint-disable typescript-eslint/no-implied-eval */

import {
  MagicString,
  babelParse,
  compileScript,
  compileTemplate,
  parse as parseSfc,
} from "@vue/compiler-sfc";
import { mount } from "./dom.ts";
import { assert } from "./assert.ts";
import type { MountedApp } from "./dom.ts";
import type { RuntimeSourceInput } from "./types.ts";
import type { BindingMetadata } from "@vue/compiler-core";
import type { Component } from "vue";
import * as Vue from "vue";

const componentCache = new Map<string, Component>();

function hashString(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function parseNamedImports(specifierClause: string): string {
  return specifierClause
    .slice(1, -1)
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const [importedName, localName] = entry.split(/\s+as\s+/u).map((part) => part.trim());
      return localName === undefined ? importedName : `${importedName}: ${localName}`;
    })
    .join(", ");
}

function transformVueImport(specifierClause: string): string {
  const clause = specifierClause.trim();

  if (clause.startsWith("{") && clause.endsWith("}")) {
    return `const { ${parseNamedImports(clause)} } = Vue;`;
  }

  if (clause.startsWith("* as ")) {
    return `const ${clause.slice(5).trim()} = Vue;`;
  }

  if (!clause.includes(",")) {
    return `const ${clause} = Vue.default ?? Vue;`;
  }

  const [defaultImport, namedImport] = clause.split(/,(.+)/u).map((part) => part.trim());
  assert(namedImport !== undefined, "Combined Vue imports must include a named import clause");

  return [`const ${defaultImport} = Vue.default ?? Vue;`, transformVueImport(namedImport)].join(
    "\n",
  );
}

function rewriteVueImports(scriptContent: string): string {
  const rewritten = scriptContent.replace(
    /^import\s+(.+?)\s+from\s+["']vue["'];?$/gmu,
    (_, specifierClause: string) => transformVueImport(specifierClause),
  );

  if (/^\s*import\s+/mu.test(rewritten)) {
    throw new Error(
      'Runtime SFC inputs may only import from "vue" because runtime source evaluation is self-contained.',
    );
  }

  return rewritten;
}

function walkAst(
  node: unknown,
  visit: (node: { type?: string; start?: number; end?: number }) => void,
): void {
  if (node === null || typeof node !== "object") {
    return;
  }

  if ("type" in node) {
    visit(node as { type?: string; start?: number; end?: number });
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        walkAst(entry, visit);
      }
      continue;
    }

    walkAst(value, visit);
  }
}

function stripTypeSyntax(scriptContent: string): string {
  const ast = babelParse(scriptContent, {
    sourceType: "module",
    plugins: ["typescript"],
  });
  const magicString = new MagicString(scriptContent);
  const removals = new Map<number, number>();

  function removeRange(start: number | undefined, end: number | undefined): void {
    if (start === undefined || end === undefined || start >= end) {
      return;
    }

    removals.set(start, Math.max(removals.get(start) ?? start, end));
  }

  walkAst(ast, (node) => {
    switch (node.type) {
      case "TSTypeAnnotation":
      case "TSTypeParameterInstantiation":
      case "TSInterfaceDeclaration":
      case "TSTypeAliasDeclaration":
      case "TSDeclareFunction":
      case "TSModuleDeclaration":
        removeRange(node.start, node.end);
        break;
      case "ImportDeclaration":
        if ("importKind" in node && node.importKind === "type") {
          removeRange(node.start, node.end);
        }
        break;
      case "TSAsExpression":
      case "TSSatisfiesExpression":
      case "TSNonNullExpression":
        if (
          "expression" in node &&
          typeof node.expression === "object" &&
          node.expression !== null
        ) {
          removeRange((node.expression as { end?: number }).end, node.end);
        }
        break;
      default:
        break;
    }
  });

  for (const [start, end] of [...removals.entries()].sort((left, right) => right[0] - left[0])) {
    magicString.remove(start, end);
  }

  return magicString.toString();
}

function rewriteModuleToFactory(scriptContent: string): string {
  const strippedScript = stripTypeSyntax(scriptContent);
  const withoutVueImports = rewriteVueImports(strippedScript)
    .replace(/^export\s+\{[^}]+\};?\s*$/gmu, "")
    .replace(/^export\s+(const|let|var|function|async function|class)\s+/gmu, "$1 ");

  if (/^\s*export\s+/mu.test(withoutVueImports)) {
    throw new Error(
      "Runtime SFC inputs must not rely on named ESM exports when executed through the runtime harness.",
    );
  }

  return withoutVueImports;
}

function formatCompilerErrors(errors: Array<string | { message: string }>): string {
  return errors.map((error) => (typeof error === "string" ? error : error.message)).join("\n\n");
}

function compileSfcRender(
  input: RuntimeSourceInput,
  id: string,
  bindingMetadata: BindingMetadata | undefined,
): ((...args: unknown[]) => unknown) | null {
  const { descriptor } = parseSfc(input.source, {
    filename: input.filename,
  });

  if (descriptor.template === null) {
    return null;
  }

  const templateResult = compileTemplate({
    source: descriptor.template.content,
    filename: input.filename,
    id,
    compilerOptions: {
      bindingMetadata,
      mode: "function",
    },
  });

  if (templateResult.errors.length > 0) {
    throw new Error(
      `Failed to compile runtime template input ${input.filename}\n\n${formatCompilerErrors(templateResult.errors)}`,
    );
  }

  return new Function("Vue", templateResult.code)(Vue) as (...args: unknown[]) => unknown;
}

export function compileRuntimeInput(input: RuntimeSourceInput): Component {
  const cacheKey = `${input.kind}:${input.filename}:${hashString(input.source)}`;
  const cached = componentCache.get(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  const parseResult = parseSfc(input.source, {
    filename: input.filename,
  });

  if (parseResult.errors.length > 0) {
    throw new Error(
      `Failed to parse runtime SFC input ${input.filename}\n\n${formatCompilerErrors(parseResult.errors)}`,
    );
  }

  const { descriptor } = parseResult;

  if (descriptor.styles.length > 0 || descriptor.customBlocks.length > 0) {
    throw new Error(
      `Runtime SFC input ${input.filename} must not declare style or custom blocks in the current harness.`,
    );
  }

  const scriptResult =
    descriptor.script !== null || descriptor.scriptSetup !== null
      ? compileScript(descriptor, {
          id: cacheKey,
          genDefaultAs: "__default__",
          babelParserPlugins: ["typescript"],
        })
      : null;

  const render = compileSfcRender(input, cacheKey, scriptResult?.bindings);
  const scriptFactorySource =
    scriptResult === null
      ? "const __default__ = {};"
      : rewriteModuleToFactory(scriptResult.content);
  const component = new Function(
    "Vue",
    "render",
    `${scriptFactorySource}\nif (render !== null) { __default__.render = render; }\nreturn __default__;`,
  )(Vue, render) as Component;

  componentCache.set(cacheKey, component);
  return component;
}

export function mountRuntimeInput(input: RuntimeSourceInput): MountedApp {
  return mount(compileRuntimeInput(input));
}
