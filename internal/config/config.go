package config

type Config struct {
	Keys             []string          `json:"keys,omitempty"`
	Accounts         []Account         `json:"accounts,omitempty"`
	ClaudeMapping    map[string]string `json:"claude_mapping,omitempty"`
	ClaudeModelMap   map[string]string `json:"claude_model_mapping,omitempty"`
	ModelAliases     map[string]string `json:"model_aliases,omitempty"`
	Admin            AdminConfig       `json:"admin,omitempty"`
	Runtime          RuntimeConfig     `json:"runtime,omitempty"`
	Compat           CompatConfig      `json:"compat,omitempty"`
	Toolcall         ToolcallConfig    `json:"toolcall,omitempty"`
	Responses        ResponsesConfig   `json:"responses,omitempty"`
	Embeddings       EmbeddingsConfig  `json:"embeddings,omitempty"`
		AutoDelete       AutoDeleteConfig  `json:"auto_delete"`
		VercelSyncHash   string            `json:"_vercel_sync_hash,omitempty"`
	VercelSyncTime   int64             `json:"_vercel_sync_time,omitempty"`
	AdditionalFields map[string]any    `json:"-"`
}

type Account struct {
	Email      string `json:"email,omitempty"`
	Mobile     string `json:"mobile,omitempty"`
	Password   string `json:"password,omitempty"`
	Token      string `json:"token,omitempty"`
	TestStatus string `json:"test_status,omitempty"`
}

type CompatConfig struct {
	WideInputStrictOutput *bool `json:"wide_input_strict_output,omitempty"`
}

type AdminConfig struct {
	PasswordHash      string `json:"password_hash,omitempty"`
	JWTExpireHours    int    `json:"jwt_expire_hours,omitempty"`
	JWTValidAfterUnix int64  `json:"jwt_valid_after_unix,omitempty"`
}

type RuntimeConfig struct {
	AccountMaxInflight int `json:"account_max_inflight,omitempty"`
	AccountMaxQueue    int `json:"account_max_queue,omitempty"`
	GlobalMaxInflight  int `json:"global_max_inflight,omitempty"`
}

type ToolcallConfig struct {
	Mode                string `json:"mode,omitempty"`
	EarlyEmitConfidence string `json:"early_emit_confidence,omitempty"`
}

type ResponsesConfig struct {
	StoreTTLSeconds int `json:"store_ttl_seconds,omitempty"`
}

type EmbeddingsConfig struct {
	Provider string `json:"provider,omitempty"`
}

type AutoDeleteConfig struct {
	Sessions bool `json:"sessions"`
}
