package prompt

import "testing"

func TestNormalizeContentNilReturnsEmpty(t *testing.T) {
	if got := NormalizeContent(nil); got != "" {
		t.Fatalf("expected empty string for nil content, got %q", got)
	}
}

func TestMessagesPrepareNilContentNoNullLiteral(t *testing.T) {
	messages := []map[string]any{
		{"role": "assistant", "content": nil},
		{"role": "user", "content": "ok"},
	}
	got := MessagesPrepare(messages)
	if got == "" {
		t.Fatalf("expected non-empty output")
	}
	if got == "null" {
		t.Fatalf("expected no null literal output, got %q", got)
	}
}

func TestNormalizeContentArrayFallsBackToContentWhenTextEmpty(t *testing.T) {
	got := NormalizeContent([]any{
		map[string]any{"type": "text", "text": "", "content": "from-content"},
	})
	if got != "from-content" {
		t.Fatalf("expected fallback to content when text is empty, got %q", got)
	}
}
