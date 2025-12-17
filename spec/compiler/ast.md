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

This specification uses Extended Backus-Naur Form (EBNF) with the following conventions:

- `::=` defines a production rule
- `|` denotes alternatives
- `[ ]` denotes optional elements
- `{ }` denotes zero or more repetitions
- `( )` groups elements
- `"text"` denotes literal text or keywords
- `<name>` references another production or primitive type

Primitive types:
- `<string>` - A sequence of characters
- `<integer>` - A whole number
- `<boolean>` - `true` or `false`
- `<symbol>` - A unique identifier (implementation-specific)

---

## 2. Source Location `[U]`

All AST nodes contain location information for error reporting and source maps.

### 2.1 Grammar

```ebnf
SourceLocation ::= "{"
    "start" ":" Position ","
    "end" ":" Position ","
    "source" ":" <string>
  "}"

Position ::= "{"
    "offset" ":" <integer> ","
    "line" ":" <integer> ","
    "column" ":" <integer>
  "}"
```

### 2.2 Fields

| Field | Type | Description |
|-------|------|-------------|
| `start` | Position | Start position (inclusive) |
| `end` | Position | End position (exclusive) |
| `source` | string | Raw source text of this node |

| Field | Type | Description |
|-------|------|-------------|
| `offset` | integer | 0-based byte offset from start of file |
| `line` | integer | 1-based line number |
| `column` | integer | 1-based column number |

**Note**: The range follows the convention `[start, end)`.

---

## 3. Namespace `[U]`

```ebnf
Namespace ::= "HTML" | "SVG" | "MATH_ML"
```

| Value | Numeric | Description |
|-------|---------|-------------|
| HTML | 0 | HTML namespace |
| SVG | 1 | SVG namespace |
| MATH_ML | 2 | MathML namespace |

Namespaces determine element parsing behavior and valid child elements.

---

## 4. Node Types `[U]`

### 4.1 NodeType Enumeration

```ebnf
NodeType ::=
  (* Template Nodes *)
    "ROOT"
  | "ELEMENT"
  | "TEXT"
  | "COMMENT"
  | "SIMPLE_EXPRESSION"
  | "INTERPOLATION"
  | "ATTRIBUTE"
  | "DIRECTIVE"
  (* Container Nodes *)
  | "COMPOUND_EXPRESSION"
  | "IF"
  | "IF_BRANCH"
  | "FOR"
  | "TEXT_CALL"
  (* Codegen Nodes *)
  | "VNODE_CALL"
  | "JS_CALL_EXPRESSION"
  | "JS_OBJECT_EXPRESSION"
  | "JS_PROPERTY"
  | "JS_ARRAY_EXPRESSION"
  | "JS_FUNCTION_EXPRESSION"
  | "JS_CONDITIONAL_EXPRESSION"
  | "JS_CACHE_EXPRESSION"
  (* SSR Codegen Nodes *)
  | "JS_BLOCK_STATEMENT"
  | "JS_TEMPLATE_LITERAL"
  | "JS_IF_STATEMENT"
  | "JS_ASSIGNMENT_EXPRESSION"
  | "JS_SEQUENCE_EXPRESSION"
  | "JS_RETURN_STATEMENT"
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

### 4.2 ElementType Enumeration

```ebnf
ElementType ::= "ELEMENT" | "COMPONENT" | "SLOT" | "TEMPLATE"
```

| ElementType | Numeric | Description |
|-------------|---------|-------------|
| ELEMENT | 0 | Native HTML/SVG element |
| COMPONENT | 1 | Vue component |
| SLOT | 2 | `<slot>` outlet |
| TEMPLATE | 3 | `<template>` wrapper |

### 4.3 ConstantType Enumeration

Used for static analysis and optimization. Higher levels imply lower levels.

```ebnf
ConstantType ::=
    "NOT_CONSTANT"
  | "CAN_SKIP_PATCH"
  | "CAN_CACHE"
  | "CAN_STRINGIFY"
