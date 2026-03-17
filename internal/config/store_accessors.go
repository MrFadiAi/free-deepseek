package config

import (
	"os"
	"strconv"
	"strings"
)

func (s *Store) ClaudeMapping() map[string]string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if len(s.cfg.ClaudeModelMap) > 0 {
		return cloneStringMap(s.cfg.ClaudeModelMap)
	}
	if len(s.cfg.ClaudeMapping) > 0 {
		return cloneStringMap(s.cfg.ClaudeMapping)
	}
	return map[string]string{"fast": "deepseek-chat", "slow": "deepseek-reasoner"}
}

func (s *Store) ModelAliases() map[string]string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := DefaultModelAliases()
	for k, v := range s.cfg.ModelAliases {
		key := strings.TrimSpace(lower(k))
		val := strings.TrimSpace(lower(v))
		if key == "" || val == "" {
			continue
		}
		out[key] = val
	}
	return out
}

func (s *Store) CompatWideInputStrictOutput() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.cfg.Compat.WideInputStrictOutput == nil {
		return true
	}
	return *s.cfg.Compat.WideInputStrictOutput
}

func (s *Store) ToolcallMode() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	mode := strings.TrimSpace(strings.ToLower(s.cfg.Toolcall.Mode))
	if mode == "" {
		return "feature_match"
	}
	return mode
}

func (s *Store) ToolcallEarlyEmitConfidence() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	level := strings.TrimSpace(strings.ToLower(s.cfg.Toolcall.EarlyEmitConfidence))
	if level == "" {
		return "high"
	}
	return level
}

func (s *Store) ResponsesStoreTTLSeconds() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.cfg.Responses.StoreTTLSeconds > 0 {
		return s.cfg.Responses.StoreTTLSeconds
	}
	return 900
}

func (s *Store) EmbeddingsProvider() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return strings.TrimSpace(s.cfg.Embeddings.Provider)
}

func (s *Store) AdminPasswordHash() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return strings.TrimSpace(s.cfg.Admin.PasswordHash)
}

func (s *Store) AdminJWTExpireHours() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.cfg.Admin.JWTExpireHours > 0 {
		return s.cfg.Admin.JWTExpireHours
	}
	if raw := strings.TrimSpace(os.Getenv("DS2API_JWT_EXPIRE_HOURS")); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			return n
		}
	}
	return 24
}

func (s *Store) AdminJWTValidAfterUnix() int64 {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.cfg.Admin.JWTValidAfterUnix
}

func (s *Store) RuntimeAccountMaxInflight() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.cfg.Runtime.AccountMaxInflight > 0 {
		return s.cfg.Runtime.AccountMaxInflight
	}
	for _, key := range []string{"DS2API_ACCOUNT_MAX_INFLIGHT", "DS2API_ACCOUNT_CONCURRENCY"} {
		raw := strings.TrimSpace(os.Getenv(key))
		if raw == "" {
			continue
		}
		n, err := strconv.Atoi(raw)
		if err == nil && n > 0 {
			return n
		}
	}
	return 2
}

func (s *Store) RuntimeAccountMaxQueue(defaultSize int) int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.cfg.Runtime.AccountMaxQueue > 0 {
		return s.cfg.Runtime.AccountMaxQueue
	}
	for _, key := range []string{"DS2API_ACCOUNT_MAX_QUEUE", "DS2API_ACCOUNT_QUEUE_SIZE"} {
		raw := strings.TrimSpace(os.Getenv(key))
		if raw == "" {
			continue
		}
		n, err := strconv.Atoi(raw)
		if err == nil && n >= 0 {
			return n
		}
	}
	if defaultSize < 0 {
		return 0
	}
	return defaultSize
}

func (s *Store) RuntimeGlobalMaxInflight(defaultSize int) int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.cfg.Runtime.GlobalMaxInflight > 0 {
		return s.cfg.Runtime.GlobalMaxInflight
	}
	for _, key := range []string{"DS2API_GLOBAL_MAX_INFLIGHT", "DS2API_MAX_INFLIGHT"} {
		raw := strings.TrimSpace(os.Getenv(key))
		if raw == "" {
			continue
		}
		n, err := strconv.Atoi(raw)
		if err == nil && n > 0 {
			return n
		}
	}
	if defaultSize < 0 {
		return 0
	}
	return defaultSize
}

func (s *Store) AutoDeleteSessions() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.cfg.AutoDelete.Sessions
}
