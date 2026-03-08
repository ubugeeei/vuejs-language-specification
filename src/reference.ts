import assert from "node:assert/strict";
import { parse as parseJavaScript } from "@babel/parser";
import { isExpression } from "@babel/types";
import * as CompilerCore from "@vue/compiler-core";
import * as CompilerDom from "@vue/compiler-dom";
import { compile as compileTemplate } from "@vue/compiler-dom";
import { compileScript, compileStyle, parse as parseSfc } from "@vue/compiler-sfc";
import type { SFCDescriptor } from "@vue/compiler-sfc";
import type {
  ArrayExpression,
  ArrowFunctionExpression,
  BooleanLiteral,
  CallExpression,
  Expression,
  File,
  FunctionExpression,
  Identifier,
  Node,
  NullLiteral,
  NumericLiteral,
  ObjectExpression,
  ObjectMethod,
  ObjectProperty,
  Statement,
  StringLiteral,
  VariableDeclarator,
} from "@babel/types";
import { getByJsonPointer } from "./pointers.ts";
import type {
  AliasExpectation,
  BindingExpectation,
  CompilerTestSuite,
  DefaultKindExpectation,
  LiteralExpectation,
  ParserTestSuite,
  PropConstructorExpectation,
  RuntimePropExpectation,
  SyntaxTestSuite,
  TypeEvaluationTestSuite,
} from "./types.ts";

interface ExtractedRuntimeProp {
  name: string;
  types: string[];
  required: boolean;
  skipCheck: boolean;
}

type ScriptCompileOptions = NonNullable<Parameters<typeof compileScript>[1]>;
type TemplateDomCompileOptions = Parameters<typeof compileTemplate>[1];
type ParserOptions = NonNullable<Parameters<typeof CompilerCore.baseParse>[1]>;
const ansiPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, "g");

const helperSymbolNames = new Map<symbol, string>(
  [...Object.entries(CompilerCore), ...Object.entries(CompilerDom)].flatMap(([name, value]) =>
    typeof value === "symbol" ? [[value, name] satisfies [symbol, string]] : [],
  ),
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeBindingType(value: unknown): string {
  if (typeof value === "string") {
    return value.replace(/_/g, "-").toLowerCase();
  }

  return String(value);
}

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function stripAnsi(value: string): string {
  return value.replace(ansiPattern, "");
}

function normalizeDiagnosticText(value: string): string {
  return normalizeNewlines(stripAnsi(value)).trimEnd();
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
    case "code":
      return CompilerCore.ErrorCodes[value] ?? value;
    default:
      return value;
  }
}

function normalizeStructuredArtifact(value: unknown, parentKey?: string): unknown {
  const normalizedValue = parentKey ? normalizeEnumField(parentKey, value) : value;

  if (Array.isArray(normalizedValue)) {
    return normalizedValue.map((entry) => normalizeStructuredArtifact(entry));
  }

  if (normalizedValue && typeof normalizedValue === "object") {
    return Object.fromEntries(
      Object.entries(normalizedValue).map(([key, entry]) => [
        key,
        normalizeStructuredArtifact(entry, key),
      ]),
    );
  }

  return normalizedValue;
}