```

| ConstantType | Numeric | Description |
|--------------|---------|-------------|
| NOT_CONSTANT | 0 | Dynamic, cannot be optimized |
| CAN_SKIP_PATCH | 1 | Can skip patch during updates |
| CAN_CACHE | 2 | Can be cached across renders |
| CAN_STRINGIFY | 3 | Can be pre-stringified (highest) |

---

## 5. Base Node `[U]`

All AST nodes inherit from this base structure.

```ebnf
Node ::= "{"
    "type" ":" NodeType ","
    "loc" ":" SourceLocation
    { "," <additional-fields> }
  "}"
```

---

## 6. Template AST Nodes

### 6.1 RootNode `[U]`

The root of a parsed template.

```ebnf
RootNode ::= "{"
    "type" ":" "ROOT" ","
    "loc" ":" SourceLocation ","
    "source" ":" <string> ","
    "children" ":" "[" { TemplateChildNode } "]" ","
    "helpers" ":" Set<symbol> ","
    "components" ":" "[" { <string> } "]" ","
    "directives" ":" "[" { <string> } "]" ","
    "hoists" ":" "[" { ( JSChildNode | "null" ) } "]" ","
    "imports" ":" "[" { ImportItem } "]" ","
    "cached" ":" "[" { ( CacheExpression | "null" ) } "]" ","
    "temps" ":" <integer>
    [ "," "codegenNode" ":" ( TemplateChildNode | JSChildNode | BlockStatement ) ]
    [ "," "transformed" ":" <boolean> ]
    [ "," "filters" ":" "[" { <string> } "]" ]
  "}"
```

| Field | Type | Description |
|-------|------|-------------|
| source | string | Original template source |
| children | TemplateChildNode[] | Top-level child nodes |
| helpers | Set | Runtime helpers needed |
| components | string[] | Component names used |
| directives | string[] | Custom directive names used |
| hoists | (JSChildNode \| null)[] | Hoisted static expressions |
| imports | ImportItem[] | Import statements to generate |
| cached | (CacheExpression \| null)[] | Cached expressions |
| temps | integer | Number of temp variables needed |
| codegenNode | Node | Generated code node (optional) |
| transformed | boolean | Whether transform completed (optional) |
| filters | string[] | v2 filter names (compat only, optional) |

### 6.2 ElementNode `[U]`

```ebnf
ElementNode ::= PlainElementNode | ComponentNode | SlotOutletNode | TemplateNode

BaseElementNode ::= "{"
    "type" ":" "ELEMENT" ","
    "loc" ":" SourceLocation ","
    "ns" ":" Namespace ","
    "tag" ":" <string> ","
    "tagType" ":" ElementType ","
    "props" ":" "[" { ( AttributeNode | DirectiveNode ) } "]" ","
    "children" ":" "[" { TemplateChildNode } "]"
    [ "," "isSelfClosing" ":" <boolean> ]
    [ "," "innerLoc" ":" SourceLocation ]
  "}"
```

| Field | Type | Description |
|-------|------|-------------|
| ns | Namespace | HTML, SVG, or MATH_ML |
| tag | string | Tag name (lowercase) |
| tagType | ElementType | Element classification |
| props | (AttributeNode \| DirectiveNode)[] | Attributes and directives |
| children | TemplateChildNode[] | Child nodes |
| isSelfClosing | boolean | `<div />` vs `<div></div>` (optional) |
| innerLoc | SourceLocation | Inner content location (optional) |

#### 6.2.1 PlainElementNode `[U]`

Native HTML/SVG elements.

```ebnf
PlainElementNode ::= BaseElementNode with
    "tagType" ":" "ELEMENT"
    [ "," "codegenNode" ":" ( VNodeCall | SimpleExpressionNode | CacheExpression | MemoExpression ) ]
    [ "," "ssrCodegenNode" ":" TemplateLiteral ]
