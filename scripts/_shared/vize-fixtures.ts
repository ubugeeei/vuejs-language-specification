import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

export interface VizeFixtureCase {
  name: string;
  input: string;
  line: number;
  expected: Record<string, string | boolean | Array<string>>;
}

export interface VizeFixtureFile {
  path: string;
  mode?: string;
  testType?: string;
  cases: VizeFixtureCase[];
}

function unquote(value: string): string {
  if (value.startsWith('"')) {
    return JSON.parse(value) as string;
  }

  if (value.startsWith("'")) {
    return value.slice(1, -1);
  }

  return value;
}

function parseStringArray(value: string): string[] {
  return JSON.parse(value) as string[];
}

function parseMultilineString(
  lines: string[],
  index: number,
  quote: '"""' | "'''",
): {
  value: string;
  nextIndex: number;
} {
  const line = lines[index] ?? "";
  const start = line.indexOf(quote);
  const afterStart = line.slice(start + quote.length);

  if (afterStart.includes(quote)) {
    const end = afterStart.indexOf(quote);
    return {
      value: afterStart.slice(0, end),
      nextIndex: index,
    };
  }

  const chunks: string[] = [];
  if (afterStart.length > 0) {
    chunks.push(afterStart);
  }
  let nextIndex = index + 1;

  for (; nextIndex < lines.length; nextIndex += 1) {
    const current = lines[nextIndex] ?? "";
    const end = current.indexOf(quote);

    if (end >= 0) {
      chunks.push(current.slice(0, end));
      break;
    }

    chunks.push(current);
  }

  return {
    value: chunks.join("\n"),
    nextIndex,
  };
}

function parseValue(
  lines: string[],
  index: number,
  rawValue: string,
): {
  value: string | boolean | Array<string>;
  nextIndex: number;
} {
  const value = rawValue.trim();

  if (value.startsWith('"""')) {
    return parseMultilineString(lines, index, '"""');
  }

  if (value.startsWith("'''")) {
    return parseMultilineString(lines, index, "'''");
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    return {
      value: parseStringArray(value),
      nextIndex: index,
    };
  }

  if (value === "true" || value === "false") {
    return {
      value: value === "true",
      nextIndex: index,
    };
  }

  return {
    value: unquote(value),
    nextIndex: index,
  };
}

export function parseVizeFixtureFile(root: string, file: string): VizeFixtureFile {
  const lines = readFileSync(file, "utf8").split(/\r?\n/u);
  const cases: VizeFixtureCase[] = [];
  let currentCase: VizeFixtureCase | null = null;
  let inExpectedSection = false;
  let mode: string | undefined;
  let testType: string | undefined;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";

    if (line.length === 0 || line.startsWith("#")) {
      continue;
    }

    if (line === "[[cases]]") {
      if (currentCase !== null) {
        cases.push(currentCase);
      }

      currentCase = {
        name: "",
        input: "",
        line: index + 1,
        expected: {},
      };
      inExpectedSection = false;
      continue;
    }

    if (line === "[cases.expected]") {
      inExpectedSection = true;
      continue;
    }

    const separator = line.indexOf("=");
    if (separator < 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1).trim();
    const { value, nextIndex } = parseValue(lines, index, rawValue);
    index = nextIndex;

    if (currentCase === null) {
      if (key === "mode" && typeof value === "string") {
        mode = value;
      }

      if (key === "test_type" && typeof value === "string") {
        testType = value;
      }

      continue;
    }

    if (inExpectedSection) {
      currentCase.expected[key] = value;
      continue;
    }

    if (key === "name" && typeof value === "string") {
      currentCase.name = value;
      continue;
    }

    if (key === "input" && typeof value === "string") {
      currentCase.input = value;
    }
  }

  if (currentCase !== null) {
    cases.push(currentCase);
  }

  return {
    path: relative(root, file).replaceAll("\\", "/"),
    mode,
    testType,
    cases,
  };
}

export function discoverVizeFixtureFiles(root: string): string[] {
  return [
    "tests/fixtures/parser/attribute.toml",
    "tests/fixtures/parser/comment.toml",
    "tests/fixtures/parser/directive.toml",
    "tests/fixtures/parser/element.toml",
    "tests/fixtures/parser/interpolation.toml",
    "tests/fixtures/parser/text.toml",
    "tests/fixtures/errors/parse-errors.toml",
    "tests/fixtures/errors/transform-errors.toml",
    "tests/fixtures/sfc/basic.toml",
    "tests/fixtures/sfc/directives.toml",
    "tests/fixtures/sfc/patches.toml",
    "tests/fixtures/sfc/script-setup.toml",
    "tests/fixtures/vapor/component.toml",
    "tests/fixtures/vapor/edge-cases.toml",
    "tests/fixtures/vapor/element.toml",
    "tests/fixtures/vapor/v-bind.toml",
    "tests/fixtures/vapor/v-for.toml",
    "tests/fixtures/vapor/v-if.toml",
    "tests/fixtures/vapor/v-model.toml",
    "tests/fixtures/vapor/v-on.toml",
    "tests/fixtures/vapor/v-show.toml",
    "tests/fixtures/vapor/v-slot.toml",
    "tests/fixtures/vdom/component.toml",
    "tests/fixtures/vdom/directives.toml",
    "tests/fixtures/vdom/element.toml",
    "tests/fixtures/vdom/hoisting.toml",
    "tests/fixtures/vdom/patch-flags.toml",
    "tests/fixtures/vdom/v-bind.toml",
    "tests/fixtures/vdom/v-for.toml",
    "tests/fixtures/vdom/v-if.toml",
    "tests/fixtures/vdom/v-model.toml",
    "tests/fixtures/vdom/v-on.toml",
    "tests/fixtures/vdom/v-once.toml",
    "tests/fixtures/vdom/v-show.toml",
    "tests/fixtures/vdom/v-slot.toml",
  ].map((entry) => join(root, entry));
}