function sortRecord<T extends string | number | boolean | null>(
  entries: Record<string, T>,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(entries).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function assertBindings(
  actualBindings: Record<string, unknown> | undefined,
  expectedBindings: BindingExpectation[] | undefined,
): void {
  if ((expectedBindings?.length ?? 0) === 0) {
    return;
  }

  const actual = sortRecord(
    Object.fromEntries(
      Object.entries(actualBindings ?? {})
        .filter(([, value]) => typeof value === "string")
        .map(([name, value]) => [name, normalizeBindingType(value)]),
    ),
  );
  const expected = sortRecord(
    Object.fromEntries(
      expectedBindings!.map((expectation) => [expectation.name, expectation.kind]),
    ),
  );

  assert.deepEqual(actual, expected);
}

function assertPointerAssertions(
  value: unknown,
  assertions: Array<{ pointer: string; equals: string | number | boolean | null }> | undefined,
): void {
  for (const pointerAssertion of assertions ?? []) {
    const actual = getByJsonPointer(value, pointerAssertion.pointer);
    assert.deepEqual(actual, pointerAssertion.equals);
  }
}

function normalizeHelperName(value: symbol): string {
  const name = helperSymbolNames.get(value);
  assert.ok(name, `Unknown Vue compiler helper: ${String(value)}`);
  return name;
}

function normalizeCompilerErrorCode(value: unknown): string | number | undefined {
  if (typeof value !== "number") {
    return typeof value === "string" ? value : undefined;
  }

  return CompilerDom.DOMErrorCodes[value] ?? CompilerCore.ErrorCodes[value] ?? value;
}

function assertHelpers(
  actualHelpers: Iterable<symbol>,
  expectedHelpers: CompilerTestSuite["expect"]["helpers"],
): void {
  if ((expectedHelpers?.length ?? 0) === 0) {
    return;
  }

  const actual = [...actualHelpers].map(normalizeHelperName).sort();
  const expected = expectedHelpers!.map((expectation) => expectation.name).sort();

  assert.deepEqual(actual, expected);
}

function assertExactError(error: unknown, expected: CompilerTestSuite["expect"]["error"]): void {
  assert.ok(expected, "Expected compiler error expectation");
  assert.ok(error instanceof Error, "Expected thrown value to be an Error");
  assert.equal(error.name, expected.name);
  assert.equal(normalizeDiagnosticText(error.message), normalizeDiagnosticText(expected.message));
  if (expected.code !== undefined) {
    const actualCode = normalizeCompilerErrorCode(
      error && typeof error === "object" && "code" in error ? error.code : undefined,
    );
    assert.equal(actualCode, expected.code);
  }
}

function assertWarnings(
  actualWarnings: string[],
  expectedWarnings: CompilerTestSuite["expect"]["warnings"],
): void {
  const actual = actualWarnings.map((warning) => normalizeDiagnosticText(warning));
  const expected = (expectedWarnings ?? []).map((warning) =>
    normalizeDiagnosticText(warning.message),
  );

  assert.deepEqual(actual, expected);
}

function captureWarnings<T>(run: () => T): { result: T; warnings: string[] } {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map((entry) => String(entry)).join(" "));
  };

  try {
    return {
      result: run(),
      warnings,
    };
  } finally {
    console.warn = originalWarn;
  }
}

function createDescriptor(testSuite: SyntaxTestSuite): SFCDescriptor {
  const { descriptor } = parseSfc(testSuite.input.source, {
    filename: testSuite.input.filename,
  });
  return descriptor;
}

function parseGeneratedScript(source: string): File {
  return parseJavaScript(source, {
    sourceType: "module",
    plugins: ["typescript"],
  });
}

function isObjectExpression(node: Node | null | undefined): node is ObjectExpression {
  return node?.type === "ObjectExpression";
}

function isObjectProperty(node: Node | null | undefined): node is ObjectProperty {
  return node?.type === "ObjectProperty";
}

function isObjectMethod(node: Node | null | undefined): node is ObjectMethod {
  return node?.type === "ObjectMethod";
}

function isFunctionExpression(
  node: Expression | null | undefined,
): node is FunctionExpression | ArrowFunctionExpression {
  return node?.type === "FunctionExpression" || node?.type === "ArrowFunctionExpression";
}

function isIdentifier(node: Node | null | undefined): node is Identifier {
  return node?.type === "Identifier";
}

function isStringLiteral(node: Node | null | undefined): node is StringLiteral {
  return node?.type === "StringLiteral";
}

function isNumericLiteral(node: Node | null | undefined): node is NumericLiteral {
  return node?.type === "NumericLiteral";
}

function isBooleanLiteral(node: Node | null | undefined): node is BooleanLiteral {
  return node?.type === "BooleanLiteral";
}

function isNullLiteral(node: Node | null | undefined): node is NullLiteral {
  return node?.type === "NullLiteral";
}

function isArrayExpression(node: Node | null | undefined): node is ArrayExpression {
  return node?.type === "ArrayExpression";
}

function isCallExpression(node: Node | null | undefined): node is CallExpression {
  return node?.type === "CallExpression";
}

function unwrapExpression(expression: Expression): Expression {
  switch (expression.type) {
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "TSInstantiationExpression":
    case "TSNonNullExpression":
    case "TypeCastExpression":
      return unwrapExpression(expression.expression);
    case "ParenthesizedExpression":
      return unwrapExpression(expression.expression);
    default:
      return expression;
  }
}

function expectExpression(value: Node | null | undefined, context: string): Expression {
  assert.ok(value && isExpression(value), `Expected ${context} to be an expression`);
  return value;
}

function getStaticPropertyName(property: ObjectProperty | ObjectMethod): string | null {
  if (property.computed) {
    return null;
  }

  if (isIdentifier(property.key)) {
    return property.key.name;
  }

  if (isStringLiteral(property.key)) {
    return property.key.value;
  }

  return null;
}