```

#### 6.2.2 ComponentNode `[U]`

Vue component elements.

```ebnf
ComponentNode ::= BaseElementNode with
    "tagType" ":" "COMPONENT"
    [ "," "codegenNode" ":" ( VNodeCall | CacheExpression | MemoExpression ) ]
    [ "," "ssrCodegenNode" ":" CallExpression ]
```

#### 6.2.3 SlotOutletNode `[U]`

`<slot>` elements.

```ebnf
SlotOutletNode ::= BaseElementNode with
    "tagType" ":" "SLOT"
    [ "," "codegenNode" ":" ( RenderSlotCall | CacheExpression ) ]
    [ "," "ssrCodegenNode" ":" CallExpression ]
```

#### 6.2.4 TemplateNode `[U]`

`<template>` wrapper elements.

```ebnf
TemplateNode ::= BaseElementNode with
    "tagType" ":" "TEMPLATE" ","
    "codegenNode" ":" "undefined"
```

**Note**: TemplateNode is always compiled away and has no codegenNode.

### 6.3 TextNode `[U]`

Static text content.

```ebnf
TextNode ::= "{"
    "type" ":" "TEXT" ","
    "loc" ":" SourceLocation ","
    "content" ":" <string>
  "}"
```

| Field | Type | Description |
|-------|------|-------------|
| content | string | Text content |

### 6.4 CommentNode `[U]`

HTML comments.

```ebnf
CommentNode ::= "{"
    "type" ":" "COMMENT" ","
    "loc" ":" SourceLocation ","
    "content" ":" <string>
  "}"
```

| Field | Type | Description |
|-------|------|-------------|
| content | string | Comment content (without `<!--` and `-->`) |

### 6.5 AttributeNode `[U]`

Static attributes (without `v-bind`).

```ebnf
AttributeNode ::= "{"
    "type" ":" "ATTRIBUTE" ","
    "loc" ":" SourceLocation ","
    "name" ":" <string> ","
    "nameLoc" ":" SourceLocation ","
    "value" ":" ( TextNode | "undefined" )
  "}"
```

| Field | Type | Description |
|-------|------|-------------|
| name | string | Attribute name |
| nameLoc | SourceLocation | Location of name only |
| value | TextNode \| undefined | Value (undefined if boolean attribute) |

**Examples**:

| Source | name | value |
|--------|------|-------|
| `id="app"` | "id" | TextNode { content: "app" } |
| `disabled` | "disabled" | undefined |

### 6.6 DirectiveNode `[U]`

Directives (`v-*`, `:`, `@`, `#`).

```ebnf
DirectiveNode ::= "{"
    "type" ":" "DIRECTIVE" ","
    "loc" ":" SourceLocation ","
    "name" ":" <string> ","
    [ "rawName" ":" <string> "," ]
    "exp" ":" ( ExpressionNode | "undefined" ) ","
    "arg" ":" ( ExpressionNode | "undefined" ) ","
    "modifiers" ":" "[" { SimpleExpressionNode } "]"
    [ "," "forParseResult" ":" ForParseResult ]
  "}"
```

| Field | Type | Description |
|-------|------|-------------|
| name | string | Normalized name: "bind", "on", "if", etc. |
| rawName | string | Original attribute name (optional) |
| exp | ExpressionNode \| undefined | Directive expression |
| arg | ExpressionNode \| undefined | Directive argument |
| modifiers | SimpleExpressionNode[] | Modifier list |
| forParseResult | ForParseResult | Cached v-for parse (optional) |

**Examples**:

| Source | name | arg | exp | modifiers |
|--------|------|-----|-----|-----------|
| `v-if="show"` | "if" | undefined | "show" | [] |
| `:class="cls"` | "bind" | "class" | "cls" | [] |
| `@click.stop="fn"` | "on" | "click" | "fn" | ["stop"] |
| `v-model.trim="val"` | "model" | undefined | "val" | ["trim"] |
| `#default="{ item }"` | "slot" | "default" | "{ item }" | [] |

### 6.7 InterpolationNode `[U]`

Mustache interpolation `{{ expression }}`.

