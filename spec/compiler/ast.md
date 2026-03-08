# Portable Template AST Model

This document defines the portable AST model used by the machine-readable suites. It is intentionally narrower than every internal node used by `vuejs/core`, but it preserves the observable structure that cross-language implementations need in order to compare parsing and transform results.

## Goals

- Preserve enough structure to describe syntax and compiler conformance.
- Avoid coupling the suite to transient internal helpers.
- Separate stable shape requirements from implementation-private optimization details.
- Leave room for profile-specific extensions such as Vapor without polluting the base model.

## Stability Rules

- Node presence, child ordering, source locations, and directive decomposition are stable surface area.
- Helper symbol names, temporary slot indices, and optimizer-specific caches are not stable surface area unless a case explicitly requires them.
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

`content` is preserved source text after any phase-specific rewriting required by the case, for example identifier prefixing in compiler transforms.

## Code Generation Nodes

The portable suite only standardizes the minimum codegen surface needed by curated compiler cases:

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

Cases that require deeper internal trees should specify JSON Pointer assertions against implementation-native ASTs and link that requirement explicitly from the case metadata.

## Profiles

Profile-specific additions are attached under a `profiles` object:

```ts
interface ProfileAugmentedNode extends PortableNode {
  profiles?: {
    vapor?: Record<string, unknown>;
  };
}
```

The base suite does not require any `vapor` fields. Vapor-only conformance must be declared by profile-specific cases tied to the correct Vue minor branch snapshot.
props: [ AttributeNode | DirectiveNode ];
children: [ TemplateChildNode ];
isSelfClosing: boolean | null;
innerLoc: SourceLocation | null;
}

````

| Field | Type | Description |
|-------|------|-------------|
| ns | Namespace | HTML, SVG, or MATH_ML |
| tag | string | Tag name (lowercase) |
| tagType | ElementType | Element classification |
| props | [ AttributeNode \| DirectiveNode ] | Attributes and directives |
| children | [ TemplateChildNode ] | Child nodes |
| isSelfClosing | boolean \| null | `<div />` vs `<div></div>` (optional) |
| innerLoc | SourceLocation \| null | Inner content location (optional) |

#### 5.2.1 PlainElementNode `[U]`

Native HTML/SVG elements.

```js
interface PlainElementNode <: ElementNode {
    tagType: "ELEMENT";
    codegenNode: VNodeCall | SimpleExpressionNode | CacheExpression | MemoExpression | null;
    ssrCodegenNode: TemplateLiteral | null;
}
````

#### 5.2.2 ComponentNode `[U]`

Vue component elements.

```js
interface ComponentNode <: ElementNode {
    tagType: "COMPONENT";
    codegenNode: VNodeCall | CacheExpression | MemoExpression | null;
    ssrCodegenNode: CallExpression | null;
}
```

#### 5.2.3 SlotOutletNode `[U]`

`<slot>` elements.

```js
interface SlotOutletNode <: ElementNode {
    tagType: "SLOT";
    codegenNode: RenderSlotCall | CacheExpression | null;
    ssrCodegenNode: CallExpression | null;
}
```

#### 5.2.4 TemplateNode `[U]`

`<template>` wrapper elements.

```js
interface TemplateNode <: ElementNode {
    tagType: "TEMPLATE";
    codegenNode: null;
}
```

**Note**: TemplateNode is always compiled away and has no codegenNode.

### 5.3 TextNode `[U]`

Static text content.

```js
interface TextNode <: Node {
    type: "TEXT";
    content: string;
}
```

| Field   | Type   | Description  |
| ------- | ------ | ------------ |
| content | string | Text content |

### 5.4 CommentNode `[U]`

HTML comments.

```js
interface CommentNode <: Node {
    type: "COMMENT";
    content: string;
}
```

| Field   | Type   | Description                                |
| ------- | ------ | ------------------------------------------ |
| content | string | Comment content (without `<!--` and `-->`) |

### 5.5 AttributeNode `[U]`

Static attributes (without `v-bind`).

```js
interface AttributeNode <: Node {
    type: "ATTRIBUTE";
    name: string;
    nameLoc: SourceLocation;
    value: TextNode | null;
}
```

| Field   | Type             | Description                       |
| ------- | ---------------- | --------------------------------- |
| name    | string           | Attribute name                    |
| nameLoc | SourceLocation   | Location of name only             |
| value   | TextNode \| null | Value (null if boolean attribute) |

**Examples**:

| Source     | name       | value                       |
| ---------- | ---------- | --------------------------- |
| `id="app"` | "id"       | TextNode { content: "app" } |
| `disabled` | "disabled" | null                        |

### 5.6 DirectiveNode `[U]`

Directives (`v-*`, `:`, `@`, `#`).