function getObjectEntries(value: ObjectExpression): Array<ObjectProperty | ObjectMethod> {
  const entries: Array<ObjectProperty | ObjectMethod> = [];

  for (const property of value.properties) {
    if (isObjectProperty(property) || isObjectMethod(property)) {
      entries.push(property);
      continue;
    }

    const argument = unwrapExpression(expectExpression(property.argument, "object spread"));
    assert.ok(
      isObjectExpression(argument),
      `Expected spread argument to be an object expression, received ${argument.type}`,
    );
    entries.push(...getObjectEntries(argument));
  }

  return entries;
}

function getObjectMember(
  value: ObjectExpression,
  name: string,
): ObjectProperty | ObjectMethod | undefined {
  return getObjectEntries(value).find((property) => getStaticPropertyName(property) === name);
}

function getRequiredObjectProperty(value: ObjectExpression, name: string): ObjectProperty {
  const property = getObjectMember(value, name);
  assert.ok(property, `Expected object property "${name}"`);
  assert.ok(isObjectProperty(property), `Expected "${name}" to be an object property`);
  return property;
}

function getOptionalObjectPropertyValue(
  value: ObjectExpression,
  name: string,
): Expression | undefined {
  const property = getObjectMember(value, name);
  if (!property) {
    return undefined;
  }

  assert.ok(isObjectProperty(property), `Expected "${name}" to be an object property`);
  return unwrapExpression(expectExpression(property.value, `"${name}"`));
}

function getCallArguments(call: CallExpression, context: string): Expression[] {
  return call.arguments.map((argument, index) => {
    assert.notEqual(
      argument.type,
      "SpreadElement",
      `Unexpected spread argument at ${context}[${index}]`,
    );
    assert.notEqual(
      argument.type,
      "ArgumentPlaceholder",
      `Unexpected placeholder at ${context}[${index}]`,
    );
    return unwrapExpression(expectExpression(argument, `${context}[${index}]`));
  });
}

function expectObjectExpression(value: Expression, context: string): ObjectExpression {
  const expression = unwrapExpression(value);
  assert.ok(isObjectExpression(expression), `Expected ${context} to be an object expression`);
  return expression;
}

function getPropsExpression(componentOptions: ObjectExpression): Expression {
  return unwrapExpression(
    expectExpression(getRequiredObjectProperty(componentOptions, "props").value, '"props"'),
  );
}

function getPropEntries(value: Expression, context: string): ObjectProperty[] {
  const expression = unwrapExpression(value);

  if (isObjectExpression(expression)) {
    return getObjectEntries(expression).filter((property): property is ObjectProperty =>
      isObjectProperty(property),
    );
  }

  if (isCallExpression(expression)) {
    const callee = expression.callee;
    assert.ok(isIdentifier(callee), `Expected ${context} helper callee to be an identifier`);

    if (callee.name === "_mergeDefaults") {
      const [base] = getCallArguments(expression, context);
      assert.ok(base, `Expected base props object in ${context}`);
      return getPropEntries(base, `${context}.base`);
    }

    if (callee.name === "_mergeModels") {
      return getCallArguments(expression, context).flatMap((argument, index) =>
        getPropEntries(argument, `${context}[${index}]`),
      );
    }
  }

  assert.fail(`Unsupported props expression for ${context}: ${expression.type}`);
}

function getDefaultExportObject(file: File): ObjectExpression {
  const exportDefault = file.program.body.find(
    (statement) => statement.type === "ExportDefaultDeclaration",
  );
  assert.ok(exportDefault, "Expected a default export in generated output");

  const declaration = exportDefault.declaration;
  assert.notEqual(
    declaration.type,
    "FunctionDeclaration",
    "Expected component options export, not a function declaration",
  );
  assert.notEqual(
    declaration.type,
    "ClassDeclaration",
    "Expected component options export, not a class declaration",
  );

  const expression = unwrapExpression(expectExpression(declaration, "default export"));
  if (isObjectExpression(expression)) {
    return expression;
  }

  assert.ok(isCallExpression(expression), "Expected default export to be a call expression");
  for (const argument of [...expression.arguments].reverse()) {
    assert.notEqual(argument.type, "SpreadElement", "Unexpected spread in default export call");
    assert.notEqual(argument.type, "ArgumentPlaceholder", "Unsupported call placeholder");

    const maybeObject = unwrapExpression(expectExpression(argument, "default export argument"));
    if (isObjectExpression(maybeObject)) {
      return maybeObject;
    }
  }

  assert.fail("Expected an object expression within the default export call");
}

function getSetupStatements(componentOptions: ObjectExpression): Statement[] {
  const setup = getObjectMember(componentOptions, "setup");
  assert.ok(setup, 'Expected a "setup" entry in component options');

  if (isObjectMethod(setup)) {
    return setup.body.body;
  }

  const value = unwrapExpression(expectExpression(setup.value, '"setup"'));
  assert.ok(isFunctionExpression(value), 'Expected "setup" to be a function');
  assert.equal(value.body.type, "BlockStatement", 'Expected "setup" body to be a block');
  return value.body.body;
}