```ebnf
InterpolationNode ::= "{"
    "type" ":" "INTERPOLATION" ","
    "loc" ":" SourceLocation ","
    "content" ":" ExpressionNode
  "}"
```

| Field | Type | Description |
|-------|------|-------------|
| content | ExpressionNode | The interpolated expression |

---

## 7. Expression Nodes `[U]`

```ebnf
ExpressionNode ::= SimpleExpressionNode | CompoundExpressionNode
```

### 7.1 SimpleExpressionNode

A single expression.

```ebnf
SimpleExpressionNode ::= "{"
    "type" ":" "SIMPLE_EXPRESSION" ","
    "loc" ":" SourceLocation ","
    "content" ":" <string> ","
    "isStatic" ":" <boolean> ","
    "constType" ":" ConstantType
    [ "," "ast" ":" ( BabelNode | "null" | "false" ) ]
    [ "," "hoisted" ":" JSChildNode ]
    [ "," "identifiers" ":" "[" { <string> } "]" ]
    [ "," "isHandlerKey" ":" <boolean> ]
  "}"
```

| Field | Type | Description |
|-------|------|-------------|
| content | string | Expression source code |
| isStatic | boolean | Is a static string literal |
| constType | ConstantType | Constant analysis result |
| ast | BabelNode \| null \| false | Parsed AST (null=identifier, false=error) |
| hoisted | JSChildNode | Points to hoisted node (optional) |
| identifiers | string[] | Identifiers in function params (optional) |
| isHandlerKey | boolean | Is an event handler key (optional) |

### 7.2 CompoundExpressionNode

Multiple expressions combined.

```ebnf
CompoundExpressionNode ::= "{"
    "type" ":" "COMPOUND_EXPRESSION" ","
    "loc" ":" SourceLocation ","
    "children" ":" "[" { CompoundExpressionChild } "]"
    [ "," "ast" ":" ( BabelNode | "null" | "false" ) ]
    [ "," "identifiers" ":" "[" { <string> } "]" ]
    [ "," "isHandlerKey" ":" <boolean> ]
  "}"

CompoundExpressionChild ::=
    SimpleExpressionNode
  | CompoundExpressionNode
  | InterpolationNode
  | TextNode
  | <string>
  | <symbol>
```

---

## 8. Structural Nodes `[U]`

### 8.1 IfNode

Represents `v-if`/`v-else-if`/`v-else` chains.

```ebnf
IfNode ::= "{"
    "type" ":" "IF" ","
    "loc" ":" SourceLocation ","
    "branches" ":" "[" IfBranchNode { "," IfBranchNode } "]"
    [ "," "codegenNode" ":" ( IfConditionalExpression | CacheExpression ) ]
  "}"
```

| Field | Type | Description |
|-------|------|-------------|
| branches | IfBranchNode[] | List of branches (at least one) |
| codegenNode | Node | Generated conditional (optional) |

### 8.2 IfBranchNode

A single branch in an if chain.

```ebnf
IfBranchNode ::= "{"
    "type" ":" "IF_BRANCH" ","
    "loc" ":" SourceLocation ","
    "condition" ":" ( ExpressionNode | "undefined" ) ","
    "children" ":" "[" { TemplateChildNode } "]"
    [ "," "userKey" ":" ( AttributeNode | DirectiveNode ) ]
    [ "," "isTemplateIf" ":" <boolean> ]
  "}"
```

| Field | Type | Description |
|-------|------|-------------|
| condition | ExpressionNode \| undefined | Condition (undefined for v-else) |
| children | TemplateChildNode[] | Branch content |
| userKey | AttributeNode \| DirectiveNode | User-provided key (optional) |
| isTemplateIf | boolean | Is on template element (optional) |

### 8.3 ForNode

Represents `v-for` loops.

