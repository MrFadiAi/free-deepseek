package openai

import (
	"strings"
	"testing"

	"ds2api/internal/util"
)

func TestNormalizeOpenAIMessagesForPrompt_AssistantToolCallsAndToolResult(t *testing.T) {
	raw := []any{
		map[string]any{"role": "system", "content": "You are helpful"},
		map[string]any{"role": "user", "content": "查北京天气"},
		map[string]any{
			"role":    "assistant",
			"content": nil,
			"tool_calls": []any{
				map[string]any{
					"id":   "call_1",
					"type": "function",
					"function": map[string]any{
						"name":      "get_weather",
						"arguments": "{\"city\":\"beijing\"}",
					},
				},
			},
		},
		map[string]any{
			"role":         "tool",
			"tool_call_id": "call_1",
			"name":         "get_weather",
			"content":      "{\"temp\":18}",
		},
	}

	normalized := normalizeOpenAIMessagesForPrompt(raw, "")
	if len(normalized) != 4 {
		t.Fatalf("expected 4 normalized messages, got %d", len(normalized))
	}
	assistantContent, _ := normalized[2]["content"].(string)
	if !strings.Contains(assistantContent, "[TOOL_CALL_HISTORY]") ||
		!strings.Contains(assistantContent, "tool_call_id: call_1") ||
		!strings.Contains(assistantContent, "function.name: get_weather") ||
		!strings.Contains(assistantContent, "function.arguments: {\"city\":\"beijing\"}") {
		t.Fatalf("assistant tool call not serialized correctly: %q", assistantContent)
	}
	toolContent, _ := normalized[3]["content"].(string)
	if !strings.Contains(toolContent, "[TOOL_RESULT_HISTORY]") || !strings.Contains(toolContent, "name: get_weather") {
		t.Fatalf("tool result not serialized correctly: %q", toolContent)
	}

	prompt := util.MessagesPrepare(normalized)
	if !strings.Contains(prompt, "tool_call_id: call_1") || !strings.Contains(prompt, "[TOOL_RESULT_HISTORY]") {
		t.Fatalf("expected prompt to include tool call + result semantics: %q", prompt)
	}
}

func TestNormalizeOpenAIMessagesForPrompt_ToolObjectContentPreserved(t *testing.T) {
	raw := []any{
		map[string]any{
			"role":         "tool",
			"tool_call_id": "call_2",
			"name":         "get_weather",
			"content": map[string]any{
				"temp":      18,
				"condition": "sunny",
			},
		},
	}

	normalized := normalizeOpenAIMessagesForPrompt(raw, "")
	got, _ := normalized[0]["content"].(string)
	if !strings.Contains(got, `"temp":18`) || !strings.Contains(got, `"condition":"sunny"`) {
		t.Fatalf("expected serialized object in tool content, got %q", got)
	}
}

func TestNormalizeOpenAIMessagesForPrompt_ToolArrayBlocksJoined(t *testing.T) {
	raw := []any{
		map[string]any{
			"role":         "tool",
			"tool_call_id": "call_3",
			"name":         "read_file",
			"content": []any{
				map[string]any{"type": "input_text", "text": "line-1"},
				map[string]any{"type": "output_text", "text": "line-2"},
				map[string]any{"type": "image_url", "image_url": "https://example.com/a.png"},
			},
		},
	}

	normalized := normalizeOpenAIMessagesForPrompt(raw, "")
	got, _ := normalized[0]["content"].(string)
	if !strings.Contains(got, "line-1\nline-2") {
		t.Fatalf("expected joined text blocks, got %q", got)
	}
}

func TestNormalizeOpenAIMessagesForPrompt_FunctionRoleCompatible(t *testing.T) {
	raw := []any{
		map[string]any{
			"role":         "function",
			"tool_call_id": "call_4",
			"name":         "legacy_tool",
			"content": map[string]any{
				"ok": true,
			},
		},
	}

	normalized := normalizeOpenAIMessagesForPrompt(raw, "")
	if len(normalized) != 1 {
		t.Fatalf("expected one normalized message, got %d", len(normalized))
	}
	if normalized[0]["role"] != "user" {
		t.Fatalf("expected function role mapped to user, got %#v", normalized[0]["role"])
	}
	got, _ := normalized[0]["content"].(string)
	if !strings.Contains(got, "name: legacy_tool") || !strings.Contains(got, `"ok":true`) {
		t.Fatalf("unexpected normalized function-role content: %q", got)
	}
}