```js
interface DirectiveNode <: Node {
    type: "DIRECTIVE";
    name: string;
    rawName: string | null;
    exp: ExpressionNode | null;
    arg: ExpressionNode | null;
    modifiers: [ SimpleExpressionNode ];
    forParseResult: ForParseResult | null;
}
```

| Field          | Type                     | Description                               |
| -------------- | ------------------------ | ----------------------------------------- |
| name           | string                   | Normalized name: "bind", "on", "if", etc. |
| rawName        | string \| null           | Original attribute name (optional)        |
| exp            | ExpressionNode \| null   | Directive expression                      |
| arg            | ExpressionNode \| null   | Directive argument                        |
| modifiers      | [ SimpleExpressionNode ] | Modifier list                             |
| forParseResult | ForParseResult \| null   | Cached v-for parse (optional)             |

**Examples**:

| Source                | name    | arg       | exp        | modifiers |
| --------------------- | ------- | --------- | ---------- | --------- |
| `v-if="show"`         | "if"    | null      | "show"     | []        |
| `:class="cls"`        | "bind"  | "class"   | "cls"      | []        |
| `@click.stop="fn"`    | "on"    | "click"   | "fn"       | ["stop"]  |
| `v-model.trim="val"`  | "model" | null      | "val"      | ["trim"]  |
| `#default="{ item }"` | "slot"  | "default" | "{ item }" | []        |

### 5.7 InterpolationNode `[U]`

Mustache interpolation `{{ expression }}`.

```js
interface InterpolationNode <: Node {
    type: "INTERPOLATION";
    content: ExpressionNode;
}
```

| Field   | Type           | Description                 |
| ------- | -------------- | --------------------------- |
| content | ExpressionNode | The interpolated expression |

---

## 6. Expression Nodes `[U]`

```js
ExpressionNode = SimpleExpressionNode | CompoundExpressionNode;
```

### 6.1 SimpleExpressionNode

A single expression.

```js
interface SimpleExpressionNode <: Node {
    type: "SIMPLE_EXPRESSION";
    content: string;
    isStatic: boolean;
    constType: ConstantType;
    ast: BabelNode | null | false;
    hoisted: JSChildNode | null;
    identifiers: [ string ] | null;
    isHandlerKey: boolean | null;
}
```

| Field        | Type                       | Description                               |
| ------------ | -------------------------- | ----------------------------------------- |
| content      | string                     | Expression source code                    |
| isStatic     | boolean                    | Is a static string literal                |
| constType    | ConstantType               | Constant analysis result                  |
| ast          | BabelNode \| null \| false | Parsed AST (null=identifier, false=error) |
| hoisted      | JSChildNode \| null        | Points to hoisted node (optional)         |
| identifiers  | [ string ] \| null         | Identifiers in function params (optional) |
| isHandlerKey | boolean \| null            | Is an event handler key (optional)        |

### 6.2 CompoundExpressionNode

Multiple expressions combined.

```js
CompoundExpressionChild = SimpleExpressionNode | CompoundExpressionNode |
                          InterpolationNode | TextNode | string | symbol;

interface CompoundExpressionNode <: Node {
    type: "COMPOUND_EXPRESSION";
    children: [ CompoundExpressionChild ];
    ast: BabelNode | null | false;
    identifiers: [ string ] | null;
    isHandlerKey: boolean | null;
}
```

---

## 7. Structural Nodes `[U]`

### 7.1 IfNode