```ebnf
ForNode ::= "{"
    "type" ":" "FOR" ","
    "loc" ":" SourceLocation ","
    "source" ":" ExpressionNode ","
    "valueAlias" ":" ( ExpressionNode | "undefined" ) ","
    "keyAlias" ":" ( ExpressionNode | "undefined" ) ","
    "objectIndexAlias" ":" ( ExpressionNode | "undefined" ) ","
    "parseResult" ":" ForParseResult ","
    "children" ":" "[" { TemplateChildNode } "]"
    [ "," "codegenNode" ":" ForCodegenNode ]
  "}"

ForParseResult ::= "{"
    "source" ":" ExpressionNode ","
    "value" ":" ( ExpressionNode | "undefined" ) ","
    "key" ":" ( ExpressionNode | "undefined" ) ","
    "index" ":" ( ExpressionNode | "undefined" ) ","
    "finalized" ":" <boolean>
  "}"
```

| Field | Type | Description |
|-------|------|-------------|
| source | ExpressionNode | Iterable expression |
| valueAlias | ExpressionNode \| undefined | Value variable |
| keyAlias | ExpressionNode \| undefined | Key/index variable |
| objectIndexAlias | ExpressionNode \| undefined | Third variable (for objects) |
| parseResult | ForParseResult | Parsed v-for expression |
| children | TemplateChildNode[] | Loop body |

**v-for Syntax Mapping**:

| Syntax | value | key | index |
|--------|-------|-----|-------|
| `item in items` | "item" | undefined | undefined |
| `(item, i) in items` | "item" | "i" | undefined |
| `(val, key, i) in obj` | "val" | "key" | "i" |

### 8.4 TextCallNode

Wraps text content that needs runtime handling.

```ebnf
TextCallNode ::= "{"
    "type" ":" "TEXT_CALL" ","
    "loc" ":" SourceLocation ","
    "content" ":" ( TextNode | InterpolationNode | CompoundExpressionNode ) ","
    "codegenNode" ":" ( CallExpression | SimpleExpressionNode )
  "}"
```

---

## 9. Codegen AST Nodes

### 9.1 VNodeCall `[V]`

Represents a VNode creation call.

```ebnf
VNodeCall ::= "{"
    "type" ":" "VNODE_CALL" ","
    "loc" ":" SourceLocation ","
    "tag" ":" ( <string> | <symbol> | CallExpression ) ","
    "props" ":" ( PropsExpression | "undefined" ) ","
    "children" ":" VNodeChildren ","
    "patchFlag" ":" ( PatchFlag | "undefined" ) ","
    "dynamicProps" ":" ( <string> | SimpleExpressionNode | "undefined" ) ","
    "directives" ":" ( DirectiveArguments | "undefined" ) ","
    "isBlock" ":" <boolean> ","
    "disableTracking" ":" <boolean> ","
    "isComponent" ":" <boolean>
  "}"

VNodeChildren ::=
    "[" { TemplateChildNode } "]"
  | TemplateTextChildNode
  | SlotsExpression
  | ForRenderListExpression
  | SimpleExpressionNode
  | CacheExpression
  | "undefined"
```

| Field | Type | Description |
|-------|------|-------------|
| tag | string \| symbol \| CallExpression | Element tag or component |
| props | PropsExpression \| undefined | Element properties |
| children | VNodeChildren | Child content |
| patchFlag | PatchFlag \| undefined | Optimization flag |
| dynamicProps | string \| SimpleExpressionNode \| undefined | Dynamic prop names |
| directives | DirectiveArguments \| undefined | Runtime directives |
| isBlock | boolean | Is a block node |
| disableTracking | boolean | Disable reactivity tracking |
| isComponent | boolean | Is a component |

### 9.2 CallExpression `[U]`

```ebnf
CallExpression ::= "{"
    "type" ":" "JS_CALL_EXPRESSION" ","
    "loc" ":" SourceLocation ","
    "callee" ":" ( <string> | <symbol> ) ","
    "arguments" ":" "[" { CallArgument } "]"
  "}"

CallArgument ::=
    <string>
  | <symbol>
  | JSChildNode
  | SSRCodegenNode
  | TemplateChildNode
  | "[" { TemplateChildNode } "]"
```

### 9.3 ObjectExpression `[U]`

