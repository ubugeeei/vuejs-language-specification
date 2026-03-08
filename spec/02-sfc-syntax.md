# SFC Syntax

## 1. Scope

This chapter defines descriptor-level SFC parsing and template parser obligations. It covers both the platform-agnostic base parser surface and the DOM-aware parser surface. It does not define code generation.

## 2. Terms

- `descriptor`: the structured result of SFC block parsing
- `base block`: `template`, `script`, or `style`
- `custom block`: any unknown top-level block preserved by the descriptor
- `template AST`: the parser output of the template block under Vue template parsing rules

## 2.1. Lexical Surface

The covered descriptor and template syntax relies on the following token classes:

```text
Name           ::= non-empty tag or attribute identifier
QuotedValue    ::= "\"" Chars "\"" | "'" Chars "'"
UnquotedValue  ::= CharsWithoutSpaceOrTagDelim
AttrValue      ::= QuotedValue | UnquotedValue
Interpolation  ::= "{{" JsExpr "}}"
Comment        ::= "<!--" Chars "-->"
DirectiveName  ::= "v-" Name | ":" Name | "@" Name | "#" Name
```

Directive shorthands are syntactic sugar for directive names and remain observable through the parser projection chosen by a local test suite.

## 2.2. Abstract Grammar

The descriptor layer is modeled by the following grammar over top-level block classes:

```text
SfcDocument ::= Block*
Block       ::= TemplateBlock | ScriptBlock | ScriptSetupBlock | StyleBlock | CustomBlock

TemplateBlock    ::= "<template" Attr* ">" TemplateSource "</template>"
ScriptBlock      ::= "<script" Attr* ">" ScriptSource "</script>"
ScriptSetupBlock ::= "<script" Attr* "setup" Attr* ">" ScriptSource "</script>"
StyleBlock       ::= "<style" Attr* ">" CssSource "</style>"
CustomBlock      ::= "<" Name Attr* ">" RawSource "</" Name ">"
```

Descriptor parsing is the total function:

```text
parse_sfc : Source → Descriptor
```

where `Descriptor = ⟨template?, script?, scriptSetup?, styles*, customBlocks*⟩`.

Template parsing is modeled as:

```text
parse_tpl_base : Source × ParserOptions → ⟨TemplateAst, Error*⟩
parse_tpl_dom  : Source × ParserOptions → ⟨TemplateAst, Error*⟩
```

## 2.3. Descriptor Data Model

The descriptor surface asserted by local test suites is the projection:

```text
Descriptor ::= ⟨template?, script?, scriptSetup?, styles*, customBlocks*⟩

TemplateDescriptor    ::= ⟨lang?, content⟩
ScriptDescriptor      ::= ⟨lang?, setup, content⟩
StyleDescriptor       ::= ⟨lang?, scoped, content⟩
CustomBlockDescriptor ::= ⟨type, lang?, content⟩
```

Descriptor-level conformance is defined on selected observable fields only:

```text
DescriptorProj(d) ::= ⟨
  hasTemplate,
  hasScript,
  hasScriptSetup,
  styleCount,
  customBlockCount,
  scriptLang?,
  scriptSetupLang?,
  styleLangs*,
  scopedStyleCount
⟩
```

## 2.4. Parser Data Model

The portable parser layer uses the observable node classes:

```text
TemplateNode ::= Element | Text | Comment | Interpolation | CompoundExpression
Element      ::= ⟨tag, tagType, props*, children*⟩
Prop         ::= Attribute | Directive
Directive    ::= ⟨name, argument?, expression?, modifiers*⟩
ParseError   ::= ⟨code, loc, message?⟩
```

Local parser test suites constrain only explicitly selected projections:

```text
ParserProj(ast, errors, t) ::= ⟨PointerSelect(ast, t.ast), PointerSelect(errors, t.errors)⟩
```

## 2.5. Parser Configuration Model

The declarative parser configuration surface covered by local test suites is:

```text
ParserOptions ::= ⟨
  comments?,
  parseMode?,
  whitespace?,
  delimiters?,
  ns?,
  nativeTags*,
  voidTags*,
  customElementTags*,
  preTags*,
  ignoreNewlineTags*
⟩

ParseMode ::= base | html | sfc
WhitespaceMode ::= preserve | condense
Namespace ::= HTML | SVG | MATH_ML
Delimiters ::= ⟨open, close⟩
```

Only the declarative options above are part of the maintained cross-implementation parser surface in this repository.

## 2.6. Diagnostic Model

Recoverable parse failures are represented by:

```text
ParseError ::= ⟨code, primarySpan, message?⟩
ErrorProj(errors, t) ::= PointerSelect(errors, t.errors)
```