Represents `v-if`/`v-else-if`/`v-else` chains.

```js
interface IfNode <: Node {
    type: "IF";
    branches: [ IfBranchNode ];
    codegenNode: IfConditionalExpression | CacheExpression | null;
}
```

| Field       | Type             | Description                      |
| ----------- | ---------------- | -------------------------------- |
| branches    | [ IfBranchNode ] | List of branches (at least one)  |
| codegenNode | Node \| null     | Generated conditional (optional) |

### 7.2 IfBranchNode

A single branch in an if chain.

```js
interface IfBranchNode <: Node {
    type: "IF_BRANCH";
    condition: ExpressionNode | null;
    children: [ TemplateChildNode ];
    userKey: AttributeNode | DirectiveNode | null;
    isTemplateIf: boolean | null;
}
```

| Field        | Type                                   | Description                       |
| ------------ | -------------------------------------- | --------------------------------- |
| condition    | ExpressionNode \| null                 | Condition (null for v-else)       |
| children     | [ TemplateChildNode ]                  | Branch content                    |
| userKey      | AttributeNode \| DirectiveNode \| null | User-provided key (optional)      |
| isTemplateIf | boolean \| null                        | Is on template element (optional) |

### 7.3 ForNode

Represents `v-for` loops.

```js
interface ForParseResult {
    source: ExpressionNode;
    value: ExpressionNode | null;
    key: ExpressionNode | null;
    index: ExpressionNode | null;
    finalized: boolean;
}

interface ForNode <: Node {
    type: "FOR";
    source: ExpressionNode;
    valueAlias: ExpressionNode | null;
    keyAlias: ExpressionNode | null;
    objectIndexAlias: ExpressionNode | null;
    parseResult: ForParseResult;
    children: [ TemplateChildNode ];
    codegenNode: ForCodegenNode | null;
}
```

| Field            | Type                   | Description                  |
| ---------------- | ---------------------- | ---------------------------- |
| source           | ExpressionNode         | Iterable expression          |
| valueAlias       | ExpressionNode \| null | Value variable               |
| keyAlias         | ExpressionNode \| null | Key/index variable           |
| objectIndexAlias | ExpressionNode \| null | Third variable (for objects) |
| parseResult      | ForParseResult         | Parsed v-for expression      |
| children         | [ TemplateChildNode ]  | Loop body                    |

**v-for Syntax Mapping**:

| Syntax                 | value  | key   | index |
| ---------------------- | ------ | ----- | ----- |
| `item in items`        | "item" | null  | null  |
| `(item, i) in items`   | "item" | "i"   | null  |
| `(val, key, i) in obj` | "val"  | "key" | "i"   |

### 7.4 TextCallNode

Wraps text content that needs runtime handling.

```js
interface TextCallNode <: Node {
    type: "TEXT_CALL";
    content: TextNode | InterpolationNode | CompoundExpressionNode;
    codegenNode: CallExpression | SimpleExpressionNode;
}
```

---

## 8. Codegen AST Nodes

### 8.1 VNodeCall `[V]`

Represents a VNode creation call.

```js
VNodeChildren = [ TemplateChildNode ] | TemplateTextChildNode |
                SlotsExpression | ForRenderListExpression |
                SimpleExpressionNode | CacheExpression | null;

interface VNodeCall <: Node {
    type: "VNODE_CALL";
    tag: string | symbol | CallExpression;
    props: PropsExpression | null;
    children: VNodeChildren;
    patchFlag: PatchFlag | null;
    dynamicProps: string | SimpleExpressionNode | null;
    directives: DirectiveArguments | null;
    isBlock: boolean;
    disableTracking: boolean;
    isComponent: boolean;
}
```

| Field           | Type                                   | Description                 |
| --------------- | -------------------------------------- | --------------------------- |
| tag             | string \| symbol \| CallExpression     | Element tag or component    |
| props           | PropsExpression \| null                | Element properties          |
| children        | VNodeChildren                          | Child content               |
| patchFlag       | PatchFlag \| null                      | Optimization flag           |
| dynamicProps    | string \| SimpleExpressionNode \| null | Dynamic prop names          |
| directives      | DirectiveArguments \| null             | Runtime directives          |
| isBlock         | boolean                                | Is a block node             |
| disableTracking | boolean                                | Disable reactivity tracking |
| isComponent     | boolean                                | Is a component              |