```ebnf
ObjectExpression ::= "{"
    "type" ":" "JS_OBJECT_EXPRESSION" ","
    "loc" ":" SourceLocation ","
    "properties" ":" "[" { Property } "]"
  "}"

Property ::= "{"
    "type" ":" "JS_PROPERTY" ","
    "loc" ":" SourceLocation ","
    "key" ":" ExpressionNode ","
    "value" ":" JSChildNode
  "}"
```

### 9.4 ArrayExpression `[U]`

```ebnf
ArrayExpression ::= "{"
    "type" ":" "JS_ARRAY_EXPRESSION" ","
    "loc" ":" SourceLocation ","
    "elements" ":" "[" { ( <string> | Node ) } "]"
  "}"
```

### 9.5 FunctionExpression `[U]`

```ebnf
FunctionExpression ::= "{"
    "type" ":" "JS_FUNCTION_EXPRESSION" ","
    "loc" ":" SourceLocation ","
    "params" ":" FunctionParams ","
    "newline" ":" <boolean> ","
    "isSlot" ":" <boolean>
    [ "," "returns" ":" ( TemplateChildNode | "[" { TemplateChildNode } "]" | JSChildNode ) ]
    [ "," "body" ":" ( BlockStatement | IfStatement ) ]
    [ "," "isNonScopedSlot" ":" <boolean> ]
  "}"

FunctionParams ::=
    ExpressionNode
  | <string>
  | "[" { ( ExpressionNode | <string> ) } "]"
  | "undefined"
```

### 9.6 ConditionalExpression `[U]`

```ebnf
ConditionalExpression ::= "{"
    "type" ":" "JS_CONDITIONAL_EXPRESSION" ","
    "loc" ":" SourceLocation ","
    "test" ":" JSChildNode ","
    "consequent" ":" JSChildNode ","
    "alternate" ":" JSChildNode ","
    "newline" ":" <boolean>
  "}"
```

### 9.7 CacheExpression `[V]`

Caching wrapper for v-once and v-memo.

```ebnf
CacheExpression ::= "{"
    "type" ":" "JS_CACHE_EXPRESSION" ","
    "loc" ":" SourceLocation ","
    "index" ":" <integer> ","
    "value" ":" JSChildNode ","
    "needPauseTracking" ":" <boolean> ","
    "inVOnce" ":" <boolean> ","
    "needArraySpread" ":" <boolean>
  "}"
```

| Field | Type | Description |
|-------|------|-------------|
| index | integer | Cache slot index |
| value | JSChildNode | Cached value |
| needPauseTracking | boolean | Pause reactivity tracking |
| inVOnce | boolean | Is in v-once context |
| needArraySpread | boolean | Needs array spread for v-for |

---

## 10. SSR Codegen Nodes `[V]`

### 10.1 BlockStatement

```ebnf
BlockStatement ::= "{"
    "type" ":" "JS_BLOCK_STATEMENT" ","
    "loc" ":" SourceLocation ","
    "body" ":" "[" { ( JSChildNode | IfStatement ) } "]"
  "}"
```

### 10.2 TemplateLiteral

```ebnf
TemplateLiteral ::= "{"
    "type" ":" "JS_TEMPLATE_LITERAL" ","
    "loc" ":" SourceLocation ","
    "elements" ":" "[" { ( <string> | JSChildNode ) } "]"
  "}"
```

### 10.3 IfStatement

```ebnf
IfStatement ::= "{"
    "type" ":" "JS_IF_STATEMENT" ","
    "loc" ":" SourceLocation ","
    "test" ":" ExpressionNode ","
    "consequent" ":" BlockStatement ","
    "alternate" ":" ( IfStatement | BlockStatement | ReturnStatement | "undefined" )
  "}"
```

### 10.4 AssignmentExpression

```ebnf
AssignmentExpression ::= "{"
    "type" ":" "JS_ASSIGNMENT_EXPRESSION" ","
    "loc" ":" SourceLocation ","
    "left" ":" SimpleExpressionNode ","
    "right" ":" JSChildNode
  "}"
```

