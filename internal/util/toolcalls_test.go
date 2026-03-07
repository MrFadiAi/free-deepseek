package util

import "testing"

func TestParseToolCalls(t *testing.T) {
	text := `prefix {"tool_calls":[{"name":"search","input":{"q":"golang"}}]} suffix`
	calls := ParseToolCalls(text, []string{"search"})
	if len(calls) != 1 {
		t.Fatalf("expected 1 call, got %d", len(calls))
	}
	if calls[0].Name != "search" {
		t.Fatalf("unexpected tool name: %s", calls[0].Name)
	}
	if calls[0].Input["q"] != "golang" {
		t.Fatalf("unexpected args: %#v", calls[0].Input)
	}
}

func TestParseToolCallsFromFencedJSON(t *testing.T) {
	text := "I will call tools now\n```json\n{\"tool_calls\":[{\"name\":\"search\",\"input\":{\"q\":\"news\"}}]}\n```"
	calls := ParseToolCalls(text, []string{"search"})
	if len(calls) != 0 {
		t.Fatalf("expected fenced tool_call example to be ignored, got %#v", calls)
	}
}

func TestParseToolCallsWithFunctionArgumentsString(t *testing.T) {
	text := `{"tool_calls":[{"function":{"name":"get_weather","arguments":"{\"city\":\"beijing\"}"}}]}`
	calls := ParseToolCalls(text, []string{"get_weather"})
	if len(calls) != 1 {
		t.Fatalf("expected 1 call, got %d", len(calls))
	}
	if calls[0].Name != "get_weather" {
		t.Fatalf("unexpected tool name: %s", calls[0].Name)
	}
	if calls[0].Input["city"] != "beijing" {
		t.Fatalf("unexpected args: %#v", calls[0].Input)
	}
}

func TestParseToolCallsRejectsUnknownToolName(t *testing.T) {
	text := `{"tool_calls":[{"name":"unknown","input":{}}]}`
	calls := ParseToolCalls(text, []string{"search"})
	if len(calls) != 0 {
		t.Fatalf("expected unknown tool to be rejected, got %#v", calls)
	}
}

func TestParseToolCallsAllowsCaseInsensitiveToolNameAndCanonicalizes(t *testing.T) {
	text := `{"tool_calls":[{"name":"Bash","input":{"command":"ls -al"}}]}`
	calls := ParseToolCalls(text, []string{"bash"})
	if len(calls) != 1 {
		t.Fatalf("expected 1 call, got %#v", calls)
	}
	if calls[0].Name != "bash" {
		t.Fatalf("expected canonical tool name bash, got %q", calls[0].Name)
	}
}

func TestParseToolCallsDetailedMarksPolicyRejection(t *testing.T) {
	text := `{"tool_calls":[{"name":"unknown","input":{}}]}`
	res := ParseToolCallsDetailed(text, []string{"search"})
	if !res.SawToolCallSyntax {
		t.Fatalf("expected SawToolCallSyntax=true, got %#v", res)
	}
	if !res.RejectedByPolicy {
		t.Fatalf("expected RejectedByPolicy=true, got %#v", res)
	}
	if len(res.Calls) != 0 {
		t.Fatalf("expected no calls after policy rejection, got %#v", res.Calls)
	}
}

func TestParseToolCallsDetailedRejectsWhenAllowListEmpty(t *testing.T) {
	text := `{"tool_calls":[{"name":"search","input":{"q":"go"}}]}`
	res := ParseToolCallsDetailed(text, nil)
	if !res.SawToolCallSyntax {
		t.Fatalf("expected SawToolCallSyntax=true, got %#v", res)
	}
	if !res.RejectedByPolicy {
		t.Fatalf("expected RejectedByPolicy=true, got %#v", res)
	}
	if len(res.Calls) != 0 {
		t.Fatalf("expected no calls when allow-list is empty, got %#v", res.Calls)
	}
}

func TestFormatOpenAIToolCalls(t *testing.T) {
	formatted := FormatOpenAIToolCalls([]ParsedToolCall{{Name: "search", Input: map[string]any{"q": "x"}}})
	if len(formatted) != 1 {
		t.Fatalf("expected 1, got %d", len(formatted))
	}
	fn, _ := formatted[0]["function"].(map[string]any)
	if fn["name"] != "search" {
		t.Fatalf("unexpected function name: %#v", fn)
	}
}