### 8.2 CallExpression `[U]`

```js
CallArgument = string | symbol | JSChildNode | SSRCodegenNode |
               TemplateChildNode | [ TemplateChildNode ];

interface CallExpression <: Node {
    type: "JS_CALL_EXPRESSION";
    callee: string | symbol;
    arguments: [ CallArgument ];
}
```

### 8.3 ObjectExpression `[U]`

```js
interface Property <: Node {
    type: "JS_PROPERTY";
    key: ExpressionNode;
    value: JSChildNode;
}

interface ObjectExpression <: Node {
    type: "JS_OBJECT_EXPRESSION";
    properties: [ Property ];
}
```

### 8.4 ArrayExpression `[U]`

```js
interface ArrayExpression <: Node {
    type: "JS_ARRAY_EXPRESSION";
    elements: [ string | Node ];
}
```

### 8.5 FunctionExpression `[U]`

```js
FunctionParams = ExpressionNode | string | [ ExpressionNode | string ] | null;

interface FunctionExpression <: Node {
    type: "JS_FUNCTION_EXPRESSION";
    params: FunctionParams;
    newline: boolean;
    isSlot: boolean;
    returns: TemplateChildNode | [ TemplateChildNode ] | JSChildNode | null;
    body: BlockStatement | IfStatement | null;
    isNonScopedSlot: boolean | null;
}
```

### 8.6 ConditionalExpression `[U]`

```js
interface ConditionalExpression <: Node {
    type: "JS_CONDITIONAL_EXPRESSION";
    test: JSChildNode;
    consequent: JSChildNode;
    alternate: JSChildNode;
    newline: boolean;
}
```

### 8.7 CacheExpression `[V]`

Caching wrapper for v-once and v-memo.

```js
interface CacheExpression <: Node {
    type: "JS_CACHE_EXPRESSION";
    index: number;
    value: JSChildNode;
    needPauseTracking: boolean;
    inVOnce: boolean;
    needArraySpread: boolean;
}
```

| Field             | Type        | Description                  |
| ----------------- | ----------- | ---------------------------- |
| index             | number      | Cache slot index             |
| value             | JSChildNode | Cached value                 |
| needPauseTracking | boolean     | Pause reactivity tracking    |
| inVOnce           | boolean     | Is in v-once context         |
| needArraySpread   | boolean     | Needs array spread for v-for |

---

## 9. SSR Codegen Nodes `[V]`

### 9.1 BlockStatement

```js
interface BlockStatement <: Node {
    type: "JS_BLOCK_STATEMENT";
    body: [ JSChildNode | IfStatement ];
}
```

### 9.2 TemplateLiteral

```js
interface TemplateLiteral <: Node {
    type: "JS_TEMPLATE_LITERAL";
    elements: [ string | JSChildNode ];
}
```

### 9.3 IfStatement

```js
interface IfStatement <: Node {
    type: "JS_IF_STATEMENT";
    test: ExpressionNode;
    consequent: BlockStatement;
    alternate: IfStatement | BlockStatement | ReturnStatement | null;
}
```

### 9.4 AssignmentExpression

```js
interface AssignmentExpression <: Node {
    type: "JS_ASSIGNMENT_EXPRESSION";
    left: SimpleExpressionNode;
    right: JSChildNode;
}
```

### 9.5 SequenceExpression

```js
interface SequenceExpression <: Node {
    type: "JS_SEQUENCE_EXPRESSION";
    expressions: [ JSChildNode ];
}
```

### 9.6 ReturnStatement

```js
interface ReturnStatement <: Node {
    type: "JS_RETURN_STATEMENT";
    returns: TemplateChildNode | [ TemplateChildNode ] | JSChildNode;
}
```

---

## 10. Type Unions `[U]`

### 10.1 TemplateChildNode

All possible children of a template element.

