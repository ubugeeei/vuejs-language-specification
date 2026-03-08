# SFC Syntax

## 1. Scope

This chapter defines descriptor-level SFC parsing and template parser obligations. It does not define code generation.

## 2. Terms

- `descriptor`: the structured result of SFC block parsing
- `base block`: `template`, `script`, or `style`
- `custom block`: any unknown top-level block preserved by the descriptor
- `template AST`: the parser output of the template block under Vue template parsing rules

## 2.1. Abstract Grammar

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
parse_tpl : Source × ParserOptions → ⟨TemplateAst, Error*⟩
```

## 3. Requirements

| ID            | Requirement                                                                                                                                                             | Test Suites                                                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SYN-DESC-1`  | A conforming descriptor parser MUST preserve the existence of `template`, `script`, `script setup`, `style`, and custom blocks, including block count and source order. | [`syntax.sfc.basic-template-only`](../testsuites/syntax/sfc/basic-template-only.pkl), [`syntax.sfc.multiple-styles-and-custom-block`](../testsuites/syntax/sfc/multiple-styles-and-custom-block.pkl)                     |
| `SYN-DESC-2`  | A conforming descriptor parser MUST allow one non-setup `script` block and one `script setup` block to coexist in the same SFC descriptor.                              | [`syntax.sfc.script-and-script-setup`](../testsuites/syntax/sfc/script-and-script-setup.pkl), [`syntax.sfc.script-setup-and-scoped-style`](../testsuites/syntax/sfc/script-setup-and-scoped-style.pkl)                   |
| `SYN-DESC-3`  | Language attributes such as `lang="ts"` and per-style `lang` metadata MUST be preserved as descriptor facts.                                                            | [`syntax.sfc.script-and-script-setup`](../testsuites/syntax/sfc/script-and-script-setup.pkl), [`syntax.sfc.multiple-styles-and-custom-block`](../testsuites/syntax/sfc/multiple-styles-and-custom-block.pkl)             |
| `SYN-DESC-4`  | Scoped style declarations MUST remain observable at descriptor time; descriptor parsing MUST NOT erase the `scoped` contract.                                           | [`syntax.sfc.script-setup-and-scoped-style`](../testsuites/syntax/sfc/script-setup-and-scoped-style.pkl), [`syntax.sfc.multiple-styles-and-custom-block`](../testsuites/syntax/sfc/multiple-styles-and-custom-block.pkl) |
| `SYN-PARSE-1` | Template parsing MUST distinguish element, component, and `template` container nodes.                                                                                   | [`parser.template.element-nesting`](../testsuites/parser/template/element-nesting.pkl), [`parser.template.component-tag-type`](../testsuites/parser/template/component-tag-type.pkl)                                     |
| `SYN-PARSE-2` | Template parsing MUST distinguish plain attributes from directives and MUST preserve directive name, argument, modifier, and expression structure.                      | [`parser.template.directive-and-interpolation`](../testsuites/parser/template/directive-and-interpolation.pkl), [`parser.template.dynamic-arg-modifier`](../testsuites/parser/template/dynamic-arg-modifier.pkl)         |
| `SYN-PARSE-3` | Interpolation parsing MUST preserve the complete JavaScript expression body even when it contains tag-like operators such as `<`.                                       | [`parser.template.text-with-tag-like-interpolation`](../testsuites/parser/template/text-with-tag-like-interpolation.pkl)                                                                                                 |
| `SYN-PARSE-4` | Parser-level normalization that is part of Vue parsing itself, such as class attribute whitespace normalization, MUST remain observable.                                | [`parser.template.class-attribute-normalization`](../testsuites/parser/template/class-attribute-normalization.pkl)                                                                                                       |
| `SYN-PARSE-5` | When comment retention is enabled, comment nodes MUST remain in source order. When disabled, they MUST be omitted from retained children.                               | [`parser.template.comment-preservation`](../testsuites/parser/template/comment-preservation.pkl), [`parser.template.comments-disabled`](../testsuites/parser/template/comments-disabled.pkl)                             |
| `SYN-PARSE-6` | Unquoted attribute values and valueless boolean attributes MUST remain distinguishable in the retained AST.                                                             | [`parser.template.unquoted-attribute-self-closing`](../testsuites/parser/template/unquoted-attribute-self-closing.pkl)                                                                                                   |
| `SYN-PARSE-7` | Recoverable parse failures MUST preserve stable error code and primary location when a case asserts them.                                                               | [`parser.template.missing-end-tag-error`](../testsuites/parser/template/missing-end-tag-error.pkl)                                                                                                                       |
| `SYN-PARSE-8` | `v-pre` MUST suspend directive and interpolation parsing within the preserved subtree; covered syntax inside that subtree MUST remain literal parser output.            | [`parser.template.v-pre-literal-content`](../testsuites/parser/template/v-pre-literal-content.pkl)                                                                                                                       |

## 4. Non-Requirements

The syntax layer does not define:

- code generation
- optimization flags
- preprocessor execution
- final render-time whitespace behavior

## 5. Constrained Equality

For this chapter, the normative equality relation is:

```text
SyntaxEq ::= DescriptorEq ∧ TemplateAstEq ∧ ErrorEq
DescriptorEq ::= selected descriptor facts are equal
TemplateAstEq ::= selected JSON-pointer projections over normalized AST are equal
ErrorEq ::= selected error code and primary location projections are equal
```

`parse_sfc` and `parse_tpl` are conforming for a test suite `t` iff `SyntaxEq` holds for every projection asserted by `t`.
