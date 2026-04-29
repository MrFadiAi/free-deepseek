import { useState } from 'react'
import { Check, ChevronDown, Copy } from 'lucide-react'
import clsx from 'clsx'

const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'

function fallbackCopy(text) {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy') } finally { document.body.removeChild(ta) }
}

function CopyBtn({ text }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = async () => {
        try {
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
            else fallbackCopy(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            try { fallbackCopy(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* ignore */ }
        }
    }
    return (
        <button onClick={handleCopy} className="absolute top-2 right-2 p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="Copy">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
    )
}

function CodeBlock({ code }) {
    return (
        <div className="relative group">
            <pre className="bg-muted/60 border border-border rounded-lg p-4 text-sm font-mono overflow-x-auto leading-relaxed">
                <code>{code}</code>
            </pre>
            <CopyBtn text={code} />
        </div>
    )
}

function Section({ id, title, icon, children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div id={id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <button
                onClick={() => setOpen(!open)}
                className="w-full p-5 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
            >
                <ChevronDown className={clsx(
                    'w-5 h-5 text-muted-foreground transition-transform duration-200 shrink-0',
                    open ? 'rotate-0' : '-rotate-90'
                )} />
                <span className="text-xl shrink-0">{icon}</span>
                <h2 className="text-lg font-semibold">{title}</h2>
            </button>
            {open && (
                <div className="px-5 pb-5 pt-0 space-y-4 border-t border-border">
                    {children}
                </div>
            )}
        </div>
    )
}

const CODE = {
    openaiPython: `from openai import OpenAI

client = OpenAI(
    base_url="${baseUrl}/v1",
    api_key="your-api-key"
)

response = client.chat.completions.create(
    model="deepseek-v4-pro",
    messages=[
        {"role": "user", "content": "Hello!"}
    ],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")`,

    openaiJS: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: '${baseUrl}/v1',
  apiKey: 'your-api-key',
});

const stream = await client.chat.completions.create({
  model: 'deepseek-v4-pro',
  messages: [{ role: 'user', content: 'Hello!' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}`,

    openaiCurl: `curl ${baseUrl}/v1/chat/completions \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "deepseek-v4-pro",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'`,

    claudePython: `import anthropic

client = anthropic.Anthropic(
    base_url="${baseUrl}/anthropic",
    api_key="your-api-key"
)

message = client.messages.create(
    model="deepseek-v4-pro",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)

print(message.content[0].text)`,

    claudeEnv: `export ANTHROPIC_BASE_URL="${baseUrl}/anthropic"
export ANTHROPIC_API_KEY="your-api-key"`,

    claudeCurl: `curl ${baseUrl}/anthropic/v1/messages \\
  -H "x-api-key: your-api-key" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "deepseek-v4-pro",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,

    geminiPython: `import google.generativeai as genai

# Point to Free DeepSeek instead of Google
genai.configure(
    transport="rest",
    client_options={"api_endpoint": "${baseUrl}"}
)

# Use x-goog-api-key or ?key= for auth
model = genai.GenerativeModel('deepseek-v4-pro')
response = model.generate_content("Hello!")
print(response.text)`,

    geminiCurl: `curl "${baseUrl}/v1beta/models/deepseek-v4-pro:generateContent?key=your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contents": [{"parts": [{"text": "Hello!"}]}]
  }'`,

    toolCalling: `from openai import OpenAI

client = OpenAI(
    base_url="${baseUrl}/v1",
    api_key="your-api-key"
)

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a city",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "City name"}
                },
                "required": ["city"]
            }
        }
    }
]

response = client.chat.completions.create(
    model="deepseek-v4-pro",
    messages=[{"role": "user", "content": "What's the weather in Tokyo?"}],
    tools=tools,
    stream=True
)

for chunk in response:
    delta = chunk.choices[0].delta
    if delta.tool_calls:
        for tc in delta.tool_calls:
            print(f"Tool: {tc.function.name}, Args: {tc.function.arguments}")`,

    openCode: `# ~/.config/opencode/config.json
{
  "provider": {
    "name": "openai",
    "base_url": "${baseUrl}/v1",
    "api_key": "your-api-key"
  },
  "model": "deepseek-v4-pro"
}`,

    cline: `# In VS Code Settings -> Cline configuration:
API Provider: OpenAI Compatible
Base URL: ${baseUrl}/v1
API Key: your-api-key
Model: deepseek-v4-pro`,

    continueDev: `# ~/.continue/config.json
{
  "models": [
    {
      "title": "Free DeepSeek Pro",
      "provider": "openai",
      "model": "deepseek-v4-pro",
      "apiBase": "${baseUrl}/v1",
      "apiKey": "your-api-key"
    }
  ]
}`,

    aider: `# Set environment variables
export OPENAI_API_BASE=${baseUrl}/v1
export OPENAI_API_KEY=your-api-key

# Run aider
aider --model deepseek-v4-pro`,

    cursor: `# In Cursor Settings -> Models:
Override OpenAI Base URL: ${baseUrl}/v1
API Key: your-api-key
Model: deepseek-v4-pro`,
}

const models = [
    { id: 'deepseek-v4-flash', type: 'Chat', features: 'Fast, thinking enabled by default' },
    { id: 'deepseek-v4-pro', type: 'Chat', features: 'Powerful, thinking enabled by default' },
    { id: 'deepseek-v4-flash-search', type: 'Chat + Search', features: 'Flash with web search' },
    { id: 'deepseek-v4-pro-search', type: 'Chat + Search', features: 'Pro with web search' },
    { id: 'deepseek-v4-vision', type: 'Vision', features: 'Image understanding + thinking' },
    { id: 'deepseek-v4-flash-nothinking', type: 'Chat', features: 'Flash without thinking' },
    { id: 'deepseek-v4-pro-nothinking', type: 'Chat', features: 'Pro without thinking' },
]

const aliasGroups = [
    {
        family: 'OpenAI ChatGPT',
        color: 'bg-emerald-500/10 text-emerald-600',
        mappings: [
            { alias: 'chatgpt-4o, gpt-4o, gpt-4o-mini', resolves: 'deepseek-v4-flash' },
            { alias: 'gpt-4, gpt-4-turbo, gpt-4-turbo-preview', resolves: 'deepseek-v4-flash' },
            { alias: 'gpt-4.5-preview, gpt-4.1, gpt-4.1-mini, gpt-4.1-nano', resolves: 'deepseek-v4-flash' },
            { alias: 'gpt-5, gpt-5.1, gpt-5.2, gpt-5-mini, gpt-5-nano', resolves: 'deepseek-v4-flash' },
            { alias: 'gpt-5.4, gpt-5.4-mini, gpt-5.4-nano', resolves: 'deepseek-v4-flash' },
            { alias: 'gpt-5.5, gpt-5.5-pro', resolves: 'deepseek-v4-pro' },
            { alias: 'gpt-5-pro, gpt-5.2-pro, gpt-5.4-pro', resolves: 'deepseek-v4-pro' },
        ],
    },
    {
        family: 'OpenAI Codex',
        color: 'bg-emerald-500/10 text-emerald-600',
        mappings: [
            { alias: 'gpt-5-codex, gpt-5.1-codex, gpt-5.2-codex, gpt-5.3-codex', resolves: 'deepseek-v4-pro' },
            { alias: 'codex-mini-latest, gpt-5.1-codex-mini, gpt-5.1-codex-max', resolves: 'deepseek-v4-pro' },
        ],
    },
    {
        family: 'OpenAI Reasoning',
        color: 'bg-emerald-500/10 text-emerald-600',
        mappings: [
            { alias: 'o1, o1-preview, o1-mini, o1-pro', resolves: 'deepseek-v4-pro' },
            { alias: 'o3, o3-mini, o3-pro', resolves: 'deepseek-v4-pro' },
            { alias: 'o4-mini', resolves: 'deepseek-v4-pro' },
            { alias: 'o3-deep-research, o4-mini-deep-research', resolves: 'deepseek-v4-pro-search' },
        ],
    },
    {
        family: 'Claude',
        color: 'bg-amber-500/10 text-amber-600',
        mappings: [
            { alias: 'claude-opus-4-6, claude-opus-4-1, claude-opus-4-0', resolves: 'deepseek-v4-pro' },
            { alias: 'claude-opus-4-20250514, claude-opus-4-1-20250805', resolves: 'deepseek-v4-pro' },
            { alias: 'claude-3-opus, claude-3-opus-20240229', resolves: 'deepseek-v4-pro' },
            { alias: 'claude-sonnet-4-6, claude-sonnet-4-5, claude-sonnet-4-0', resolves: 'deepseek-v4-flash' },
            { alias: 'claude-sonnet-4-20250514, claude-sonnet-4-5-20250929', resolves: 'deepseek-v4-flash' },
            { alias: 'claude-3-7-sonnet, claude-3-7-sonnet-latest', resolves: 'deepseek-v4-flash' },
            { alias: 'claude-3-5-sonnet, claude-3-5-sonnet-latest', resolves: 'deepseek-v4-flash' },
            { alias: 'claude-3-sonnet, claude-3-sonnet-20240229', resolves: 'deepseek-v4-flash' },
            { alias: 'claude-haiku-4-5, claude-3-5-haiku, claude-3-5-haiku-latest', resolves: 'deepseek-v4-flash' },
            { alias: 'claude-3-haiku, claude-3-haiku-20240307', resolves: 'deepseek-v4-flash' },
        ],
    },
    {
        family: 'Gemini',
        color: 'bg-blue-500/10 text-blue-600',
        mappings: [
            { alias: 'gemini-2.5-pro, gemini-3-pro, gemini-3.1-pro', resolves: 'deepseek-v4-pro' },
            { alias: 'gemini-1.5-pro, gemini-pro, gemini-pro-latest', resolves: 'deepseek-v4-pro' },
            { alias: 'gemini-2.5-flash, gemini-2.5-flash-lite', resolves: 'deepseek-v4-flash' },
            { alias: 'gemini-3-flash, gemini-3.1-flash, gemini-3.1-flash-lite', resolves: 'deepseek-v4-flash' },
            { alias: 'gemini-2.0-flash, gemini-2.0-flash-lite', resolves: 'deepseek-v4-flash' },
            { alias: 'gemini-1.5-flash, gemini-1.5-flash-8b', resolves: 'deepseek-v4-flash' },
            { alias: 'gemini-flash-latest', resolves: 'deepseek-v4-flash' },
            { alias: 'gemini-pro-vision', resolves: 'deepseek-v4-vision' },
        ],
    },
    {
        family: 'Other',
        color: 'bg-gray-500/10 text-gray-500',
        mappings: [
            { alias: 'llama-3.1-70b-instruct', resolves: 'deepseek-v4-flash' },
            { alias: 'qwen-max', resolves: 'deepseek-v4-flash' },
        ],
    },
]

const endpoints = [
    { ep: '/v1/chat/completions', proto: 'OpenAI', desc: 'Chat completions (stream/non-stream)' },
    { ep: '/v1/responses', proto: 'OpenAI', desc: 'Responses API' },
    { ep: '/v1/models', proto: 'OpenAI', desc: 'List available models' },
    { ep: '/anthropic/v1/messages', proto: 'Claude', desc: 'Claude messages endpoint' },
    { ep: '/v1beta/models/{model}:generateContent', proto: 'Gemini', desc: 'Gemini non-stream' },
    { ep: '/v1beta/models/{model}:streamGenerateContent', proto: 'Gemini', desc: 'Gemini stream' },
]

export default function InstructionsPage() {
    return (
        <div className="space-y-4">
            {/* Quick Start */}
            <Section id="quick-start" title="Quick Start" icon="🚀" defaultOpen={true}>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Free DeepSeek provides an API fully compatible with OpenAI, Claude, and Gemini protocols.
                    Use any existing SDK or client — just change the <strong>base URL</strong> and <strong>API key</strong>.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted/40 border border-border rounded-lg p-4 space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Base URL</div>
                        <code className="text-sm font-mono block">{baseUrl}</code>
                    </div>
                    <div className="bg-muted/40 border border-border rounded-lg p-4 space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">API Key</div>
                        <code className="text-sm font-mono block">Use a key from the Account Management tab</code>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    Authentication supports: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Authorization: Bearer &lt;key&gt;</code>,{' '}
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs">x-api-key: &lt;key&gt;</code>,{' '}
                    or <code className="bg-muted px-1.5 py-0.5 rounded text-xs">?key=&lt;key&gt;</code>
                </p>
            </Section>

            {/* OpenAI Compatible */}
            <Section id="openai" title="OpenAI Compatible" icon="🤖">
                <p className="text-sm text-muted-foreground">
                    Works with the official OpenAI Python/JS SDK, Cursor, Continue, aider, and any OpenAI-compatible client.
                </p>
                <div className="space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Python SDK</div>
                    <CodeBlock code={CODE.openaiPython} />
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">JavaScript / TypeScript</div>
                    <CodeBlock code={CODE.openaiJS} />
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">cURL</div>
                    <CodeBlock code={CODE.openaiCurl} />
                </div>
            </Section>

            {/* Claude Compatible */}
            <Section id="claude" title="Claude Compatible" icon="🧠">
                <p className="text-sm text-muted-foreground">
                    Works with the Anthropic Python/JS SDK. Set <code className="bg-muted px-1.5 py-0.5 rounded text-xs">ANTHROPIC_BASE_URL</code> to route requests through Free DeepSeek.
                </p>
                <div className="space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Python SDK</div>
                    <CodeBlock code={CODE.claudePython} />
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Environment Variable</div>
                    <CodeBlock code={CODE.claudeEnv} />
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">cURL</div>
                    <CodeBlock code={CODE.claudeCurl} />
                </div>
            </Section>

            {/* Gemini Compatible */}
            <Section id="gemini" title="Gemini Compatible" icon="✨">
                <p className="text-sm text-muted-foreground">
                    Works with Google's Generative AI SDK. Use the Gemini-compatible endpoint with your API key.
                </p>
                <div className="space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Python SDK</div>
                    <CodeBlock code={CODE.geminiPython} />
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">cURL</div>
                    <CodeBlock code={CODE.geminiCurl} />
                </div>
            </Section>

            {/* Tool Calling */}
            <Section id="tool-calling" title="Tool Calling" icon="🔧">
                <p className="text-sm text-muted-foreground">
                    Free DeepSeek supports function/tool calling via the OpenAI-compatible interface. Define tools in your request and the model will output structured calls.
                </p>
                <div className="space-y-3">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Python Example</div>
                    <CodeBlock code={CODE.toolCalling} />
                </div>
            </Section>

            {/* Agent Integrations */}
            <Section id="agents" title="Agent Integrations" icon="🤝">
                <p className="text-sm text-muted-foreground">
                    Free DeepSeek works with popular AI coding agents and tools. Configure the base URL and API key to get started.
                </p>
                <div className="space-y-6">
                    <div className="space-y-3">
                        <h3 className="text-base font-semibold">OpenCode</h3>
                        <p className="text-sm text-muted-foreground">
                            OpenCode is a terminal-based AI coding assistant. Configure it to use Free DeepSeek as the provider.
                        </p>
                        <CodeBlock code={CODE.openCode} />
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-base font-semibold">Cline (VS Code Extension)</h3>
                        <p className="text-sm text-muted-foreground">
                            Set the API provider to "OpenAI Compatible" and configure the base URL.
                        </p>
                        <CodeBlock code={CODE.cline} />
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-base font-semibold">Continue (VS Code / JetBrains)</h3>
                        <p className="text-sm text-muted-foreground">
                            Add Free DeepSeek as a model provider in your Continue configuration.
                        </p>
                        <CodeBlock code={CODE.continueDev} />
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-base font-semibold">Aider</h3>
                        <p className="text-sm text-muted-foreground">
                            Use aider with the OpenAI-compatible endpoint.
                        </p>
                        <CodeBlock code={CODE.aider} />
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-base font-semibold">Cursor</h3>
                        <p className="text-sm text-muted-foreground">
                            Configure Cursor to use an OpenAI-compatible API.
                        </p>
                        <CodeBlock code={CODE.cursor} />
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-base font-semibold">Custom Agents &amp; Hermes</h3>
                        <p className="text-sm text-muted-foreground">
                            Any agent that supports OpenAI, Claude, or Gemini APIs can connect to Free DeepSeek.
                            Just set the appropriate base URL endpoint:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-muted/40 border border-border rounded-lg p-3 text-center">
                                <div className="text-xs font-semibold text-muted-foreground mb-1">OpenAI</div>
                                <code className="text-xs font-mono">{baseUrl}/v1</code>
                            </div>
                            <div className="bg-muted/40 border border-border rounded-lg p-3 text-center">
                                <div className="text-xs font-semibold text-muted-foreground mb-1">Claude</div>
                                <code className="text-xs font-mono">{baseUrl}/anthropic</code>
                            </div>
                            <div className="bg-muted/40 border border-border rounded-lg p-3 text-center">
                                <div className="text-xs font-semibold text-muted-foreground mb-1">Gemini</div>
                                <code className="text-xs font-mono">{baseUrl}</code>
                            </div>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Available Models */}
            <Section id="models" title="Available Models" icon="📋" defaultOpen={true}>
                <p className="text-sm text-muted-foreground">
                    Native DeepSeek models available through Free DeepSeek. Many popular model names (GPT, Claude, Gemini) are automatically mapped.
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Model ID</th>
                                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Type</th>
                                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Features</th>
                            </tr>
                        </thead>
                        <tbody>
                            {models.map((m) => (
                                <tr key={m.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                    <td className="py-2 px-3 font-mono text-xs">{m.id}</td>
                                    <td className="py-2 px-3">{m.type}</td>
                                    <td className="py-2 px-3 text-muted-foreground">{m.features}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-6 mb-3">Model Alias Mappings</div>
                <p className="text-sm text-muted-foreground mb-3">
                    Any model name below is automatically resolved to the corresponding DeepSeek model. Append <code className="bg-muted px-1.5 py-0.5 rounded text-xs">-nothinking</code> to any native model to disable thinking.
                </p>
                <div className="space-y-4">
                    {aliasGroups.map((group) => (
                        <div key={group.family} className="border border-border rounded-lg overflow-hidden">
                            <div className={clsx('px-4 py-2 font-semibold text-sm', group.color)}>
                                {group.family}
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/20">
                                        <th className="text-left py-1.5 px-4 font-semibold text-muted-foreground text-xs">Alias(es)</th>
                                        <th className="text-left py-1.5 px-4 font-semibold text-muted-foreground text-xs">Resolves To</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.mappings.map((m, i) => (
                                        <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                                            <td className="py-1.5 px-4 font-mono text-xs">{m.alias}</td>
                                            <td className="py-1.5 px-4 font-mono text-xs text-primary font-medium">{m.resolves}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
                <div className="mt-4 bg-muted/40 border border-border rounded-lg p-4 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">How Resolution Works</div>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>If the model is a native DeepSeek model (e.g. <code className="bg-muted px-1 py-0.5 rounded text-xs">deepseek-v4-pro</code>), use it directly.</li>
                        <li>Check the alias table above for an exact match.</li>
                        <li>For unrecognized models from known families (gpt-, claude-, gemini-), apply heuristic rules based on keywords like <em>vision</em>, <em>reason</em>, <em>opus</em>, <em>search</em>.</li>
                        <li>Append <code className="bg-muted px-1 py-0.5 rounded text-xs">-nothinking</code> suffix handling.</li>
                    </ol>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                    Full model list available at <code className="bg-muted px-1 py-0.5 rounded">{baseUrl}/v1/models</code>
                </p>
            </Section>

            {/* API Endpoints */}
            <Section id="endpoints" title="API Endpoints" icon="📡">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Endpoint</th>
                                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Protocol</th>
                                <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {endpoints.map((r, i) => (
                                <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                    <td className="py-2 px-3 font-mono text-xs">{r.ep}</td>
                                    <td className="py-2 px-3"><span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium">{r.proto}</span></td>
                                    <td className="py-2 px-3 text-muted-foreground">{r.desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Section>
        </div>
    )
}
