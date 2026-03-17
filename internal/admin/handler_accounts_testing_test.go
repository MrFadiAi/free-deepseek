package admin

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"testing"

	"ds2api/internal/auth"
	"ds2api/internal/config"
	"ds2api/internal/deepseek"
)

type testingDSMock struct {
	loginCalls          int
	createSessionCalls  int
	getPowCalls         int
	callCompletionCalls int
}

func (m *testingDSMock) Login(_ context.Context, _ config.Account) (string, error) {
	m.loginCalls++
	return "new-token", nil
}

func (m *testingDSMock) CreateSession(_ context.Context, _ *auth.RequestAuth, _ int) (string, error) {
	m.createSessionCalls++
	return "session-id", nil
}

func (m *testingDSMock) GetPow(_ context.Context, _ *auth.RequestAuth, _ int) (string, error) {
	m.getPowCalls++
	return "", errors.New("should not call GetPow in this test")
}

func (m *testingDSMock) CallCompletion(_ context.Context, _ *auth.RequestAuth, _ map[string]any, _ string, _ int) (*http.Response, error) {
	m.callCompletionCalls++
	return nil, errors.New("should not call CallCompletion in this test")
}

func (m *testingDSMock) DeleteAllSessionsForToken(_ context.Context, _ string) error {
	return nil
}

func (m *testingDSMock) GetSessionCountForToken(_ context.Context, _ string) (*deepseek.SessionStats, error) {
	return &deepseek.SessionStats{Success: true}, nil
}

func TestTestAccount_BatchModeOnlyCreatesSession(t *testing.T) {
	t.Setenv("DS2API_CONFIG_JSON", `{"accounts":[{"email":"batch@example.com","password":"pwd","token":""}]}`)
	store := config.LoadStore()
	ds := &testingDSMock{}
	h := &Handler{Store: store, DS: ds}
	acc, ok := store.FindAccount("batch@example.com")
	if !ok {
		t.Fatal("expected test account")
	}

	result := h.testAccount(context.Background(), acc, "deepseek-chat", "")

	if ok, _ := result["success"].(bool); !ok {
		t.Fatalf("expected success=true, got %#v", result)
	}
	msg, _ := result["message"].(string)
	if !strings.Contains(msg, "仅会话创建") {
		t.Fatalf("expected session-only success message, got %q", msg)
	}
	if ds.loginCalls != 1 || ds.createSessionCalls != 1 {
		t.Fatalf("unexpected Login/CreateSession calls: login=%d createSession=%d", ds.loginCalls, ds.createSessionCalls)
	}
	if ds.getPowCalls != 0 || ds.callCompletionCalls != 0 {
		t.Fatalf("expected no completion flow calls, got getPow=%d callCompletion=%d", ds.getPowCalls, ds.callCompletionCalls)
	}
	updated, ok := store.FindAccount("batch@example.com")
	if !ok {
		t.Fatal("expected updated account")
	}
	if updated.Token != "new-token" {
		t.Fatalf("expected refreshed token to be persisted, got %q", updated.Token)
	}
	if updated.TestStatus != "ok" {
		t.Fatalf("expected test status ok, got %q", updated.TestStatus)
	}
}
