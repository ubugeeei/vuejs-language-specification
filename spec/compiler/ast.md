# Vue.js Template Compiler AST Specification

## 1. Overview

This document specifies the Abstract Syntax Tree (AST) structure used by the Vue.js template compiler. The AST serves as an intermediate representation between the source template and the generated render function code.

### 1.1 Scope

This specification covers:

- **Template AST**: Nodes produced by parsing Vue template syntax
- **Codegen AST**: Nodes used for code generation
- **SFC Descriptor**: Structure representing parsed Single File Components

### 1.2 Mode Compatibility

| Symbol | Description |
|--------|-------------|
| `[U]` | Universal - applies to both Virtual DOM and Vapor modes |
| `[V]` | Virtual DOM Only |
| `[P]` | Vapor Only |

### 1.3 Notation

This specification uses a notation similar to [ESTree](https://github.com/estree/estree).

- `interface A { }` defines a node type
- `interface A <: B { }` means A extends B
- `type: "X"` specifies a literal string value
- `T | null` means the value can be T or null
- `[ T ]` means an array of T

---

## 2. Enumerations

### 2.1 Namespace `[U]`

```js
enum Namespace {
    HTML | SVG | MATH_ML
}
```

| Value | Numeric | Description |
|-------|---------|-------------|
| HTML | 0 | HTML namespace |
| SVG | 1 | SVG namespace |
| MATH_ML | 2 | MathML namespace |

### 2.2 NodeType `[U]`

```js
enum NodeType {
    // Template Nodes
    ROOT | ELEMENT | TEXT | COMMENT | SIMPLE_EXPRESSION |
    INTERPOLATION | ATTRIBUTE | DIRECTIVE |
    // Container Nodes
    COMPOUND_EXPRESSION | IF | IF_BRANCH | FOR | TEXT_CALL |
    // Codegen Nodes
    VNODE_CALL | JS_CALL_EXPRESSION | JS_OBJECT_EXPRESSION |
    JS_PROPERTY | JS_ARRAY_EXPRESSION | JS_FUNCTION_EXPRESSION |
    JS_CONDITIONAL_EXPRESSION | JS_CACHE_EXPRESSION |
    // SSR Codegen Nodes
    JS_BLOCK_STATEMENT | JS_TEMPLATE_LITERAL | JS_IF_STATEMENT |
    JS_ASSIGNMENT_EXPRESSION | JS_SEQUENCE_EXPRESSION | JS_RETURN_STATEMENT
}
```

| NodeType | Numeric | Mode | Description |
|----------|---------|------|-------------|
| ROOT | 0 | U | Root of parsed template |
| ELEMENT | 1 | U | Any element node |
| TEXT | 2 | U | Static text content |
| COMMENT | 3 | U | HTML comment |
| SIMPLE_EXPRESSION | 4 | U | Single expression |
| INTERPOLATION | 5 | U | Mustache interpolation `{{ }}` |
| ATTRIBUTE | 6 | U | Static attribute |
| DIRECTIVE | 7 | U | Directive (`v-*`, `:`, `@`, `#`) |
| COMPOUND_EXPRESSION | 8 | U | Combined expressions |
| IF | 9 | U | v-if chain container |
| IF_BRANCH | 10 | U | Single if/else-if/else branch |
| FOR | 11 | U | v-for loop |
| TEXT_CALL | 12 | U | Text with runtime handling |
| VNODE_CALL | 13 | V | VNode creation call |
| JS_CALL_EXPRESSION | 14 | U | Function call |
| JS_OBJECT_EXPRESSION | 15 | U | Object literal |
| JS_PROPERTY | 16 | U | Object property |
| JS_ARRAY_EXPRESSION | 17 | U | Array literal |
| JS_FUNCTION_EXPRESSION | 18 | U | Function expression |
| JS_CONDITIONAL_EXPRESSION | 19 | U | Ternary expression |
| JS_CACHE_EXPRESSION | 20 | V | Cache wrapper |
| JS_BLOCK_STATEMENT | 21 | V | Block statement (SSR) |
| JS_TEMPLATE_LITERAL | 22 | V | Template literal (SSR) |
| JS_IF_STATEMENT | 23 | V | If statement (SSR) |
| JS_ASSIGNMENT_EXPRESSION | 24 | V | Assignment (SSR) |
| JS_SEQUENCE_EXPRESSION | 25 | V | Sequence expression (SSR) |
| JS_RETURN_STATEMENT | 26 | V | Return statement (SSR) |

### 2.3 ElementType `[U]`

```js
enum ElementType {
    ELEMENT | COMPONENT | SLOT | TEMPLATE
}
```

| ElementType | Numeric | Description |
|-------------|---------|-------------|
| ELEMENT | 0 | Native HTML/SVG element |
| COMPONENT | 1 | Vue component |
| SLOT | 2 | `<slot>` outlet |
| TEMPLATE | 3 | `<template>` wrapper |

### 2.4 ConstantType `[U]`

Used for static analysis and optimization. Higher levels imply lower levels.

```js
enum ConstantType {
    NOT_CONSTANT | CAN_SKIP_PATCH | CAN_CACHE | CAN_STRINGIFY
}
```

| ConstantType | Numeric | Description |
|--------------|---------|-------------|
| NOT_CONSTANT | 0 | Dynamic, cannot be optimized |
| CAN_SKIP_PATCH | 1 | Can skip patch during updates |
| CAN_CACHE | 2 | Can be cached across renders |
| CAN_STRINGIFY | 3 | Can be pre-stringified (highest) |

### 2.5 PatchFlag `[V]`

Bitwise flags for optimizing Virtual DOM patching.

```js
enum PatchFlag {
    TEXT | CLASS | STYLE | PROPS | FULL_PROPS | HYDRATE_EVENTS |
    STABLE_FRAGMENT | KEYED_FRAGMENT | UNKEYED_FRAGMENT |
    NEED_PATCH | DYNAMIC_SLOTS | DEV_ROOT_FRAGMENT | HOISTED | BAIL
}
```

| Flag | Value | Description |
|------|-------|-------------|
| TEXT | 1 | Dynamic text content |
| CLASS | 2 | Dynamic class binding |
| STYLE | 4 | Dynamic style binding |
| PROPS | 8 | Dynamic non-class/style props |
| FULL_PROPS | 16 | Props with dynamic keys |
| HYDRATE_EVENTS | 32 | Event listeners for hydration |
| STABLE_FRAGMENT | 64 | Fragment with stable children |
| KEYED_FRAGMENT | 128 | Fragment with keyed children |
| UNKEYED_FRAGMENT | 256 | Fragment with unkeyed children |
| NEED_PATCH | 512 | Needs patch regardless |
| DYNAMIC_SLOTS | 1024 | Dynamic slot content |
| DEV_ROOT_FRAGMENT | 2048 | Dev root fragment |
| HOISTED | -1 | Static node (hoisted) |
| BAIL | -2 | Skip optimization |

---

## 3. Source Location `[U]`

All AST nodes contain location information for error reporting and source maps.

```js
interface Position {
    offset: number;
    line: number;
    column: number;
}

interface SourceLocation {
    start: Position;
    end: Position;
    source: string;
}
```

### 3.1 Position Fields

| Field | Type | Description |
|-------|------|-------------|
| offset | number | 0-based byte offset from start of file |
| line | number | 1-based line number |
| column | number | 1-based column number |

### 3.2 SourceLocation Fields

| Field | Type | Description |
|-------|------|-------------|
| start | Position | Start position (inclusive) |
| end | Position | End position (exclusive) |
| source | string | Raw source text of this node |

**Note**: The range follows the convention `[start, end)`.

---

## 4. Base Node `[U]`

All AST nodes inherit from this base structure.

```js
interface Node {
    type: NodeType;
    loc: SourceLocation;
}
```

---

## 5. Template AST Nodes

### 5.1 RootNode `[U]`

The root of a parsed template.

```js
interface RootNode <: Node {
    type: "ROOT";
    source: string;
    children: [ TemplateChildNode ];
    helpers: Set<symbol>;
    components: [ string ];
    directives: [ string ];
    hoists: [ JSChildNode | null ];
    imports: [ ImportItem ];
    cached: [ CacheExpression | null ];
    temps: number;
    codegenNode: TemplateChildNode | JSChildNode | BlockStatement | null;
    transformed: boolean | null;
    filters: [ string ] | null;
}
```

| Field | Type | Description |
|-------|------|-------------|
| source | string | Original template source |
| children | [ TemplateChildNode ] | Top-level child nodes |
| helpers | Set<symbol> | Runtime helpers needed |
| components | [ string ] | Component names used |
| directives | [ string ] | Custom directive names used |
| hoists | [ JSChildNode \| null ] | Hoisted static expressions |
| imports | [ ImportItem ] | Import statements to generate |
| cached | [ CacheExpression \| null ] | Cached expressions |
| temps | number | Number of temp variables needed |
| codegenNode | Node \| null | Generated code node (optional) |
| transformed | boolean \| null | Whether transform completed (optional) |
| filters | [ string ] \| null | v2 filter names (compat only, optional) |

### 5.2 ElementNode `[U]`

```js
interface ElementNode <: Node {
    type: "ELEMENT";
    ns: Namespace;
    tag: string;
    tagType: ElementType;
    props: [ AttributeNode | DirectiveNode ];
    children: [ TemplateChildNode ];
    isSelfClosing: boolean | null;
    innerLoc: SourceLocation | null;
}
```

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
```

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

| Field | Type | Description |
|-------|------|-------------|
| content | string | Text content |

### 5.4 CommentNode `[U]`

HTML comments.

```js
interface CommentNode <: Node {
    type: "COMMENT";
    content: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
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

| Field | Type | Description |
|-------|------|-------------|
| name | string | Attribute name |
| nameLoc | SourceLocation | Location of name only |
| value | TextNode \| null | Value (null if boolean attribute) |

**Examples**:

| Source | name | value |
|--------|------|-------|
| `id="app"` | "id" | TextNode { content: "app" } |
| `disabled` | "disabled" | null |

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

| Field | Type | Description |
|-------|------|-------------|
| name | string | Normalized name: "bind", "on", "if", etc. |
| rawName | string \| null | Original attribute name (optional) |
| exp | ExpressionNode \| null | Directive expression |
| arg | ExpressionNode \| null | Directive argument |
| modifiers | [ SimpleExpressionNode ] | Modifier list |
| forParseResult | ForParseResult \| null | Cached v-for parse (optional) |

**Examples**:

| Source | name | arg | exp | modifiers |
|--------|------|-----|-----|-----------|
| `v-if="show"` | "if" | null | "show" | [] |
| `:class="cls"` | "bind" | "class" | "cls" | [] |
| `@click.stop="fn"` | "on" | "click" | "fn" | ["stop"] |
| `v-model.trim="val"` | "model" | null | "val" | ["trim"] |
| `#default="{ item }"` | "slot" | "default" | "{ item }" | [] |

### 5.7 InterpolationNode `[U]`

Mustache interpolation `{{ expression }}`.

```js
interface InterpolationNode <: Node {
    type: "INTERPOLATION";
    content: ExpressionNode;
}
```

| Field | Type | Description |
|-------|------|-------------|
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

| Field | Type | Description |
|-------|------|-------------|
| content | string | Expression source code |
| isStatic | boolean | Is a static string literal |
| constType | ConstantType | Constant analysis result |
| ast | BabelNode \| null \| false | Parsed AST (null=identifier, false=error) |
| hoisted | JSChildNode \| null | Points to hoisted node (optional) |
| identifiers | [ string ] \| null | Identifiers in function params (optional) |
| isHandlerKey | boolean \| null | Is an event handler key (optional) |

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

| Field | Type | Description |
|-------|------|-------------|
| branches | [ IfBranchNode ] | List of branches (at least one) |
| codegenNode | Node \| null | Generated conditional (optional) |

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

| Field | Type | Description |
|-------|------|-------------|
| condition | ExpressionNode \| null | Condition (null for v-else) |
| children | [ TemplateChildNode ] | Branch content |
| userKey | AttributeNode \| DirectiveNode \| null | User-provided key (optional) |
| isTemplateIf | boolean \| null | Is on template element (optional) |

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

| Field | Type | Description |
|-------|------|-------------|
| source | ExpressionNode | Iterable expression |
| valueAlias | ExpressionNode \| null | Value variable |
| keyAlias | ExpressionNode \| null | Key/index variable |
| objectIndexAlias | ExpressionNode \| null | Third variable (for objects) |
| parseResult | ForParseResult | Parsed v-for expression |
| children | [ TemplateChildNode ] | Loop body |

**v-for Syntax Mapping**:

| Syntax | value | key | index |
|--------|-------|-----|-------|
| `item in items` | "item" | null | null |
| `(item, i) in items` | "item" | "i" | null |
| `(val, key, i) in obj` | "val" | "key" | "i" |

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

| Field | Type | Description |
|-------|------|-------------|
| tag | string \| symbol \| CallExpression | Element tag or component |
| props | PropsExpression \| null | Element properties |
| children | VNodeChildren | Child content |
| patchFlag | PatchFlag \| null | Optimization flag |
| dynamicProps | string \| SimpleExpressionNode \| null | Dynamic prop names |
| directives | DirectiveArguments \| null | Runtime directives |
| isBlock | boolean | Is a block node |
| disableTracking | boolean | Disable reactivity tracking |
| isComponent | boolean | Is a component |

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

| Field | Type | Description |
|-------|------|-------------|
| index | number | Cache slot index |
| value | JSChildNode | Cached value |
| needPauseTracking | boolean | Pause reactivity tracking |
| inVOnce | boolean | Is in v-once context |
| needArraySpread | boolean | Needs array spread for v-for |

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
TemplateChildNode = ElementNode | InterpolationNode | CompoundExpressionNode |
                    TextNode | CommentNode | IfNode | IfBranchNode |
                    ForNode | TextCallNode;
```

### 10.2 ParentNode

Nodes that can contain children.

```js
ParentNode = RootNode | ElementNode | IfBranchNode | ForNode;
```

### 10.3 JSChildNode

```js
JSChildNode = VNodeCall | CallExpression | ObjectExpression | ArrayExpression |
              ExpressionNode | FunctionExpression | ConditionalExpression |
              CacheExpression | AssignmentExpression | SequenceExpression;
```

### 10.4 SSRCodegenNode

```js
SSRCodegenNode = BlockStatement | TemplateLiteral | IfStatement |
                 AssignmentExpression | ReturnStatement | SequenceExpression;
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

| Field | Type | Description |
|-------|------|-------------|
| type | string | Block type ("template", "script", "style", etc.) |
| content | string | Block content |
| attrs | object | Attributes on the block tag |
| loc | SourceLocation | Source location |
| map | RawSourceMap \| null | Source map (optional) |
| lang | string \| null | Language attribute (optional) |
| src | string \| null | External source path (optional) |

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

| Field | Type | Description |
|-------|------|-------------|
| setup | string \| boolean \| null | Setup attribute value (optional) |
| bindings | BindingMetadata \| null | Binding analysis result (optional) |
| imports | object \| null | Import bindings (optional) |
| scriptAst | [ Statement ] \| null | Non-setup script AST (optional) |
| scriptSetupAst | [ Statement ] \| null | Setup script AST (optional) |
| warnings | [ string ] \| null | Compiler warnings (optional) |
| deps | [ string ] \| null | Dependency file paths (optional) |

### 11.4 SFCStyleBlock

```js
interface SFCStyleBlock <: SFCBlock {
    type: "style";
    scoped: boolean | null;
    module: string | boolean | null;
}
```

| Field | Type | Description |
|-------|------|-------------|
| scoped | boolean \| null | Has scoped attribute (optional) |
| module | string \| boolean \| null | CSS modules config (optional) |

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

| Field | Type | Description |
|-------|------|-------------|
| filename | string | File name |
| source | string | Full source code |
| template | SFCTemplateBlock \| null | Template block |
| script | SFCScriptBlock \| null | Script block (non-setup) |
| scriptSetup | SFCScriptBlock \| null | Script setup block |
| styles | [ SFCStyleBlock ] | Style blocks |
| customBlocks | [ SFCBlock ] | Custom blocks |
| cssVars | [ string ] | CSS variables used |
| slotted | boolean | Uses :slotted() modifier |

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
<li v-for="(item, index) in items" :key="item.id">
    {{ index }}: {{ item.name }}
</li>
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

| Helper | Description |
|--------|-------------|
| createVNode | Create VNode for components |
| createElementVNode | Create VNode for elements |
| openBlock | Begin block tracking |
| createBlock | Create block VNode |
| createElementBlock | Create element block |
| renderList | v-for rendering |
| renderSlot | Slot rendering |
| withDirectives | Apply runtime directives |
| withMemo | v-memo caching |
| createTextVNode | Create text VNode |
| createCommentVNode | Create comment VNode |
| Fragment | Fragment component |
| Teleport | Teleport component |
| Suspense | Suspense component |
| KeepAlive | KeepAlive component |
| toDisplayString | Convert value for interpolation |
| normalizeClass | Normalize class binding |
| normalizeStyle | Normalize style binding |
| normalizeProps | Normalize props object |
| mergeProps | Merge multiple props |
| resolveComponent | Resolve component by name |
| resolveDirective | Resolve directive by name |
| resolveDynamicComponent | Resolve dynamic component |

---

## 14. References

- Vue.js Core Repository: compiler-core/src/ast.ts
- Vue.js Core Repository: compiler-sfc/src/parse.ts
- ESTree Specification: https://github.com/estree/estree