```js
TemplateChildNode =
  ElementNode |
  InterpolationNode |
  CompoundExpressionNode |
  TextNode |
  CommentNode |
  IfNode |
  IfBranchNode |
  ForNode |
  TextCallNode;
```

### 10.2 ParentNode

Nodes that can contain children.

```js
ParentNode = RootNode | ElementNode | IfBranchNode | ForNode;
```

### 10.3 JSChildNode

```js
JSChildNode =
  VNodeCall |
  CallExpression |
  ObjectExpression |
  ArrayExpression |
  ExpressionNode |
  FunctionExpression |
  ConditionalExpression |
  CacheExpression |
  AssignmentExpression |
  SequenceExpression;
```

### 10.4 SSRCodegenNode

```js
SSRCodegenNode =
  BlockStatement |
  TemplateLiteral |
  IfStatement |
  AssignmentExpression |
  ReturnStatement |
  SequenceExpression;
```

---

## 11. SFC Descriptor `[U]`

### 11.1 SFCBlock

Base structure for SFC blocks.

```js
interface SFCBlock {
    type: string;
    content: string;
    attrs: { [name: string]: string | true };
    loc: SourceLocation;
    map: RawSourceMap | null;
    lang: string | null;
    src: string | null;
}
```

| Field   | Type                 | Description                                      |
| ------- | -------------------- | ------------------------------------------------ |
| type    | string               | Block type ("template", "script", "style", etc.) |
| content | string               | Block content                                    |
| attrs   | object               | Attributes on the block tag                      |
| loc     | SourceLocation       | Source location                                  |
| map     | RawSourceMap \| null | Source map (optional)                            |
| lang    | string \| null       | Language attribute (optional)                    |
| src     | string \| null       | External source path (optional)                  |

### 11.2 SFCTemplateBlock

```js
interface SFCTemplateBlock <: SFCBlock {
    type: "template";
    ast: RootNode | null;
}
```

### 11.3 SFCScriptBlock

```js
interface SFCScriptBlock <: SFCBlock {
    type: "script";
    setup: string | boolean | null;
    bindings: BindingMetadata | null;
    imports: { [local: string]: ImportBinding } | null;
    scriptAst: [ Statement ] | null;
    scriptSetupAst: [ Statement ] | null;
    warnings: [ string ] | null;
    deps: [ string ] | null;
}
```

| Field          | Type                      | Description                        |
| -------------- | ------------------------- | ---------------------------------- |
| setup          | string \| boolean \| null | Setup attribute value (optional)   |
| bindings       | BindingMetadata \| null   | Binding analysis result (optional) |
| imports        | object \| null            | Import bindings (optional)         |
| scriptAst      | [ Statement ] \| null     | Non-setup script AST (optional)    |
| scriptSetupAst | [ Statement ] \| null     | Setup script AST (optional)        |
| warnings       | [ string ] \| null        | Compiler warnings (optional)       |
| deps           | [ string ] \| null        | Dependency file paths (optional)   |

### 11.4 SFCStyleBlock

```js
interface SFCStyleBlock <: SFCBlock {
    type: "style";
    scoped: boolean | null;
    module: string | boolean | null;
}
```

| Field  | Type                      | Description                     |
| ------ | ------------------------- | ------------------------------- |
| scoped | boolean \| null           | Has scoped attribute (optional) |
| module | string \| boolean \| null | CSS modules config (optional)   |

### 11.5 SFCDescriptor

Represents a parsed Single File Component.

```js
interface SFCDescriptor {
    filename: string;
    source: string;
    template: SFCTemplateBlock | null;
    script: SFCScriptBlock | null;
    scriptSetup: SFCScriptBlock | null;
    styles: [ SFCStyleBlock ];
    customBlocks: [ SFCBlock ];
    cssVars: [ string ];
    slotted: boolean;
}
```

