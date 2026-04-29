# Tool call parsing semantics (Go/Node unified semantics)

This document describes the **actual behavior** in the current code, as defined by `internal/toolcall`, `internal/toolstream`, and `internal/js/helpers/stream-tool-sieve`.

Documentation navigation: [Overview](../README.MD) / [Architecture](./ARCHITECTURE.md) / [Testing Guide](./TESTING.md)

## 1) Current executable format

The current version recommends model output with DSML shell:

```xml
<|DSML|tool_calls>
  <|DSML|invoke name="read_file">
    <|DSML|parameter name="path"><![CDATA[README.MD]]></|DSML|parameter>
  </|DSML|invoke>
</|DSML|tool_calls>
```

The compatibility layer still accepts legacy canonical XML:

```xml
<tool_calls>
  <invoke name="read_file">
    <parameter name="path"><![CDATA[README.MD]]></parameter>
  </invoke>
</tool_calls>
```

This is not a native DSML end-to-end implementation. DSML serves only as a prompt shell and parsing entry alias; before entering the parser it is normalized to `<tool_calls>` / `<invoke>` / `<parameter>`, and internally still follows existing XML parsing semantics.

Constraints:

- Must have `<|DSML|tool_calls>...</|DSML|tool_calls>` or `<tool_calls>...</tool_calls>` wrapper
- Each call must be within `<|DSML|invoke name="...">...</|DSML|invoke>` or `<invoke name="...">...</invoke>`
- Tool name must be placed in the `name` attribute of `invoke`
- Parameters must use `<|DSML|parameter name="...">...</|DSML|parameter>` or `<parameter name="...">...</parameter>`
- Do not mix DSML tags and legacy XML tool tags within the same tool block; mixed tags are treated as illegal tool blocks

Compatibility fixes:

- If the model misses the opening wrapper but still outputs one or more invokes followed by a closing wrapper, the Go parsing chain will prepend the missing opening wrapper before parsing.
- If the model misses the separator `|` in DSML tags (e.g., `<|DSML tool_calls>` / `<|DSML invoke>` / `<|DSML parameter>`, or `<DSML tool_calls>` without leading pipe), or directly concatenates `DSML` with the tool tag name (e.g., `<DSMLtool_calls>` / `<DSMLinvoke>` / `<DSMLparameter>`), or mistakenly writes the leading pipe as a full-width vertical line (e.g., `<｜DSML|tool_calls>` / `<｜DSML|invoke>` / `<｜DSML|parameter>`), Go / Node will normalize within the fixed tool tag name scope; similar but non-tool-tag names (like `tool_calls_extra`) are still treated as plain text.
- This is a narrow fix for common model errors and does not change the recommended output format; prompts still require the model to directly output the complete DSML shell.
- Bare `<invoke ...>` / `<parameter ...>` will not be treated as "supported tool syntax"; only `tool_calls` wrapper or repairable missing opening wrapper will enter the tool call path.

## 2) Non-compatible content

Any content that does not meet the above DSML / canonical XML patterns will be preserved as plain text and not executed. One exception is the narrow fix scenario mentioned in the previous section for "missing opening wrapper but closing wrapper still present".

The current parser does not treat the allow-list as a hard security boundary: even when a declared tool name list is passed, if undeclared tool names appear in the XML, the parser will still attempt to parse and pass them to the upper-layer protocol output; the actual execution side must still validate tool names and parameters itself.

## 3) Streaming and leak prevention behavior

In the streaming path (consistent across Go / Node):