Only `code` and the selected location-bearing projections are normative unless a local test suite explicitly constrains the message text.

## 2.7. Well-Formed Parse Obligations

For any covered parser or syntax test suite `t`:

```text
SyntaxPass(I, t) ⇔
  DescriptorEq(DescriptorProj(actual), DescriptorProj(expected)) ∧
  TemplateAstEq(ParserProj(actualAst, actualErrors, t), ParserProj(expectedAst, expectedErrors, t))
```

Recoverable parse errors are part of the observable result and therefore MUST remain stable whenever a local test suite selects them.

## 3. Requirements

| ID             | Requirement                                                                                                                                                                            | Test Suites                                                                                                                                                                                                                                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SYN-DESC-1`   | A conforming descriptor parser MUST preserve the existence of `template`, `script`, `script setup`, `style`, and custom blocks, including block count and source order.                | [`syntax.sfc.basic-template-only`](../testsuites/syntax/sfc/basic-template-only.pkl), [`syntax.sfc.multiple-styles-and-custom-block`](../testsuites/syntax/sfc/multiple-styles-and-custom-block.pkl)                                                               |
| `SYN-DESC-2`   | A conforming descriptor parser MUST allow one non-setup `script` block and one `script setup` block to coexist in the same SFC descriptor.                                             | [`syntax.sfc.script-and-script-setup`](../testsuites/syntax/sfc/script-and-script-setup.pkl), [`syntax.sfc.script-setup-and-scoped-style`](../testsuites/syntax/sfc/script-setup-and-scoped-style.pkl)                                                             |
| `SYN-DESC-3`   | Language attributes such as `lang="ts"` and per-style `lang` metadata MUST be preserved as descriptor facts.                                                                           | [`syntax.sfc.script-and-script-setup`](../testsuites/syntax/sfc/script-and-script-setup.pkl), [`syntax.sfc.multiple-styles-and-custom-block`](../testsuites/syntax/sfc/multiple-styles-and-custom-block.pkl)                                                       |
| `SYN-DESC-4`   | Scoped style declarations MUST remain observable at descriptor time; descriptor parsing MUST NOT erase the `scoped` contract.                                                          | [`syntax.sfc.script-setup-and-scoped-style`](../testsuites/syntax/sfc/script-setup-and-scoped-style.pkl), [`syntax.sfc.multiple-styles-and-custom-block`](../testsuites/syntax/sfc/multiple-styles-and-custom-block.pkl)                                           |
| `SYN-DESC-5`   | Empty `template`, empty `script setup`, and plain `style` blocks MUST remain observable descriptor artifacts and MUST NOT be dropped merely because their content is empty or minimal. | [`syntax.sfc.empty-template`](../testsuites/syntax/sfc/empty-template.pkl), [`syntax.sfc.empty-script-setup`](../testsuites/syntax/sfc/empty-script-setup.pkl), [`syntax.sfc.basic-style-block`](../testsuites/syntax/sfc/basic-style-block.pkl)                   |
| `SYN-PARSE-1`  | Template parsing MUST distinguish element, component, and `template` container nodes.                                                                                                  | [`parser.template.element-nesting`](../testsuites/parser/template/element-nesting.pkl), [`parser.template.component-tag-type`](../testsuites/parser/template/component-tag-type.pkl)                                                                               |
| `SYN-PARSE-2`  | Template parsing MUST distinguish plain attributes from directives and MUST preserve directive name, argument, modifier, and expression structure.                                     | [`parser.template.directive-and-interpolation`](../testsuites/parser/template/directive-and-interpolation.pkl), [`parser.template.dynamic-arg-modifier`](../testsuites/parser/template/dynamic-arg-modifier.pkl)                                                   |
| `SYN-PARSE-3`  | Interpolation parsing MUST preserve the complete JavaScript expression body even when it contains tag-like operators such as `<`.                                                      | [`parser.template.text-with-tag-like-interpolation`](../testsuites/parser/template/text-with-tag-like-interpolation.pkl)                                                                                                                                           |
| `SYN-PARSE-4`  | Parser-level normalization that is part of Vue parsing itself, such as class attribute whitespace normalization, MUST remain observable.                                               | [`parser.template.class-attribute-normalization`](../testsuites/parser/template/class-attribute-normalization.pkl)                                                                                                                                                 |
| `SYN-PARSE-5`  | When comment retention is enabled, comment nodes MUST remain in source order. When disabled, they MUST be omitted from retained children.                                              | [`parser.template.comment-preservation`](../testsuites/parser/template/comment-preservation.pkl), [`parser.template.comments-disabled`](../testsuites/parser/template/comments-disabled.pkl)                                                                       |
| `SYN-PARSE-6`  | Unquoted attribute values and valueless boolean attributes MUST remain distinguishable in the retained AST.                                                                            | [`parser.template.unquoted-attribute-self-closing`](../testsuites/parser/template/unquoted-attribute-self-closing.pkl)                                                                                                                                             |
| `SYN-PARSE-7`  | Recoverable parse failures MUST preserve stable error code and primary location when a case asserts them.                                                                              | [`parser.template.missing-end-tag-error`](../testsuites/parser/template/missing-end-tag-error.pkl)                                                                                                                                                                 |
| `SYN-PARSE-8`  | `v-pre` MUST suspend directive and interpolation parsing within the preserved subtree; covered syntax inside that subtree MUST remain literal parser output.                           | [`parser.template.v-pre-literal-content`](../testsuites/parser/template/v-pre-literal-content.pkl)                                                                                                                                                                 |
| `SYN-PARSE-9`  | Parser implementations MUST allow declarative interpolation delimiter substitution and MUST decode covered character entities in the retained text surface.                            | [`parser.template.custom-delimiters`](../testsuites/parser/template/custom-delimiters.pkl), [`parser.template.decode-entities-default`](../testsuites/parser/template/decode-entities-default.pkl)                                                                 |
| `SYN-PARSE-10` | Declarative tag-classification hooks for native tags, custom elements, and void tags MUST affect the retained AST shape and text boundaries.                                           | [`parser.template.native-custom-tag-classification`](../testsuites/parser/template/native-custom-tag-classification.pkl), [`parser.template.void-tag-recognition`](../testsuites/parser/template/void-tag-recognition.pkl)                                         |
| `SYN-PARSE-11` | Whitespace strategy selection MUST remain observable at the parser boundary for inter-element separators.                                                                              | [`parser.template.whitespace-condense-between-elements`](../testsuites/parser/template/whitespace-condense-between-elements.pkl), [`parser.template.whitespace-preserve-between-elements`](../testsuites/parser/template/whitespace-preserve-between-elements.pkl) |
| `SYN-PARSE-12` | `parseMode` selection MUST preserve covered raw-text and RCDATA behavior, including SFC root raw-text blocks and HTML textarea handling.                                               | [`parser.template.html-rcdata-textarea`](../testsuites/parser/template/html-rcdata-textarea.pkl), [`parser.template.sfc-root-raw-text`](../testsuites/parser/template/sfc-root-raw-text.pkl)                                                                       |
| `SYN-PARSE-13` | DOM-aware parser implementations MUST preserve covered namespace transitions, including `foreignObject` HTML re-entry and explicit root namespace selection.                           | [`parser.template.dom-svg-foreign-object-namespace`](../testsuites/parser/template/dom-svg-foreign-object-namespace.pkl), [`parser.template.dom-root-svg-namespace`](../testsuites/parser/template/dom-root-svg-namespace.pkl)                                     |

## 4. Non-Requirements

The syntax layer does not define:

- code generation
- optimization flags
- preprocessor execution
- final render-time whitespace behavior
- implementation-private callback hooks that are not representable through the declarative parser option surface

## 5. Constrained Equality

For this chapter, the normative equality relation is:

```text
SyntaxEq ::= DescriptorEq ∧ TemplateAstEq ∧ ErrorEq
DescriptorEq ::= selected descriptor facts are equal
TemplateAstEq ::= selected JSON-pointer projections over normalized AST are equal
ErrorEq ::= selected error code and primary location projections are equal
```

`parse_sfc`, `parse_tpl_base`, and `parse_tpl_dom` are conforming for a test suite `t` iff `SyntaxEq` holds for every projection asserted by `t`.

## 6. Coverage Surface

Syntax conformance in this repository is represented by the conjunction of:

- executable local syntax test suites under [`testsuites/syntax/`](../testsuites/syntax/)
- executable local parser test suites under [`testsuites/parser/`](../testsuites/parser/)
- vendored `vuejs/core` parser and SFC evidence under [`provenance/vendor/vuejs-core/packages/compiler-core/`](../provenance/vendor/vuejs-core/packages/compiler-core/), [`provenance/vendor/vuejs-core/packages/compiler-dom/`](../provenance/vendor/vuejs-core/packages/compiler-dom/), and [`provenance/vendor/vuejs-core/packages/compiler-sfc/`](../provenance/vendor/vuejs-core/packages/compiler-sfc/)
- repository-level provenance under [`provenance/traceability/vuejs-core.traceability.pkl`](../provenance/traceability/vuejs-core.traceability.pkl)

`covered` syntax and parser entries define the executable obligation.