| Field        | Type                     | Description              |
| ------------ | ------------------------ | ------------------------ |
| filename     | string                   | File name                |
| source       | string                   | Full source code         |
| template     | SFCTemplateBlock \| null | Template block           |
| script       | SFCScriptBlock \| null   | Script block (non-setup) |
| scriptSetup  | SFCScriptBlock \| null   | Script setup block       |
| styles       | [ SFCStyleBlock ]        | Style blocks             |
| customBlocks | [ SFCBlock ]             | Custom blocks            |
| cssVars      | [ string ]               | CSS variables used       |
| slotted      | boolean                  | Uses :slotted() modifier |

---

## 12. Examples

### 12.1 Simple Template

**Input**:

```html
<div id="app">{{ message }}</div>
```

**AST**:

```js
RootNode {
    type: "ROOT"
    children: [
        ElementNode {
            type: "ELEMENT"
            tag: "div"
            tagType: "ELEMENT"
            props: [
                AttributeNode {
                    type: "ATTRIBUTE"
                    name: "id"
                    value: TextNode { content: "app" }
                }
            ]
            children: [
                InterpolationNode {
                    type: "INTERPOLATION"
                    content: SimpleExpressionNode {
                        content: "message"
                        isStatic: false
                    }
                }
            ]
        }
    ]
}
```

### 12.2 Conditional Rendering

**Input**:

```html
<div v-if="show">Yes</div>
<div v-else>No</div>
```

**AST**:

```js
RootNode {
    type: "ROOT"
    children: [
        IfNode {
            type: "IF"
            branches: [
                IfBranchNode {
                    type: "IF_BRANCH"
                    condition: SimpleExpressionNode { content: "show" }
                    children: [
                        ElementNode { tag: "div", children: [ TextNode { content: "Yes" } ] }
                    ]
                },
                IfBranchNode {
                    type: "IF_BRANCH"
                    condition: null
                    children: [
                        ElementNode { tag: "div", children: [ TextNode { content: "No" } ] }
                    ]
                }
            ]
        }
    ]
}
```

### 12.3 List Rendering

**Input**:

```html
<li v-for="(item, index) in items" :key="item.id">{{ index }}: {{ item.name }}</li>
```

**AST**:

```js
ForNode {
    type: "FOR"
    source: SimpleExpressionNode { content: "items" }
    valueAlias: SimpleExpressionNode { content: "item" }
    keyAlias: SimpleExpressionNode { content: "index" }
    objectIndexAlias: null
    children: [
        ElementNode {
            tag: "li"
            props: [
                DirectiveNode {
                    name: "bind"
                    arg: SimpleExpressionNode { content: "key", isStatic: true }
                    exp: SimpleExpressionNode { content: "item.id" }
                }
            ]
            children: [
                InterpolationNode { content: { content: "index" } },
                TextNode { content: ": " },
                InterpolationNode { content: { content: "item.name" } }
            ]
        }
    ]
}
```

---

## 13. Runtime Helpers

The compiler generates calls to runtime helper functions.

| Helper                  | Description                     |
| ----------------------- | ------------------------------- |
| createVNode             | Create VNode for components     |
| createElementVNode      | Create VNode for elements       |
| openBlock               | Begin block tracking            |
| createBlock             | Create block VNode              |
| createElementBlock      | Create element block            |
| renderList              | v-for rendering                 |
| renderSlot              | Slot rendering                  |
| withDirectives          | Apply runtime directives        |
| withMemo                | v-memo caching                  |
| createTextVNode         | Create text VNode               |
| createCommentVNode      | Create comment VNode            |
| Fragment                | Fragment component              |
| Teleport                | Teleport component              |
| Suspense                | Suspense component              |
| KeepAlive               | KeepAlive component             |
| toDisplayString         | Convert value for interpolation |
| normalizeClass          | Normalize class binding         |
| normalizeStyle          | Normalize style binding         |
| normalizeProps          | Normalize props object          |
| mergeProps              | Merge multiple props            |
| resolveComponent        | Resolve component by name       |
| resolveDirective        | Resolve directive by name       |
| resolveDynamicComponent | Resolve dynamic component       |

---

## 14. References

- Vue.js Core Repository: compiler-core/src/ast.ts
- Vue.js Core Repository: compiler-sfc/src/parse.ts
- ESTree Specification: https://github.com/estree/estree
