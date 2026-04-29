// Mirrors DefaultModelAliases() from internal/config/models.go
// Keep in sync when Go defaults change.

export const DEFAULT_MODEL_ALIASES = {
    // OpenAI GPT / ChatGPT families
    'chatgpt-4o': 'deepseek-v4-flash',
    'gpt-4': 'deepseek-v4-flash',
    'gpt-4-turbo': 'deepseek-v4-flash',
    'gpt-4-turbo-preview': 'deepseek-v4-flash',
    'gpt-4.5-preview': 'deepseek-v4-flash',
    'gpt-4o': 'deepseek-v4-flash',
    'gpt-4o-mini': 'deepseek-v4-flash',
    'gpt-4.1': 'deepseek-v4-flash',
    'gpt-4.1-mini': 'deepseek-v4-flash',
    'gpt-4.1-nano': 'deepseek-v4-flash',
    'gpt-5': 'deepseek-v4-flash',
    'gpt-5-chat': 'deepseek-v4-flash',
    'gpt-5.1': 'deepseek-v4-flash',
    'gpt-5.1-chat': 'deepseek-v4-flash',
    'gpt-5.2': 'deepseek-v4-flash',
    'gpt-5.2-chat': 'deepseek-v4-flash',
    'gpt-5.3-chat': 'deepseek-v4-flash',
    'gpt-5.4': 'deepseek-v4-flash',
    'gpt-5.5': 'deepseek-v4-flash',
    'gpt-5-mini': 'deepseek-v4-flash',
    'gpt-5-nano': 'deepseek-v4-flash',
    'gpt-5.4-mini': 'deepseek-v4-flash',
    'gpt-5.4-nano': 'deepseek-v4-flash',
    'gpt-5-pro': 'deepseek-v4-pro',
    'gpt-5.2-pro': 'deepseek-v4-pro',
    'gpt-5.4-pro': 'deepseek-v4-pro',
    'gpt-5.5-pro': 'deepseek-v4-pro',
    'gpt-5-codex': 'deepseek-v4-pro',
    'gpt-5.1-codex': 'deepseek-v4-pro',
    'gpt-5.1-codex-mini': 'deepseek-v4-pro',
    'gpt-5.1-codex-max': 'deepseek-v4-pro',
    'gpt-5.2-codex': 'deepseek-v4-pro',
    'gpt-5.3-codex': 'deepseek-v4-pro',
    'codex-mini-latest': 'deepseek-v4-pro',

    // OpenAI reasoning / research families
    'o1': 'deepseek-v4-pro',
    'o1-preview': 'deepseek-v4-pro',
    'o1-mini': 'deepseek-v4-pro',
    'o1-pro': 'deepseek-v4-pro',
    'o3': 'deepseek-v4-pro',
    'o3-mini': 'deepseek-v4-pro',
    'o3-pro': 'deepseek-v4-pro',
    'o3-deep-research': 'deepseek-v4-pro-search',
    'o4-mini': 'deepseek-v4-pro',
    'o4-mini-deep-research': 'deepseek-v4-pro-search',

    // Claude current and historical aliases
    'claude-opus-4-6': 'deepseek-v4-pro',
    'claude-opus-4-1': 'deepseek-v4-pro',
    'claude-opus-4-1-20250805': 'deepseek-v4-pro',
    'claude-opus-4-0': 'deepseek-v4-pro',
    'claude-opus-4-20250514': 'deepseek-v4-pro',
    'claude-sonnet-4-6': 'deepseek-v4-flash',
    'claude-sonnet-4-5': 'deepseek-v4-flash',
    'claude-sonnet-4-5-20250929': 'deepseek-v4-flash',
    'claude-sonnet-4-0': 'deepseek-v4-flash',
    'claude-sonnet-4-20250514': 'deepseek-v4-flash',
    'claude-haiku-4-5': 'deepseek-v4-flash',
    'claude-haiku-4-5-20251001': 'deepseek-v4-flash',
    'claude-3-7-sonnet': 'deepseek-v4-flash',
    'claude-3-7-sonnet-latest': 'deepseek-v4-flash',
    'claude-3-7-sonnet-20250219': 'deepseek-v4-flash',
    'claude-3-5-sonnet': 'deepseek-v4-flash',
    'claude-3-5-sonnet-latest': 'deepseek-v4-flash',
    'claude-3-5-sonnet-20240620': 'deepseek-v4-flash',
    'claude-3-5-sonnet-20241022': 'deepseek-v4-flash',
    'claude-3-5-haiku': 'deepseek-v4-flash',
    'claude-3-5-haiku-latest': 'deepseek-v4-flash',
    'claude-3-5-haiku-20241022': 'deepseek-v4-flash',
    'claude-3-opus': 'deepseek-v4-pro',
    'claude-3-opus-20240229': 'deepseek-v4-pro',
    'claude-3-sonnet': 'deepseek-v4-flash',
    'claude-3-sonnet-20240229': 'deepseek-v4-flash',
    'claude-3-haiku': 'deepseek-v4-flash',
    'claude-3-haiku-20240307': 'deepseek-v4-flash',

    // Gemini current and historical text / multimodal models
    'gemini-pro': 'deepseek-v4-pro',
    'gemini-pro-vision': 'deepseek-v4-vision',
    'gemini-pro-latest': 'deepseek-v4-pro',
    'gemini-flash-latest': 'deepseek-v4-flash',
    'gemini-1.5-pro': 'deepseek-v4-pro',
    'gemini-1.5-flash': 'deepseek-v4-flash',
    'gemini-1.5-flash-8b': 'deepseek-v4-flash',
    'gemini-2.0-flash': 'deepseek-v4-flash',
    'gemini-2.0-flash-lite': 'deepseek-v4-flash',
    'gemini-2.5-pro': 'deepseek-v4-pro',
    'gemini-2.5-flash': 'deepseek-v4-flash',
    'gemini-2.5-flash-lite': 'deepseek-v4-flash',
    'gemini-3.1-pro': 'deepseek-v4-pro',
    'gemini-3-pro': 'deepseek-v4-pro',
    'gemini-3-flash': 'deepseek-v4-flash',
    'gemini-3.1-flash': 'deepseek-v4-flash',
    'gemini-3.1-flash-lite': 'deepseek-v4-flash',

    'llama-3.1-70b-instruct': 'deepseek-v4-flash',
    'qwen-max': 'deepseek-v4-flash',
}