function getVariableDeclarator(
  statements: Statement[],
  name: string,
): VariableDeclarator | undefined {
  for (const statement of statements) {
    if (statement.type !== "VariableDeclaration") {
      continue;
    }

    for (const declaration of statement.declarations) {
      if (isIdentifier(declaration.id) && declaration.id.name === name) {
        return declaration;
      }
    }
  }

  return undefined;
}

function getVariableDeclaratorInScopes(
  scopes: readonly Statement[][],
  name: string,
): VariableDeclarator | undefined {
  for (const scope of scopes) {
    const declaration = getVariableDeclarator(scope, name);
    if (declaration) {
      return declaration;
    }
  }

  return undefined;
}

function extractConstructorNames(value: Expression | undefined, context: string): string[] {
  if (!value) {
    return [];
  }

  const expression = unwrapExpression(value);
  if (isIdentifier(expression)) {
    return [expression.name];
  }

  if (isArrayExpression(expression)) {
    return expression.elements.map((element, index) => {
      assert.ok(element, `Expected constructor at ${context}[${index}]`);
      assert.notEqual(element.type, "SpreadElement", `Unexpected spread at ${context}[${index}]`);
      assert.notEqual(
        element.type,
        "ArgumentPlaceholder",
        `Unexpected placeholder at ${context}[${index}]`,
      );

      const constructorExpression = unwrapExpression(
        expectExpression(element, `${context}[${index}]`),
      );
      assert.ok(
        isIdentifier(constructorExpression),
        `Expected constructor identifier at ${context}[${index}]`,
      );
      return constructorExpression.name;
    });
  }

  if (isNullLiteral(expression)) {
    return [];
  }

  assert.fail(`Unsupported runtime constructor expression for ${context}: ${expression.type}`);
}

function extractBoolean(
  value: Expression | undefined,
  fallback: boolean,
  context: string,
): boolean {
  if (!value) {
    return fallback;
  }

  const expression = unwrapExpression(value);
  assert.ok(isBooleanLiteral(expression), `Expected boolean literal for ${context}`);
  return expression.value;
}

function extractLiteralValue(
  value: Expression | undefined,
  context: string,
): string | number | boolean | null {
  assert.ok(value, `Expected literal expression for ${context}`);
  const expression = unwrapExpression(value);

  if (isStringLiteral(expression)) {
    return expression.value;
  }

  if (isNumericLiteral(expression)) {
    return expression.value;
  }

  if (isBooleanLiteral(expression)) {
    return expression.value;
  }

  if (isNullLiteral(expression)) {
    return null;
  }

  assert.fail(`Unsupported literal expression for ${context}: ${expression.type}`);
}

function extractPropConstructors(componentOptions: ObjectExpression): Record<string, string> {
  return Object.fromEntries(
    getPropEntries(getPropsExpression(componentOptions), 'component "props"').flatMap(
      (property) => {
        const name = getStaticPropertyName(property);
        assert.ok(name, "Expected runtime prop name");
        const value = unwrapExpression(expectExpression(property.value, `"${name}"`));

        if (isIdentifier(value)) {
          return [[name, value.name] satisfies [string, string]];
        }

        if (isObjectExpression(value)) {
          const constructors = extractConstructorNames(
            getOptionalObjectPropertyValue(value, "type"),
            `${name}.type`,
          );

          if (constructors.length === 1) {
            const [constructorName] = constructors;
            assert.ok(constructorName, `Expected constructor name for "${name}"`);
            return [[name, constructorName] satisfies [string, string]];
          }
        }

        return [];
      },
    ),
  );
}

function assertPropConstructors(
  componentOptions: ObjectExpression,
  expectedConstructors: PropConstructorExpectation[] | undefined,
): void {
  if ((expectedConstructors?.length ?? 0) === 0) {
    return;
  }

  const actual = sortRecord(extractPropConstructors(componentOptions));
  const expected = sortRecord(
    Object.fromEntries(
      expectedConstructors!.map((expectation) => [expectation.name, expectation.constructor]),
    ),
  );

  assert.deepEqual(actual, expected);
}