func TestParseStandaloneToolCallsOnlyMatchesStandalonePayload(t *testing.T) {
	mixed := `这里是示例：{"tool_calls":[{"name":"search","input":{"q":"go"}}]}`
	if calls := ParseStandaloneToolCalls(mixed, []string{"search"}); len(calls) != 0 {
		t.Fatalf("expected standalone parser to ignore mixed prose, got %#v", calls)
	}

	standalone := `{"tool_calls":[{"name":"search","input":{"q":"go"}}]}`
	calls := ParseStandaloneToolCalls(standalone, []string{"search"})
	if len(calls) != 1 {
		t.Fatalf("expected standalone parser to match, got %#v", calls)
	}
}

func TestParseStandaloneToolCallsIgnoresFencedCodeBlock(t *testing.T) {
	fenced := "```json\n{\"tool_calls\":[{\"name\":\"search\",\"input\":{\"q\":\"go\"}}]}\n```"
	if calls := ParseStandaloneToolCalls(fenced, []string{"search"}); len(calls) != 0 {
		t.Fatalf("expected fenced tool_call example to be ignored, got %#v", calls)
	}
}

func TestParseToolCallsAllowsQualifiedToolName(t *testing.T) {
	text := `{"tool_calls":[{"name":"mcp.search_web","input":{"q":"golang"}}]}`
	calls := ParseToolCalls(text, []string{"search_web"})
	if len(calls) != 1 {
		t.Fatalf("expected 1 call, got %#v", calls)
	}
	if calls[0].Name != "search_web" {
		t.Fatalf("expected canonical tool name search_web, got %q", calls[0].Name)
	}
}

func TestParseToolCallsAllowsPunctuationVariantToolName(t *testing.T) {
	text := `{"tool_calls":[{"name":"read-file","input":{"path":"README.md"}}]}`
	calls := ParseToolCalls(text, []string{"read_file"})
	if len(calls) != 1 {
		t.Fatalf("expected 1 call, got %#v", calls)
	}
	if calls[0].Name != "read_file" {
		t.Fatalf("expected canonical tool name read_file, got %q", calls[0].Name)
	}
}

func TestParseToolCallsSupportsClaudeXMLToolCall(t *testing.T) {
	text := `<tool_call><tool_name>Bash</tool_name><parameters><command>pwd</command><description>show cwd</description></parameters></tool_call>`
	calls := ParseToolCalls(text, []string{"bash"})
	if len(calls) != 1 {
		t.Fatalf("expected 1 call, got %#v", calls)
	}
	if calls[0].Name != "bash" {
		t.Fatalf("expected canonical tool name bash, got %q", calls[0].Name)
	}
	if calls[0].Input["command"] != "pwd" {
		t.Fatalf("expected command argument, got %#v", calls[0].Input)
	}
}

func TestParseToolCallsDetailedMarksXMLToolCallSyntax(t *testing.T) {
	text := `<tool_call><tool_name>Bash</tool_name><parameters><command>pwd</command></parameters></tool_call>`
	res := ParseToolCallsDetailed(text, []string{"bash"})
	if !res.SawToolCallSyntax {
		t.Fatalf("expected SawToolCallSyntax=true, got %#v", res)
	}
	if len(res.Calls) != 1 {
		t.Fatalf("expected one parsed call, got %#v", res)
	}
}

func TestParseToolCallsSupportsClaudeXMLJSONToolCall(t *testing.T) {
	text := `<tool_call>{"tool":"Bash","params":{"command":"pwd","description":"show cwd"}}</tool_call>`
	calls := ParseToolCalls(text, []string{"bash"})
	if len(calls) != 1 {
		t.Fatalf("expected 1 call, got %#v", calls)
	}
	if calls[0].Name != "bash" {
		t.Fatalf("expected canonical tool name bash, got %q", calls[0].Name)
	}
	if calls[0].Input["command"] != "pwd" {
		t.Fatalf("expected command argument, got %#v", calls[0].Input)
	}
}

func TestParseToolCallsSupportsFunctionCallTagStyle(t *testing.T) {
	text := `<function_call>Bash</function_call><function parameter name="command">ls -la</function parameter><function parameter name="description">list</function parameter>`
	calls := ParseToolCalls(text, []string{"bash"})
	if len(calls) != 1 {
		t.Fatalf("expected 1 call, got %#v", calls)
	}
	if calls[0].Name != "bash" {
		t.Fatalf("expected canonical tool name bash, got %q", calls[0].Name)
	}
	if calls[0].Input["command"] != "ls -la" {
		t.Fatalf("expected command argument, got %#v", calls[0].Input)
	}
}