export const DEEPSEEK_TARGET_MODELS = [
    'deepseek-v4-flash',
    'deepseek-v4-pro',
    'deepseek-v4-flash-search',
    'deepseek-v4-pro-search',
    'deepseek-v4-vision',
    'deepseek-v4-flash-nothinking',
    'deepseek-v4-pro-nothinking',
    'deepseek-v4-flash-search-nothinking',
    'deepseek-v4-pro-search-nothinking',
    'deepseek-v4-vision-nothinking',
]

export const ALIAS_FAMILIES = [
    {
        key: 'openai-chat',
        label: 'OpenAI ChatGPT',
        color: 'text-emerald-600 bg-emerald-500/10',
        test: (alias) => {
            if (alias.startsWith('o1') || alias.startsWith('o3') || alias.startsWith('o4')) return false
            return alias.startsWith('chatgpt-') || alias.startsWith('gpt-4') || alias.startsWith('gpt-5') || alias === 'codex-mini-latest'
        },
    },
    {
        key: 'openai-reasoning',
        label: 'OpenAI Reasoning',
        color: 'text-emerald-600 bg-emerald-500/10',
        test: (alias) => alias.startsWith('o1') || alias.startsWith('o3') || alias.startsWith('o4'),
    },
    {
        key: 'claude',
        label: 'Claude',
        color: 'text-amber-600 bg-amber-500/10',
        test: (alias) => alias.startsWith('claude-'),
    },
    {
        key: 'gemini',
        label: 'Gemini',
        color: 'text-blue-600 bg-blue-500/10',
        test: (alias) => alias.startsWith('gemini-'),
    },
    {
        key: 'other',
        label: 'Other',
        color: 'text-gray-500 bg-gray-500/10',
        test: () => true,
    },
]

export function groupAliasesByFamily(aliases) {
    const groups = []
    const assigned = new Set()

    for (const family of ALIAS_FAMILIES) {
        const entries = []
        for (const [alias, target] of Object.entries(aliases)) {
            if (!assigned.has(alias) && family.test(alias)) {
                entries.push({ alias, target })
                assigned.add(alias)
            }
        }
        if (entries.length > 0) {
            entries.sort((a, b) => a.alias.localeCompare(b.alias))
            groups.push({ ...family, entries })
        }
    }
    return groups
}