function extractPropDefaults(
  componentOptions: ObjectExpression,
): Record<string, string | number | boolean | null> {
  function collectDefaults(
    value: Expression,
    context: string,
  ): Record<string, string | number | boolean | null> {
    const expression = unwrapExpression(value);

    if (isObjectExpression(expression)) {
      return Object.fromEntries(
        getObjectEntries(expression).flatMap((property) => {
          assert.ok(
            isObjectProperty(property),
            "Expected runtime prop entry to be an object property",
          );
          const name = getStaticPropertyName(property);
          assert.ok(name, "Expected runtime prop name");
          const propValue = unwrapExpression(expectExpression(property.value, `"${name}"`));

          if (!isObjectExpression(propValue)) {
            return [];
          }

          const defaultValue = getOptionalObjectPropertyValue(propValue, "default");
          if (!defaultValue) {
            return [];
          }

          return [
            [name, extractLiteralValue(defaultValue, `${name}.default`)] satisfies [
              string,
              string | number | boolean | null,
            ],
          ];
        }),
      );
    }

    if (isCallExpression(expression)) {
      const callee = expression.callee;
      assert.ok(isIdentifier(callee), `Expected ${context} helper callee to be an identifier`);
      const arguments_ = getCallArguments(expression, context);

      if (callee.name === "_mergeDefaults") {
        const [base, defaults] = arguments_;
        assert.ok(base, `Expected base props object in ${context}`);
        const resolved = collectDefaults(base, `${context}.base`);

        if (defaults) {
          const defaultObject = expectObjectExpression(defaults, `${context}.defaults`);
          for (const property of getObjectEntries(defaultObject)) {
            assert.ok(
              isObjectProperty(property),
              "Expected mergeDefaults entry to be an object property",
            );
            const name = getStaticPropertyName(property);
            assert.ok(name, "Expected mergeDefaults default name");
            if (name.startsWith("__skip")) {
              continue;
            }

            resolved[name] = extractLiteralValue(
              unwrapExpression(expectExpression(property.value, `"${name}" default`)),
              `${name}.default`,
            );
          }
        }

        return resolved;
      }

      if (callee.name === "_mergeModels") {
        return Object.assign(
          {},
          ...arguments_.map((argument, index) => collectDefaults(argument, `${context}[${index}]`)),
        );
      }
    }

    return {};
  }

  return sortRecord(collectDefaults(getPropsExpression(componentOptions), 'component "props"'));
}

function classifyDefaultExpressionKind(value: Expression | undefined): string {
  assert.ok(value, "Expected default expression");
  const expression = unwrapExpression(value);

  if (
    isStringLiteral(expression) ||
    isNumericLiteral(expression) ||
    isBooleanLiteral(expression) ||
    isNullLiteral(expression)
  ) {
    return "literal";
  }

  if (isFunctionExpression(expression)) {
    return "callable";
  }

  if (isIdentifier(expression)) {
    return "identifier";
  }

  if (isObjectExpression(expression)) {
    return "object";
  }

  return expression.type;
}

function assertPropDefaults(
  componentOptions: ObjectExpression,
  expectedDefaults: LiteralExpectation[] | undefined,
): void {
  if ((expectedDefaults?.length ?? 0) === 0) {
    return;
  }

  const actual = extractPropDefaults(componentOptions);
  const expected = sortRecord(
    Object.fromEntries(
      expectedDefaults!.map((expectation) => [expectation.name, expectation.value]),
    ),
  );

  assert.deepEqual(actual, expected);
}

function extractPropDefaultKinds(componentOptions: ObjectExpression): Record<string, string> {
  function collectDefaultKinds(value: Expression, context: string): Record<string, string> {
    const expression = unwrapExpression(value);

    if (isObjectExpression(expression)) {
      return Object.fromEntries(
        getObjectEntries(expression).flatMap((property) => {
          assert.ok(
            isObjectProperty(property),
            "Expected runtime prop entry to be an object property",
          );
          const name = getStaticPropertyName(property);
          assert.ok(name, "Expected runtime prop name");
          const propValue = unwrapExpression(expectExpression(property.value, `"${name}"`));

          if (!isObjectExpression(propValue)) {
            return [];
          }

          const defaultValue = getOptionalObjectPropertyValue(propValue, "default");
          if (!defaultValue) {
            return [];
          }

          return [[name, classifyDefaultExpressionKind(defaultValue)] satisfies [string, string]];
        }),
      );
    }

    if (isCallExpression(expression)) {
      const callee = expression.callee;
      assert.ok(isIdentifier(callee), `Expected ${context} helper callee to be an identifier`);
      const arguments_ = getCallArguments(expression, context);

      if (callee.name === "_mergeDefaults") {
        const [base, defaults] = arguments_;
        assert.ok(base, `Expected base props object in ${context}`);
        const resolved = collectDefaultKinds(base, `${context}.base`);

        if (defaults) {
          const defaultObject = expectObjectExpression(defaults, `${context}.defaults`);
          for (const property of getObjectEntries(defaultObject)) {
            assert.ok(
              isObjectProperty(property),
              "Expected mergeDefaults entry to be an object property",
            );
            const name = getStaticPropertyName(property);
            assert.ok(name, "Expected mergeDefaults default name");
            if (name.startsWith("__skip")) {
              continue;
            }

            resolved[name] = classifyDefaultExpressionKind(
              unwrapExpression(expectExpression(property.value, `"${name}" default`)),
            );
          }
        }

        return resolved;
      }

      if (callee.name === "_mergeModels") {
        return Object.assign(
          {},
          ...arguments_.map((argument, index) =>
            collectDefaultKinds(argument, `${context}[${index}]`),
          ),
        );
      }
    }

    return {};
  }

  return sortRecord(collectDefaultKinds(getPropsExpression(componentOptions), 'component "props"'));
}