### 10.5 SequenceExpression

```ebnf
SequenceExpression ::= "{"
    "type" ":" "JS_SEQUENCE_EXPRESSION" ","
    "loc" ":" SourceLocation ","
    "expressions" ":" "[" { JSChildNode } "]"
  "}"
```

### 10.6 ReturnStatement

```ebnf
ReturnStatement ::= "{"
    "type" ":" "JS_RETURN_STATEMENT" ","
    "loc" ":" SourceLocation ","
    "returns" ":" ( TemplateChildNode | "[" { TemplateChildNode } "]" | JSChildNode )
  "}"
```

---

## 11. PatchFlags `[V]`

Bitwise flags for optimizing Virtual DOM patching.

```ebnf
PatchFlag ::=
    "TEXT"
  | "CLASS"
  | "STYLE"
  | "PROPS"
  | "FULL_PROPS"
  | "HYDRATE_EVENTS"
  | "STABLE_FRAGMENT"
  | "KEYED_FRAGMENT"
  | "UNKEYED_FRAGMENT"
  | "NEED_PATCH"
  | "DYNAMIC_SLOTS"
  | "DEV_ROOT_FRAGMENT"
  | "HOISTED"
  | "BAIL"
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

## 12. SFC Descriptor `[U]`

### 12.1 SFCDescriptor

Represents a parsed Single File Component.

```ebnf
SFCDescriptor ::= "{"
    "filename" ":" <string> ","
    "source" ":" <string> ","
    "template" ":" ( SFCTemplateBlock | "null" ) ","
    "script" ":" ( SFCScriptBlock | "null" ) ","
    "scriptSetup" ":" ( SFCScriptBlock | "null" ) ","
    "styles" ":" "[" { SFCStyleBlock } "]" ","
    "customBlocks" ":" "[" { SFCBlock } "]" ","
    "cssVars" ":" "[" { <string> } "]" ","
    "slotted" ":" <boolean>
  "}"
```

| Field | Type | Description |
|-------|------|-------------|
| filename | string | File name |
| source | string | Full source code |
| template | SFCTemplateBlock \| null | Template block |
| script | SFCScriptBlock \| null | Script block (non-setup) |
| scriptSetup | SFCScriptBlock \| null | Script setup block |
| styles | SFCStyleBlock[] | Style blocks |
| customBlocks | SFCBlock[] | Custom blocks |
| cssVars | string[] | CSS variables used |
| slotted | boolean | Uses :slotted() modifier |

### 12.2 SFCBlock

Base structure for SFC blocks.

```ebnf
SFCBlock ::= "{"
    "type" ":" <string> ","
    "content" ":" <string> ","
    "attrs" ":" "{" { <string> ":" ( <string> | "true" ) } "}" ","
    "loc" ":" SourceLocation
    [ "," "map" ":" RawSourceMap ]
    [ "," "lang" ":" <string> ]
    [ "," "src" ":" <string> ]
  "}"
```

| Field | Type | Description |
|-------|------|-------------|
| type | string | Block type ("template", "script", "style", etc.) |
| content | string | Block content |
| attrs | Record | Attributes on the block tag |
| loc | SourceLocation | Source location |
| map | RawSourceMap | Source map (optional) |
| lang | string | Language attribute (optional) |
| src | string | External source path (optional) |

### 12.3 SFCTemplateBlock

```ebnf
SFCTemplateBlock ::= SFCBlock with
    "type" ":" "template"
    [ "," "ast" ":" RootNode ]
```

### 12.4 SFCScriptBlock

```ebnf
SFCScriptBlock ::= SFCBlock with
    "type" ":" "script"
    [ "," "setup" ":" ( <string> | <boolean> ) ]
    [ "," "bindings" ":" BindingMetadata ]
    [ "," "imports" ":" "{" { <string> ":" ImportBinding } "}" ]
    [ "," "scriptAst" ":" "[" { Statement } "]" ]
    [ "," "scriptSetupAst" ":" "[" { Statement } "]" ]
    [ "," "warnings" ":" "[" { <string> } "]" ]
    [ "," "deps" ":" "[" { <string> } "]" ]
