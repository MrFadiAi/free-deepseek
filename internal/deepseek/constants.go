package deepseek

import (
	_ "embed"
	"encoding/json"
)

const (
	DeepSeekHost             = "chat.deepseek.com"
	DeepSeekLoginURL         = "https://chat.deepseek.com/api/v0/users/login"
	DeepSeekCreateSessionURL = "https://chat.deepseek.com/api/v0/chat_session/create"
	DeepSeekCreatePowURL     = "https://chat.deepseek.com/api/v0/chat/create_pow_challenge"
	DeepSeekCompletionURL    = "https://chat.deepseek.com/api/v0/chat/completion"
	DeepSeekFetchSessionURL  = "https://chat.deepseek.com/api/v0/chat_session/fetch_page"
	DeepSeekDeleteSessionURL     = "https://chat.deepseek.com/api/v0/chat_session/delete"
	DeepSeekDeleteAllSessionsURL = "https://chat.deepseek.com/api/v0/chat_session/delete_all"
)

var defaultBaseHeaders = map[string]string{
	"Host":              "chat.deepseek.com",
	"User-Agent":        "DeepSeek/1.6.11 Android/35",
	"Accept":            "application/json",
	"Content-Type":      "application/json",
	"x-client-platform": "android",
	"x-client-version":  "1.6.11",
	"x-client-locale":   "zh_CN",
	"accept-charset":    "UTF-8",
}

var defaultSkipContainsPatterns = []string{
	"quasi_status",
	"elapsed_secs",
	"token_usage",
	"pending_fragment",
	"conversation_mode",
	"fragments/-1/status",
	"fragments/-2/status",
	"fragments/-3/status",
}

var defaultSkipExactPaths = []string{
	"response/search_status",
}

var BaseHeaders = cloneStringMap(defaultBaseHeaders)
var SkipContainsPatterns = cloneStringSlice(defaultSkipContainsPatterns)
var SkipExactPathSet = toStringSet(defaultSkipExactPaths)

type sharedConstants struct {
	BaseHeaders         map[string]string `json:"base_headers"`
	SkipContainsPattern []string          `json:"skip_contains_patterns"`
	SkipExactPaths      []string          `json:"skip_exact_paths"`
}

//go:embed constants_shared.json
var sharedConstantsJSON []byte

func init() {
	cfg := sharedConstants{}
	if err := json.Unmarshal(sharedConstantsJSON, &cfg); err != nil {
		return
	}
	if len(cfg.BaseHeaders) > 0 {
		BaseHeaders = cloneStringMap(cfg.BaseHeaders)
	}
	if len(cfg.SkipContainsPattern) > 0 {
		SkipContainsPatterns = cloneStringSlice(cfg.SkipContainsPattern)
	}
	if len(cfg.SkipExactPaths) > 0 {
		SkipExactPathSet = toStringSet(cfg.SkipExactPaths)
	}
}

func cloneStringMap(in map[string]string) map[string]string {
	out := make(map[string]string, len(in))
	for k, v := range in {
		out[k] = v
	}
	return out
}

func cloneStringSlice(in []string) []string {
	out := make([]string, len(in))
	copy(out, in)
	return out
}

func toStringSet(in []string) map[string]struct{} {
	out := make(map[string]struct{}, len(in))
	for _, v := range in {
		if v == "" {
			continue
		}
		out[v] = struct{}{}
	}
	return out
}

const (
	KeepAliveTimeout  = 5
	StreamIdleTimeout = 30
	MaxKeepaliveCount = 10
)