function assertPropDefaultKinds(
  componentOptions: ObjectExpression,
  expectedDefaultKinds: DefaultKindExpectation[] | undefined,
): void {
  if ((expectedDefaultKinds?.length ?? 0) === 0) {
    return;
  }

  const actual = extractPropDefaultKinds(componentOptions);
  const expected = sortRecord(
    Object.fromEntries(
      expectedDefaultKinds!.map((expectation) => [expectation.name, expectation.kind]),
    ),
  );

  assert.deepEqual(actual, expected);
}

function assertAliases(
  setupStatements: Statement[],
  expectedAliases: AliasExpectation[] | undefined,
): void {
  for (const expectation of expectedAliases ?? []) {
    const declaration = getVariableDeclarator(setupStatements, expectation.localName);
    assert.ok(declaration, `Expected alias "${expectation.localName}"`);
    assert.ok(declaration.init, `Expected alias initializer for "${expectation.localName}"`);
    const initializer = unwrapExpression(
      expectExpression(declaration.init, `"${expectation.localName}" alias`),
    );
    assert.ok(
      isIdentifier(initializer),
      `Expected "${expectation.localName}" to alias an identifier`,
    );
    assert.equal(
      initializer.name,
      expectation.source,
      `Alias source mismatch for "${expectation.localName}"`,
    );
  }
}

function extractEmitNames(value: Expression, context: string): string[] {
  const expression = unwrapExpression(value);

  if (isArrayExpression(expression)) {
    return expression.elements.map((element, index) => {
      assert.ok(element, `Expected emits entry at ${context}[${index}]`);
      assert.notEqual(element.type, "SpreadElement", `Unexpected spread at ${context}[${index}]`);
      assert.notEqual(
        element.type,
        "ArgumentPlaceholder",
        `Unexpected placeholder at ${context}[${index}]`,
      );
      const emitName = unwrapExpression(expectExpression(element, `${context}[${index}]`));
      assert.ok(isStringLiteral(emitName), `Expected string literal at ${context}[${index}]`);
      return emitName.value;
    });
  }

  if (isObjectExpression(expression)) {
    return getObjectEntries(expression).map((property) => {
      const name = getStaticPropertyName(property);
      assert.ok(name, "Expected emits object member name");
      return name;
    });
  }

  if (isCallExpression(expression)) {
    const callee = expression.callee;
    assert.ok(isIdentifier(callee), `Expected ${context} helper callee to be an identifier`);

    if (callee.name === "_mergeModels") {
      return getCallArguments(expression, context).flatMap((argument, index) =>
        extractEmitNames(argument, `${context}[${index}]`),
      );
    }
  }

  assert.fail(`Unsupported emits expression for ${context}: ${expression.type}`);
}

function extractEmits(componentOptions: ObjectExpression): string[] {
  const value = getOptionalObjectPropertyValue(componentOptions, "emits");
  if (!value) {
    return [];
  }

  return extractEmitNames(value, 'component "emits"');
}

function assertEmits(
  componentOptions: ObjectExpression,
  expectedEmits: string[] | undefined,
): void {
  if ((expectedEmits?.length ?? 0) === 0) {
    return;
  }

  const actual = [...extractEmits(componentOptions)].sort();
  const expected = [...expectedEmits!].sort();

  assert.deepEqual(actual, expected);
}

function assertLiterals(
  scopes: readonly Statement[][],
  expectedLiterals: LiteralExpectation[] | undefined,
): void {
  for (const expectation of expectedLiterals ?? []) {
    const declaration = getVariableDeclaratorInScopes(scopes, expectation.name);
    assert.ok(declaration, `Expected literal declaration "${expectation.name}"`);
    const actual = extractLiteralValue(declaration.init ?? undefined, expectation.name);
    assert.deepEqual(actual, expectation.value, `Literal mismatch for "${expectation.name}"`);
  }
}