```

| Field | Type | Description |
|-------|------|-------------|
| setup | string \| boolean | Setup attribute value (optional) |
| bindings | BindingMetadata | Binding analysis result (optional) |
| imports | Record | Import bindings (optional) |
| scriptAst | Statement[] | Non-setup script AST (optional) |
| scriptSetupAst | Statement[] | Setup script AST (optional) |
| warnings | string[] | Compiler warnings (optional) |
| deps | string[] | Dependency file paths (optional) |

### 12.5 SFCStyleBlock

```ebnf
SFCStyleBlock ::= SFCBlock with
    "type" ":" "style"
    [ "," "scoped" ":" <boolean> ]
    [ "," "module" ":" ( <string> | <boolean> ) ]
```

| Field | Type | Description |
|-------|------|-------------|
| scoped | boolean | Has scoped attribute (optional) |
| module | string \| boolean | CSS modules config (optional) |

---

## 13. Type Unions `[U]`

### 13.1 TemplateChildNode

All possible children of a template element.

```ebnf
TemplateChildNode ::=
    ElementNode
  | InterpolationNode
  | CompoundExpressionNode
  | TextNode
  | CommentNode
  | IfNode
  | IfBranchNode
  | ForNode
  | TextCallNode
```

### 13.2 ParentNode

Nodes that can contain children.

```ebnf
ParentNode ::= RootNode | ElementNode | IfBranchNode | ForNode
```

### 13.3 JSChildNode

```ebnf
JSChildNode ::=
    VNodeCall
  | CallExpression
  | ObjectExpression
  | ArrayExpression
  | ExpressionNode
  | FunctionExpression
  | ConditionalExpression
  | CacheExpression
  | AssignmentExpression
  | SequenceExpression
```

### 13.4 SSRCodegenNode

```ebnf
SSRCodegenNode ::=
    BlockStatement
  | TemplateLiteral
  | IfStatement
  | AssignmentExpression
  | ReturnStatement
  | SequenceExpression
```

---

## 14. Examples

### 14.1 Simple Template

**Input**:
```html
<div id="app">{{ message }}</div>
```

**AST** (JSON representation):
```
RootNode {
  type: ROOT
  children: [
    ElementNode {
      type: ELEMENT
      tag: "div"
      tagType: ELEMENT
      props: [
        AttributeNode {
          type: ATTRIBUTE
          name: "id"
          value: TextNode { content: "app" }
        }
      ]
      children: [
        InterpolationNode {
          type: INTERPOLATION
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

### 14.2 Conditional Rendering

**Input**:
```html
<div v-if="show">Yes</div>
<div v-else>No</div>
```

**AST**:
```
RootNode {
  type: ROOT
  children: [
    IfNode {
      type: IF
      branches: [
        IfBranchNode {
          type: IF_BRANCH
          condition: SimpleExpressionNode { content: "show" }
          children: [
            ElementNode { tag: "div", children: [ TextNode { content: "Yes" } ] }
          ]
        },
        IfBranchNode {
          type: IF_BRANCH
          condition: undefined
          children: [
            ElementNode { tag: "div", children: [ TextNode { content: "No" } ] }
          ]
        }
      ]
    }
  ]
}
```

### 14.3 List Rendering

**Input**:
```html
<li v-for="(item, index) in items" :key="item.id">
  {{ index }}: {{ item.name }}
</li>
```

**AST**:
```
ForNode {
  type: FOR
  source: SimpleExpressionNode { content: "items" }
  valueAlias: SimpleExpressionNode { content: "item" }
  keyAlias: SimpleExpressionNode { content: "index" }
  objectIndexAlias: undefined
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

## 15. Runtime Helpers

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

## 16. References

- Vue.js Core Repository: compiler-core/src/ast.ts
- Vue.js Core Repository: compiler-sfc/src/parse.ts
