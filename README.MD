<p align="center">
  <img src="webui/public/ds2api-favicon.svg" width="128" height="128" alt="Free DeepSeek icon" />
</p>

<h1 align="center">Free DeepSeek</h1>

<p align="center">
  <strong>DeepSeek Web Chat → OpenAI / Claude / Gemini Compatible API</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/stringtiger99/free-deepseek.svg" alt="License" /></a>
  <img src="https://img.shields.io/github/stars/stringtiger99/free-deepseek.svg" alt="Stars" />
  <img src="https://img.shields.io/github/forks/stringtiger99/free-deepseek.svg" alt="Forks" />
  <a href="https://github.com/stringtiger99/free-deepseek/releases"><img src="https://img.shields.io/github/v/release/stringtiger99/free-deepseek?display_name=tag" alt="Release" /></a>
</p>

---

Free DeepSeek converts DeepSeek Web chat capabilities into OpenAI, Claude, and Gemini compatible APIs. Built with a **Go backend** and a **React WebUI admin panel** (source in `webui/`, builds to `static/admin`).

## Features

| Feature | Description |
| --- | --- |
| **OpenAI Compatible** | `GET /v1/models`, `POST /v1/chat/completions`, `POST /v1/responses`, `POST /v1/embeddings`, `POST /v1/files` |
| **Claude Compatible** | `GET /anthropic/v1/models`, `POST /anthropic/v1/messages` |
| **Gemini Compatible** | `POST /v1beta/models/{model}:generateContent`, `streamGenerateContent` |
| **Multi-Account Pool** | Automatic token refresh, email & mobile login support |
| **Concurrency Control** | Per-account in-flight limits + wait queues |
| **DeepSeek PoW** | High-performance pure Go implementation |
| **Tool Calling** | Leak prevention, structured incremental output |
| **Admin API** | Config management, hot-reload settings, proxy management, batch testing, session cleanup, import/export |
| **WebUI Dashboard** | Single-page admin app with dark mode at `/admin` |
| **Health Probes** | `GET /healthz` (liveness), `GET /readyz` (readiness) |

## Supported Models

| Model Type | Model ID | Thinking | Search |
| --- | --- | --- | --- |
| default | `deepseek-v4-flash` | On by default, controllable | No |
| default | `deepseek-v4-flash-nothinking` | Always off | No |
| expert | `deepseek-v4-pro` | On by default, controllable | No |
| expert | `deepseek-v4-pro-nothinking` | Always off | No |
| default | `deepseek-v4-flash-search` | On by default, controllable | Yes |
| default | `deepseek-v4-flash-search-nothinking` | Always off | Yes |
| expert | `deepseek-v4-pro-search` | On by default, controllable | Yes |
| expert | `deepseek-v4-pro-search-nothinking` | Always off | Yes |
| vision | `deepseek-v4-vision` | On by default, controllable | No |
| vision | `deepseek-v4-vision-nothinking` | Always off | No |

Common aliases (e.g. `gpt-4.1`, `gpt-5`, `o3`, `claude-*`, `gemini-*`) are also supported and mapped automatically.

## Quick Start

### Option 1: Run from Source

**Prerequisites**: [Go 1.24+](https://go.dev/dl/), Node.js 20.19+ (for WebUI build only)

**Install Go** — download from [go.dev/dl](https://go.dev/dl/) or use your package manager:

```bash
# Linux (amd64)
wget https://go.dev/dl/go1.24.3.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.24.3.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc && source ~/.bashrc
go version

# macOS
brew install go

# Windows — download the MSI from https://go.dev/dl/ and run the installer
```

Then clone, configure, and run:

```bash
git clone https://github.com/MrFadiAi/free-deepseek.git
cd free-deepseek
cp config.example.json config.json
# Edit config.json with your DeepSeek account credentials
go run ./cmd/ds2api
```

Default URL: `http://127.0.0.1:5001`

The server binds to `0.0.0.0:5001`, so LAN devices can access it via your internal IP.

> **WebUI auto-build**: On first launch, if `static/admin` doesn't exist, the server will automatically run `npm ci` and `npm run build`.

### Option 2: Docker

```bash
cp .env.example .env
cp config.example.json config.json
# Edit .env (set DS2API_ADMIN_KEY) and config.json (add your accounts)
docker-compose up -d
```

### Option 3: Vercel

1. Fork this repository
2. Import in Vercel
3. Set environment variables (`DS2API_ADMIN_KEY`, `DS2API_CONFIG_JSON`)
4. Deploy

## Configuration

Copy `config.example.json` to `config.json` and fill in your details:

- **`keys` / `api_keys`**: Client access keys for API authentication
- **`accounts`**: DeepSeek accounts (email or mobile login)
- **`model_aliases`**: Custom model name mappings
- **`runtime`**: Concurrency, queue, and token refresh settings (hot-reloadable via admin)
- **`auto_delete.mode`**: Remote session cleanup after requests (`none` / `single` / `all`)
- **`current_input_file`**: Independent split strategy for long contexts
- **`thinking_injection`**: Thinking enhancement prompt injection (enabled by default)

### Environment Variables

| Variable | Description |
| --- | --- |
| `DS2API_ADMIN_KEY` | Admin panel access key (required) |
| `DS2API_CONFIG_PATH` | Path to config.json file |
| `DS2API_CONFIG_JSON` | Inline config JSON (or Base64-encoded) |
| `PORT` | Server port (default: 5001) |

See `config.example.json` for the full schema.

## Authentication

| Mode | Description |
| --- | --- |
| **Managed Account** | Pass a key from `config.keys` via `Bearer` or `x-api-key` header — the server auto-selects an account |
| **Direct Token** | Pass a raw DeepSeek token not in `config.keys` — used directly |

Optional header `X-Ds2-Target-Account`: target a specific account by email or mobile.
Gemini routes also accept `x-goog-api-key` or `?key=` / `?api_key=` query parameters.

## Concurrency Model

```
Per-account concurrency = DS2API_ACCOUNT_MAX_INFLIGHT (default: 2)
Recommended concurrency = accounts × per-account limit
Queue limit = DS2API_ACCOUNT_MAX_QUEUE (default: recommended concurrency)
429 threshold = in-flight + queue ≈ accounts × 4
```

- When in-flight slots are full, requests enter the wait queue (no immediate 429)
- 429 is only returned when the total capacity is exceeded
- `GET /admin/queue/status` returns real-time concurrency state

## License

This project is licensed under the GNU Affero General Public License v3.0 — see [LICENSE](LICENSE).