function extractRuntimeProps(componentOptions: ObjectExpression): ExtractedRuntimeProp[] {
  return getPropEntries(getPropsExpression(componentOptions), 'component "props"')
    .map((property) => {
      const name = getStaticPropertyName(property);
      assert.ok(name, "Expected runtime prop name");
      const value = unwrapExpression(expectExpression(property.value, `"${name}"`));

      if (!isObjectExpression(value)) {
        return {
          name,
          types: extractConstructorNames(value, `${name}.type`),
          required: false,
          skipCheck: false,
        };
      }

      return {
        name,
        types: extractConstructorNames(
          getOptionalObjectPropertyValue(value, "type"),
          `${name}.type`,
        ),
        required: extractBoolean(
          getOptionalObjectPropertyValue(value, "required"),
          false,
          `${name}.required`,
        ),
        skipCheck: extractBoolean(
          getOptionalObjectPropertyValue(value, "skipCheck"),
          false,
          `${name}.skipCheck`,
        ),
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function assertRuntimeProps(
  componentOptions: ObjectExpression,
  expectedProps: RuntimePropExpectation[],
): void {
  const actual = extractRuntimeProps(componentOptions);
  const expected = [...expectedProps]
    .map((expectation) => ({
      name: expectation.name,
      types: [...expectation.types],
      required: expectation.required,
      skipCheck: expectation.skipCheck ?? false,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  assert.deepEqual(actual, expected);
}

export function runSyntaxReferenceTestSuite(testSuite: SyntaxTestSuite): void {
  const descriptor = createDescriptor(testSuite);
  assert.equal(Boolean(descriptor.template), testSuite.expect.descriptor.template);
  assert.equal(Boolean(descriptor.script), testSuite.expect.descriptor.script);
  assert.equal(Boolean(descriptor.scriptSetup), testSuite.expect.descriptor.scriptSetup);
  assert.equal(descriptor.styles.length, testSuite.expect.descriptor.styles);
  assert.equal(descriptor.customBlocks.length, testSuite.expect.descriptor.customBlocks);
  assert.equal(descriptor.script?.lang ?? null, testSuite.expect.descriptor.scriptLang ?? null);
  assert.equal(
    descriptor.scriptSetup?.lang ?? null,
    testSuite.expect.descriptor.scriptSetupLang ?? null,
  );
  assert.deepEqual(
    descriptor.styles.map((style) => style.lang).filter((value): value is string => Boolean(value)),
    testSuite.expect.descriptor.styleLangs ?? [],
  );
  assert.equal(
    descriptor.styles.filter((style) => style.scoped).length,
    testSuite.expect.descriptor.scopedStyles ?? 0,
  );

  for (const fragment of testSuite.expect.templateContentIncludes ?? []) {
    assert.match(descriptor.template?.content ?? "", new RegExp(escapeRegExp(fragment)));
  }
}

export function runParserReferenceTestSuite(testSuite: ParserTestSuite): void {
  const errors: CompilerCore.CompilerError[] = [];
  const parserOptions: ParserOptions = {
    onError: (error) => {
      errors.push(error);
    },
  };

  if (testSuite.input.comments !== undefined) {
    parserOptions.comments = testSuite.input.comments;
  }

  const ast = CompilerCore.baseParse(testSuite.input.source, parserOptions);

  assert.equal(errors.length, testSuite.expect.errorCount);
  assertPointerAssertions(normalizeStructuredArtifact(ast), testSuite.expect.ast);
  assertPointerAssertions(normalizeStructuredArtifact(errors), testSuite.expect.errors);
}

export function runCompilerReferenceTestSuite(testSuite: CompilerTestSuite): void {
  if (testSuite.expect.error) {
    let thrown: unknown;

    try {
      switch (testSuite.kind) {
        case "template-dom-compile":
          compileTemplate(
            testSuite.input.source ?? "",
            testSuite.input.compilerOptions as TemplateDomCompileOptions,
          );
          break;
        case "sfc-script-compile": {
          const { descriptor } = parseSfc(testSuite.input.sfc ?? "", {
            filename: testSuite.input.filename ?? `${testSuite.id}.vue`,
          });
          const scriptOptions = testSuite.input.scriptOptions;
          captureWarnings(() =>
            compileScript(descriptor, {
              ...scriptOptions,
              id: scriptOptions?.id ?? testSuite.id,
            } as ScriptCompileOptions),
          );
          break;
        }
        case "sfc-style-compile":
          compileStyle({
            source: testSuite.input.source ?? "",
            filename: testSuite.input.filename ?? `${testSuite.id}.css`,
            id: testSuite.input.styleOptions?.id ?? testSuite.id,
            scoped: Boolean(testSuite.input.styleOptions?.scoped),
          });
          break;
      }
    } catch (error) {
      thrown = error;
    }

    assertExactError(thrown, testSuite.expect.error);
    return;
  }

  switch (testSuite.kind) {
    case "template-dom-compile": {
      const compilerOptions = {
        ...(testSuite.input.compilerOptions as TemplateDomCompileOptions | undefined),
      };
      const customElementTags = new Set(testSuite.input.compilerOptions?.customElementTags ?? []);
      if (customElementTags.size > 0) {
        compilerOptions.isCustomElement = (tag: string) => customElementTags.has(tag);
      }
      const result = compileTemplate(testSuite.input.source ?? "", compilerOptions);

      assertHelpers(result.ast.helpers, testSuite.expect.helpers);
      assertPointerAssertions(normalizeStructuredArtifact(result.ast), testSuite.expect.ast);

      if (testSuite.expect.hoistCount != null) {
        assert.equal(result.ast.hoists.length, testSuite.expect.hoistCount);
      }

      if (testSuite.expect.normalizedCode != null) {
        assert.equal(
          normalizeNewlines(result.code),
          normalizeNewlines(testSuite.expect.normalizedCode),
        );
      }

      break;
    }
    case "sfc-script-compile": {
      const { descriptor } = parseSfc(testSuite.input.sfc ?? "", {
        filename: testSuite.input.filename ?? `${testSuite.id}.vue`,
      });
      const scriptOptions = testSuite.input.scriptOptions;
      const { result, warnings } = captureWarnings(() =>
        compileScript(descriptor, {
          ...scriptOptions,
          id: scriptOptions?.id ?? testSuite.id,
        } as ScriptCompileOptions),
      );
      const generatedFile = parseGeneratedScript(result.content);
      const componentOptions = getDefaultExportObject(generatedFile);
      const setupStatements = getSetupStatements(componentOptions);

      assertPointerAssertions(normalizeStructuredArtifact(generatedFile), testSuite.expect.ast);
      assertBindings(result.bindings, testSuite.expect.bindings);
      assertWarnings(warnings, testSuite.expect.warnings);
      assertPropConstructors(componentOptions, testSuite.expect.propConstructors);
      assertPropDefaults(componentOptions, testSuite.expect.propDefaults);
      assertPropDefaultKinds(componentOptions, testSuite.expect.propDefaultKinds);
      assertAliases(setupStatements, testSuite.expect.aliases);
      assertEmits(componentOptions, testSuite.expect.emits);
      assertLiterals([generatedFile.program.body, setupStatements], testSuite.expect.literals);

      if (testSuite.expect.normalizedCode != null) {
        assert.equal(
          normalizeNewlines(result.content),
          normalizeNewlines(testSuite.expect.normalizedCode),
        );
      }
      break;
    }
    case "sfc-style-compile": {
      const styleOptions = testSuite.input.styleOptions;
      const result = compileStyle({
        source: testSuite.input.source ?? "",
        filename: testSuite.input.filename ?? `${testSuite.id}.css`,
        id: styleOptions?.id ?? testSuite.id,
        scoped: Boolean(styleOptions?.scoped),
      });

      assert.equal(result.errors.length, 0, `Expected no style errors for ${testSuite.id}`);
      assert.deepEqual(testSuite.expect.cssVars ?? [], []);

      if (testSuite.expect.normalizedCode != null) {
        assert.equal(
          normalizeNewlines(result.code),
          normalizeNewlines(testSuite.expect.normalizedCode),
        );
      }
      break;
    }
  }
}

export function runTypeEvaluationReferenceTestSuite(testSuite: TypeEvaluationTestSuite): void {
  const { descriptor } = parseSfc(testSuite.input.sfc, {
    filename: testSuite.input.filename,
  });
  const scriptOptions = testSuite.input.scriptOptions;
  const result = compileScript(descriptor, {
    ...scriptOptions,
    id: scriptOptions?.id ?? testSuite.id,
  } as ScriptCompileOptions);
  const generatedFile = parseGeneratedScript(result.content);
  const componentOptions = getDefaultExportObject(generatedFile);

  assertBindings(result.bindings, testSuite.expect.bindings);
  assertRuntimeProps(componentOptions, testSuite.expect.runtimeProps);
}

export const runSyntaxReferenceCase = runSyntaxReferenceTestSuite;
export const runParserReferenceCase = runParserReferenceTestSuite;
export const runCompilerReferenceCase = runCompilerReferenceTestSuite;
export const runTypeEvaluationReferenceCase = runTypeEvaluationReferenceTestSuite;
