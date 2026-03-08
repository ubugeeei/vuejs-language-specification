# Portable Parser and Template AST Model

This document defines the portable AST model used by the machine-readable suites. It is intentionally narrower than every internal node used by `vuejs/core`, but it preserves the observable structure that cross-language parser and compiler implementations need in order to compare parsing and transform results.

## Goals

- Preserve enough structure to describe syntax and compiler conformance.
- Preserve enough structure to describe parser conformance across base-parser and DOM-parser implementations.
- Avoid coupling the suite to transient internal helpers.
- Separate stable shape requirements from implementation-private optimization details.
- Leave room for profile-specific extensions such as Vapor without polluting the base model.

## Stability Rules

- Node presence, child ordering, source locations, and directive decomposition are stable surface area.
- Helper symbol names, temporary slot indices, and optimizer-specific caches are not stable surface area unless a test suite explicitly requires them.
- Numeric enum values are not normative. Portable consumers should compare symbolic names.
- Profile-specific fields must be namespaced under a profile object rather than mixed into the base node contract.

## Common Fields

Every node in the portable model exposes:

```ts
interface PortableNode {
  kind: string;
  loc: SourceLocation;
}

interface SourceLocation {
  start: Position;
  end: Position;
  source: string;
}

interface Position {
  offset: number;
  line: number;
  column: number;
}
```

`loc` is required for parser conformance, diagnostics, and source-map alignment.

## Root

```ts
interface RootNode extends PortableNode {
  kind: "Root";
  children: TemplateChildNode[];
  comments?: CommentNode[];
  codegen?: CodegenNode | null;
}
```

The root `children` array preserves lexical order after HTML comment retention and whitespace policy have been applied.

## Template Nodes

```ts
type TemplateChildNode =
  | ElementNode
  | TextNode
  | CommentNode
  | InterpolationNode
  | CompoundExpressionNode
  | IfNode
  | ForNode;

interface ElementNode extends PortableNode {
  kind: "Element";
  namespace: "html" | "svg" | "mathml";
  tag: string;
  tagType: "element" | "component" | "slot" | "template";
  props: PropNode[];
  children: TemplateChildNode[];
}

interface TextNode extends PortableNode {
  kind: "Text";
  content: string;
}

interface CommentNode extends PortableNode {
  kind: "Comment";
  content: string;
}

interface InterpolationNode extends PortableNode {
  kind: "Interpolation";
  expression: ExpressionNode;
}

interface CompoundExpressionNode extends PortableNode {
  kind: "CompoundExpression";
  parts: Array<string | ExpressionNode>;
}
```

## Props and Directives

```ts
type PropNode = AttributeNode | DirectiveNode;

interface AttributeNode extends PortableNode {
  kind: "Attribute";
  name: string;
  value: string | null;
}

interface DirectiveNode extends PortableNode {
  kind: "Directive";
  name: string;
  rawName: string;
  argument: ExpressionNode | null;
  expression: ExpressionNode | null;
  modifiers: string[];
}
```

The portable form intentionally distinguishes:

- canonical directive name
- original spelling
- argument
- expression
- modifier list

That split is required for cross-language compiler parity and diagnostic precision.

## Control Flow

```ts
interface IfNode extends PortableNode {
  kind: "If";
  branches: IfBranchNode[];
}

interface IfBranchNode extends PortableNode {
  kind: "IfBranch";
  condition: ExpressionNode | null;
  children: TemplateChildNode[];
}

interface ForNode extends PortableNode {
  kind: "For";
  source: ExpressionNode;
  valueAlias: ExpressionNode | null;
  keyAlias: ExpressionNode | null;
  indexAlias: ExpressionNode | null;
  children: TemplateChildNode[];
}
```

For `v-if` chains, comments between branches belong to the following branch, matching current upstream behavior.

For `v-for`, alias decomposition is part of the parse result. Implementations must not delay alias extraction until code generation if they expose the portable AST.

## Expressions

```ts
interface ExpressionNode extends PortableNode {
  kind: "Expression";
  content: string;
  isStatic: boolean;
  constType?: "not-constant" | "can-skip-patch" | "can-cache" | "can-stringify";
}
```

`content` is preserved source text after any phase-specific rewriting required by the test suite, for example identifier prefixing in compiler transforms.

## Code Generation Nodes

The portable suite only standardizes the minimum codegen surface needed by curated compiler test suites:

```ts
type CodegenNode =
  | VNodeCall
  | ConditionalCodegenNode
  | CallExpressionNode
  | ObjectExpressionNode
  | ArrayExpressionNode;

interface VNodeCall extends PortableNode {
  kind: "VNodeCall";
  tag: string | ExpressionNode;
  props: ObjectExpressionNode | ExpressionNode | null;
  children: CodegenNode | TemplateChildNode[] | ExpressionNode | null;
  isBlock: boolean;
  patchFlags?: string[];
}

interface ConditionalCodegenNode extends PortableNode {
  kind: "ConditionalExpression";
  test: ExpressionNode;
  consequent: CodegenNode;
  alternate: CodegenNode;
}
```

Test suites that require deeper internal trees should specify JSON Pointer assertions against implementation-native ASTs and link that requirement explicitly from the test-suite metadata.

## Profiles

Profile-specific additions are attached under a `profiles` object:

```ts
interface ProfileAugmentedNode extends PortableNode {
  profiles?: {
    vapor?: Record<string, unknown>;
  };
}
```

The base suite does not require any `vapor` fields. Vapor-only conformance must be declared by profile-specific test suites tied to the correct Vue minor branch snapshot.