func TestNormalizeOpenAIMessagesForPrompt_AssistantMultipleToolCallsRemainSeparated(t *testing.T) {
	raw := []any{
		map[string]any{
			"role": "assistant",
			"tool_calls": []any{
				map[string]any{
					"id":   "call_search",
					"type": "function",
					"function": map[string]any{
						"name":      "search_web",
						"arguments": `{"query":"latest ai news"}`,
					},
				},
				map[string]any{
					"id":   "call_eval",
					"type": "function",
					"function": map[string]any{
						"name":      "eval_javascript",
						"arguments": `{"code":"1+1"}`,
					},
				},
			},
		},
	}

	normalized := normalizeOpenAIMessagesForPrompt(raw, "")
	if len(normalized) != 1 {
		t.Fatalf("expected one normalized assistant message, got %d", len(normalized))
	}
	content, _ := normalized[0]["content"].(string)
	if strings.Count(content, "[TOOL_CALL_HISTORY]") != 2 {
		t.Fatalf("expected two TOOL_CALL_HISTORY blocks, got %q", content)
	}
	if !strings.Contains(content, "tool_call_id: call_search") || !strings.Contains(content, "function.name: search_web") {
		t.Fatalf("missing first tool call block, got %q", content)
	}
	if !strings.Contains(content, "tool_call_id: call_eval") || !strings.Contains(content, "function.name: eval_javascript") {
		t.Fatalf("missing second tool call block, got %q", content)
	}
	if strings.Contains(content, "search_webeval_javascript") {
		t.Fatalf("unexpected merged function name detected: %q", content)
	}
	if strings.Contains(content, `}{"`) {
		t.Fatalf("unexpected concatenated function arguments detected: %q", content)
	}
}

func TestNormalizeOpenAIMessagesForPrompt_PreservesConcatenatedToolArguments(t *testing.T) {
	raw := []any{
		map[string]any{
			"role": "assistant",
			"tool_calls": []any{
				map[string]any{
					"id": "call_1",
					"function": map[string]any{
						"name":      "search_web",
						"arguments": `{}{"query":"测试工具调用"}`,
					},
				},
			},
		},
	}

	normalized := normalizeOpenAIMessagesForPrompt(raw, "")
	if len(normalized) != 1 {
		t.Fatalf("expected one normalized message, got %d", len(normalized))
	}
	content, _ := normalized[0]["content"].(string)
	if !strings.Contains(content, `function.arguments: {}{"query":"测试工具调用"}`) {
		t.Fatalf("expected original concatenated arguments in tool history, got %q", content)
	}
}

func TestNormalizeOpenAIMessagesForPrompt_AssistantNilContentDoesNotInjectNullLiteral(t *testing.T) {
	raw := []any{
		map[string]any{
			"role":    "assistant",
			"content": nil,
			"tool_calls": []any{
				map[string]any{
					"id": "call_screenshot",
					"function": map[string]any{
						"name":      "send_file_to_user",
						"arguments": `{"file_path":"/tmp/a.png"}`,
					},
				},
			},
		},
	}

	normalized := normalizeOpenAIMessagesForPrompt(raw, "")
	if len(normalized) != 1 {
		t.Fatalf("expected one normalized message, got %d", len(normalized))
	}
	content, _ := normalized[0]["content"].(string)
	if strings.Contains(content, "<｜Assistant｜>null") || strings.HasPrefix(strings.TrimSpace(content), "null") {
		t.Fatalf("unexpected null literal injected into assistant tool history: %q", content)
	}
	if !strings.Contains(content, "function.name: send_file_to_user") {
		t.Fatalf("expected tool history block preserved, got %q", content)
	}
}

func TestNormalizeOpenAIMessagesForPrompt_DeveloperRoleMapsToSystem(t *testing.T) {
	raw := []any{
		map[string]any{"role": "developer", "content": "必须先走工具调用"},
		map[string]any{"role": "user", "content": "你好"},
	}
	normalized := normalizeOpenAIMessagesForPrompt(raw, "")
	if len(normalized) != 2 {
		t.Fatalf("expected 2 normalized messages, got %d", len(normalized))
	}
	if normalized[0]["role"] != "system" {
		t.Fatalf("expected developer role converted to system, got %#v", normalized[0]["role"])
	}
}

func TestNormalizeOpenAIMessagesForPrompt_AssistantArrayContentFallbackWhenTextEmpty(t *testing.T) {
	raw := []any{
		map[string]any{
			"role": "assistant",
			"content": []any{
				map[string]any{"type": "text", "text": "", "content": "工具说明文本"},
			},
		},
	}

	normalized := normalizeOpenAIMessagesForPrompt(raw, "")
	if len(normalized) != 1 {
		t.Fatalf("expected one normalized message, got %d", len(normalized))
	}
	content, _ := normalized[0]["content"].(string)
	if content != "工具说明文本" {
		t.Fatalf("expected content fallback text preserved, got %q", content)
	}
}
