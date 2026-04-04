package admin

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"ds2api/internal/devcapture"
)

type stubOpenAIChatCaller struct{}

func (stubOpenAIChatCaller) ChatCompletions(w http.ResponseWriter, _ *http.Request) {
	store := devcapture.Global()
	session := store.Start("deepseek_completion", "https://chat.deepseek.com/api/v0/chat/completion", "acct-test", map[string]any{"model": "deepseek-chat"})
	raw := io.NopCloser(strings.NewReader(
		"data: {\"v\":\"hello [reference:1]\"}\n\n" +
			"data: {\"v\":\"FINISHED\",\"p\":\"response/status\"}\n\n",
	))
	if session != nil {
		raw = session.WrapBody(raw, http.StatusOK)
	}
	_, _ = io.ReadAll(raw)
	_ = raw.Close()

	w.Header().Set("Content-Type", "text/event-stream")
	w.WriteHeader(http.StatusOK)
	_, _ = io.WriteString(w, "data: {\"choices\":[{\"delta\":{\"content\":\"hello\"},\"index\":0}],\"created\":1,\"id\":\"id\",\"model\":\"m\",\"object\":\"chat.completion.chunk\"}\n\n")
}

func TestCaptureRawSampleWritesPersistentSample(t *testing.T) {
	t.Setenv("DS2API_RAW_STREAM_SAMPLE_ROOT", t.TempDir())
	devcapture.Global().Clear()
	defer devcapture.Global().Clear()

	h := &Handler{OpenAI: stubOpenAIChatCaller{}}
	reqBody := `{
		"sample_id":"My Sample 01",
		"api_key":"local-key",
		"model":"deepseek-chat",
		"message":"广州天气",
		"stream":true
	}`
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/admin/dev/raw-samples/capture", strings.NewReader(reqBody))
	h.captureRawSample(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", rec.Code, rec.Body.String())
	}
	if got := rec.Header().Get("X-Ds2-Sample-Id"); got != "my-sample-01" {
		t.Fatalf("expected sample id header my-sample-01, got %q", got)
	}
	if got := rec.Header().Get("X-Ds2-Sample-Upstream"); got != filepath.Join(os.Getenv("DS2API_RAW_STREAM_SAMPLE_ROOT"), "my-sample-01", "upstream.stream.sse") {
		t.Fatalf("unexpected sample upstream header: %q", got)
	}
	if !strings.Contains(rec.Body.String(), `"content":"hello"`) {
		t.Fatalf("expected proxied openai output, got %s", rec.Body.String())
	}

	sampleDir := filepath.Join(os.Getenv("DS2API_RAW_STREAM_SAMPLE_ROOT"), "my-sample-01")
	if _, err := os.Stat(sampleDir); err != nil {
		t.Fatalf("sample dir missing: %v", err)
	}
	metaBytes, err := os.ReadFile(filepath.Join(sampleDir, "meta.json"))
	if err != nil {
		t.Fatalf("read meta: %v", err)
	}
	var meta map[string]any
	if err := json.Unmarshal(metaBytes, &meta); err != nil {
		t.Fatalf("decode meta: %v", err)
	}
	if meta["sample_id"] != "my-sample-01" {
		t.Fatalf("unexpected meta sample_id: %#v", meta["sample_id"])
	}
	capture, _ := meta["capture"].(map[string]any)
	if capture == nil {
		t.Fatalf("missing capture meta: %#v", meta)
	}
	if got := int(capture["response_bytes"].(float64)); got == 0 {
		t.Fatalf("expected capture bytes to be recorded, got %#v", capture)
	}
	if _, ok := meta["processed"]; ok {
		t.Fatalf("unexpected processed meta: %#v", meta["processed"])
	}
}
