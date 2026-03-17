package admin

import (
	"fmt"
	"strings"

	"ds2api/internal/config"
)

func boolFrom(v any) bool {
	if v == nil {
		return false
	}
	switch x := v.(type) {
	case bool:
		return x
	case string:
		return strings.ToLower(strings.TrimSpace(x)) == "true"
	default:
		return false
	}
}

func parseSettingsUpdateRequest(req map[string]any) (*config.AdminConfig, *config.RuntimeConfig, *config.ToolcallConfig, *config.ResponsesConfig, *config.EmbeddingsConfig, *config.AutoDeleteConfig, map[string]string, map[string]string, error) {
	var (
		adminCfg       *config.AdminConfig
		runtimeCfg     *config.RuntimeConfig
		toolcallCfg    *config.ToolcallConfig
		respCfg        *config.ResponsesConfig
		embCfg         *config.EmbeddingsConfig
		autoDeleteCfg  *config.AutoDeleteConfig
		claudeMap      map[string]string
		aliasMap       map[string]string
	)

	if raw, ok := req["admin"].(map[string]any); ok {
		cfg := &config.AdminConfig{}
		if v, exists := raw["jwt_expire_hours"]; exists {
			n := intFrom(v)
			if n < 1 || n > 720 {
				return nil, nil, nil, nil, nil, nil, nil, nil, fmt.Errorf("admin.jwt_expire_hours must be between 1 and 720")
			}
			cfg.JWTExpireHours = n
		}
		adminCfg = cfg
	}

	if raw, ok := req["runtime"].(map[string]any); ok {
		cfg := &config.RuntimeConfig{}
		if v, exists := raw["account_max_inflight"]; exists {
			n := intFrom(v)
			if n < 1 || n > 256 {
				return nil, nil, nil, nil, nil, nil, nil, nil, fmt.Errorf("runtime.account_max_inflight must be between 1 and 256")
			}
			cfg.AccountMaxInflight = n
		}
		if v, exists := raw["account_max_queue"]; exists {
			n := intFrom(v)
			if n < 1 || n > 200000 {
				return nil, nil, nil, nil, nil, nil, nil, nil, fmt.Errorf("runtime.account_max_queue must be between 1 and 200000")
			}
			cfg.AccountMaxQueue = n
		}
		if v, exists := raw["global_max_inflight"]; exists {
			n := intFrom(v)
			if n < 1 || n > 200000 {
				return nil, nil, nil, nil, nil, nil, nil, nil, fmt.Errorf("runtime.global_max_inflight must be between 1 and 200000")
			}
			cfg.GlobalMaxInflight = n
		}
		if cfg.AccountMaxInflight > 0 && cfg.GlobalMaxInflight > 0 && cfg.GlobalMaxInflight < cfg.AccountMaxInflight {
			return nil, nil, nil, nil, nil, nil, nil, nil, fmt.Errorf("runtime.global_max_inflight must be >= runtime.account_max_inflight")
		}
		runtimeCfg = cfg
	}

	if raw, ok := req["toolcall"].(map[string]any); ok {
		cfg := &config.ToolcallConfig{}
		if v, exists := raw["mode"]; exists {
			mode := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", v)))
			switch mode {
			case "feature_match", "off":
				cfg.Mode = mode
			default:
				return nil, nil, nil, nil, nil, nil, nil, nil, fmt.Errorf("toolcall.mode must be feature_match or off")
			}
		}
		if v, exists := raw["early_emit_confidence"]; exists {
			level := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", v)))
			switch level {
			case "high", "low", "off":
				cfg.EarlyEmitConfidence = level
			default:
				return nil, nil, nil, nil, nil, nil, nil, nil, fmt.Errorf("toolcall.early_emit_confidence must be high, low or off")
			}
		}
		toolcallCfg = cfg
	}

	if raw, ok := req["responses"].(map[string]any); ok {
		cfg := &config.ResponsesConfig{}
		if v, exists := raw["store_ttl_seconds"]; exists {
			n := intFrom(v)
			if n < 30 || n > 86400 {
				return nil, nil, nil, nil, nil, nil, nil, nil, fmt.Errorf("responses.store_ttl_seconds must be between 30 and 86400")
			}
			cfg.StoreTTLSeconds = n
		}
		respCfg = cfg
	}

	if raw, ok := req["embeddings"].(map[string]any); ok {
		cfg := &config.EmbeddingsConfig{}
		if v, exists := raw["provider"]; exists {
			p := strings.TrimSpace(fmt.Sprintf("%v", v))
			cfg.Provider = p
		}
		embCfg = cfg
	}

	if raw, ok := req["claude_mapping"].(map[string]any); ok {
		claudeMap = map[string]string{}
		for k, v := range raw {
			key := strings.TrimSpace(k)
			val := strings.TrimSpace(fmt.Sprintf("%v", v))
			if key == "" || val == "" {
				continue
			}
			claudeMap[key] = val
		}
	}

	if raw, ok := req["model_aliases"].(map[string]any); ok {
		aliasMap = map[string]string{}
		for k, v := range raw {
			key := strings.TrimSpace(k)
			val := strings.TrimSpace(fmt.Sprintf("%v", v))
			if key == "" || val == "" {
				continue
			}
			aliasMap[key] = val
		}
	}

	if raw, ok := req["auto_delete"].(map[string]any); ok {
		cfg := &config.AutoDeleteConfig{}
		if v, exists := raw["sessions"]; exists {
			cfg.Sessions = boolFrom(v)
		}
		autoDeleteCfg = cfg
	}

	return adminCfg, runtimeCfg, toolcallCfg, respCfg, embCfg, autoDeleteCfg, claudeMap, aliasMap, nil
}