func TestParseToolCallsSupportsAntmlFunctionCallStyle(t *testing.T) {
	text := `<antml:function_calls><antml:function_call name="Bash">{"command":"pwd","description":"x"}</antml:function_call></antml:function_calls>`
	calls := ParseToolCalls(text, []string{"bash"})
	if len(calls) != 1 {
		t.Fatalf("expected 1 call, got %#v", calls)
	}
	if calls[0].Name != "bash" {
		t.Fatalf("expected canonical tool name bash, got %q", calls[0].Name)
	}
	if calls[0].Input["command"] != "pwd" {
		t.Fatalf("expected command argument, got %#v", calls[0].Input)
	}
}

func TestParseToolCallsSupportsAntmlArgumentStyle(t *testing.T) {
	text := `<antml:function_calls><antml:function_call id="1" name="Bash"><antml:argument name="command">pwd</antml:argument><antml:argument name="description">x</antml:argument></antml:function_call></antml:function_calls>`
	calls := ParseToolCalls(text, []string{"bash"})
	if len(calls) != 1 {
		t.Fatalf("expected 1 call, got %#v", calls)
	}
	if calls[0].Name != "bash" {
		t.Fatalf("expected canonical tool name bash, got %q", calls[0].Name)
	}
	if calls[0].Input["command"] != "pwd" {
		t.Fatalf("expected command argument, got %#v", calls[0].Input)
	}
}

func TestParseToolCallsSupportsInvokeFunctionCallStyle(t *testing.T) {
	text := `<function_calls><invoke name="Bash"><parameter name="command">pwd</parameter><parameter name="description">d</parameter></invoke></function_calls>`
	calls := ParseToolCalls(text, []string{"bash"})
	if len(calls) != 1 {
		t.Fatalf("expected 1 call, got %#v", calls)
	}
	if calls[0].Name != "bash" {
		t.Fatalf("expected canonical tool name bash, got %q", calls[0].Name)
	}
	if calls[0].Input["command"] != "pwd" {
		t.Fatalf("expected command argument, got %#v", calls[0].Input)
	}
}

func TestParseToolCallsSupportsNestedToolTagStyle(t *testing.T) {
	text := `<tool_call><tool name="Bash"><command>pwd</command><description>show cwd</description></tool></tool_call>`
	calls := ParseToolCalls(text, []string{"bash"})
	if len(calls) != 1 {
		t.Fatalf("expected 1 call, got %#v", calls)
	}
	if calls[0].Name != "bash" {
		t.Fatalf("expected canonical tool name bash, got %q", calls[0].Name)
	}
	if calls[0].Input["command"] != "pwd" {
		t.Fatalf("expected command argument, got %#v", calls[0].Input)
	}
}

func TestParseToolCallsSupportsAntmlFunctionAttributeWithParametersTag(t *testing.T) {
	text := `<antml:function_calls><antml:function_call id="x" function="Bash"><antml:parameters>{"command":"pwd"}</antml:parameters></antml:function_call></antml:function_calls>`
	calls := ParseToolCalls(text, []string{"bash"})
	if len(calls) != 1 {
		t.Fatalf("expected 1 call, got %#v", calls)
	}
	if calls[0].Name != "bash" {
		t.Fatalf("expected canonical tool name bash, got %q", calls[0].Name)
	}
	if calls[0].Input["command"] != "pwd" {
		t.Fatalf("expected command argument, got %#v", calls[0].Input)
	}
}

func TestParseToolCallsSupportsMultipleAntmlFunctionCalls(t *testing.T) {
	text := `<antml:function_calls><antml:function_call id="1" function="Bash"><antml:parameters>{"command":"pwd"}</antml:parameters></antml:function_call><antml:function_call id="2" function="Read"><antml:parameters>{"file_path":"README.md"}</antml:parameters></antml:function_call></antml:function_calls>`
	calls := ParseToolCalls(text, []string{"bash", "read"})
	if len(calls) != 2 {
		t.Fatalf("expected 2 calls, got %#v", calls)
	}
	if calls[0].Name != "bash" || calls[1].Name != "read" {
		t.Fatalf("expected canonical names [bash read], got %#v", calls)
	}
}

func TestParseToolCallsDoesNotAcceptMismatchedMarkupTags(t *testing.T) {
	text := `<tool_call><name>read_file</function><arguments>{"path":"README.md"}</arguments></tool_call>`
	calls := ParseToolCalls(text, []string{"read_file"})
	if len(calls) != 0 {
		t.Fatalf("expected mismatched tags to be rejected, got %#v", calls)
	}
}