- DSML `<|DSML|tool_calls>` wrapper, compatible variants (`<dsml|tool_calls>`, `<｜tool_calls>`, `<|tool_calls>`, `<｜DSML|tool_calls>`), narrow-tolerance space-separated forms (like `<|DSML tool_calls>`), concatenated forms (like `<DSMLtool_calls>`), and canonical `<tool_calls>` wrapper all enter structured capture
- If the stream starts directly with invoke but later adds a closing wrapper, Go streaming sieve will also attempt recovery via the missing opening wrapper fix path
- Successfully identified tool calls will not flow back to plain text again
- Blocks that do not match the new format will not execute and will continue to be transparently forwarded as original text
- XML examples within fenced code blocks (backticks `` ``` `` and tildes `~~~`) are always treated as plain text
- Supports nested fences (e.g., 4 backticks nesting 3 backticks) and CDATA internal fence protection
- If the model opens `<![CDATA[` but fails to close it, the streaming scan phase will still conservatively continue buffering and will not mistake example XML within CDATA as real tool calls; in the final parse / flush recovery phase, narrow fixes are applied to such loose CDATA to preserve the complete outer-wrapped real tool calls
- When text mentions a tag name (like `<dsml|tool_calls>` or `<|DSML|tool_calls>` in Markdown inline code) followed immediately by a real tool call, the sieve will skip unparsable mention candidates and continue matching subsequent real tool blocks, ensuring tool calls are not lost due to mentions and not truncating body text after mentions

Additionally, if the value of `<parameter>` is itself a valid JSON literal, it will be parsed as a structured value rather than uniformly preserved as a string. For example, `123`, `true`, `null`, `[1,2]`, `{"a":1}` are restored to corresponding number / boolean / null / array / object.
Structured XML parameters are also restored to JSON structure: if the parameter body contains one or more `<item>...</item>` child nodes, an array is output; item-only fields in nested objects are similarly treated as arrays. For example, `<parameter name="questions"><item><question>...</question></item></parameter>` outputs `{"questions":[{"question":"..."}]}` instead of `{"questions":{"item":...}}`.
If the model mistakenly places a complete structured XML fragment inside CDATA, Go / Node will first protect obvious literal fields (like `content` / `command` / `prompt` / `old_string` / `new_string`); other parameters will attempt to restore the complete XML fragment within CDATA to object / array; common `<br>` separators are normalized to newlines before parsing. However, if CDATA is just a single flat XML/HTML tag, like `<b>urgent</b>` inline markup, the compatibility layer will preserve it as the original string rather than forcibly promoting to object / array; only CDATA fragments that clearly represent structure, such as multiple sibling nodes, nested child nodes, or `item` lists, trigger structured recovery.

## 4) Output structure

`ParseToolCallsDetailed` / `parseToolCallsDetailed` returns:

- `calls`: list of parsed tool calls (`name` + `input`)
- `sawToolCallSyntax`: `true` when DSML / canonical wrapper is detected, or when "missing opening wrapper but repairable" pattern is matched; bare `invoke` does not count toward this flag
- `rejectedByPolicy`: currently fixed as `false`
- `rejectedToolNames`: currently fixed as empty array

## 5) Deployment recommendations

1. Only demonstrate DSML shell syntax in prompts.
2. Upstream clients should directly output complete DSML shell; DS2API is compatible with legacy canonical XML and only applies narrow fixes to "closing tag present, opening tag missing" common errors, and will not generalize acceptance of other legacy formats.
3. Do not rely on parser for security control; executor side should still perform tool name and parameter validation.

## 6) Regression verification

Can directly run:

```bash
go test -v -run 'TestParseToolCalls|TestProcessToolSieve' ./internal/toolcall ./internal/toolstream ./internal/httpapi/openai/...
node --test tests/node/stream-tool-sieve.test.js
```

Key coverage:

- DSML `<|DSML|tool_calls>` wrapper normal parsing
- legacy canonical `<tool_calls>` wrapper normal parsing
- alias variants (`<dsml|tool_calls>`, `<｜tool_calls>`, `<|tool_calls>`), DSML space-separated typo (like `<|DSML tool_calls>`) and concatenated typo (like `<DSMLtool_calls>`) normal parsing
- mixed tags (DSML wrapper + canonical inner) normal parsing after normalization
- examples within tilde fence `~~~` not executed
- examples within nested fences (4 backticks nesting 3 backticks) not executed
- scenarios where text mentions tag name followed immediately by real tool call (including same wrapper variant)
- non-compatible content transparently forwarded as plain text
- code block examples not executed
