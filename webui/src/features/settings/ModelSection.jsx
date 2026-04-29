import { useMemo, useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, Plus, Search, Trash2, X } from 'lucide-react'

import {
    DEFAULT_MODEL_ALIASES,
    DEEPSEEK_TARGET_MODELS,
    groupAliasesByFamily,
} from './modelDefaults'

function syncForm(setForm, updatedMap) {
    const text = Object.keys(updatedMap).length === 0
        ? '{}'
        : JSON.stringify(updatedMap, null, 2)
    setForm((prev) => ({ ...prev, model_aliases_text: text }))
}

export default function ModelSection({ t, form, setForm }) {
    const [filter, setFilter] = useState('')
    const [defaultsOpen, setDefaultsOpen] = useState(false)
    const [openFamilies, setOpenFamilies] = useState({})
    const [customsOpen, setCustomsOpen] = useState(true)
    const [newAlias, setNewAlias] = useState('')
    const [newTarget, setNewTarget] = useState(DEEPSEEK_TARGET_MODELS[0])

    const customAliases = useMemo(() => {
        try {
            const parsed = JSON.parse(form.model_aliases_text || '{}')
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
        } catch { /* empty */ }
        return {}
    }, [form.model_aliases_text])

    const filteredDefaults = useMemo(() => {
        const groups = groupAliasesByFamily(DEFAULT_MODEL_ALIASES)
        if (!filter.trim()) return groups
        const q = filter.toLowerCase()
        return groups
            .map((g) => ({
                ...g,
                entries: g.entries.filter(
                    (e) => e.alias.includes(q) || e.target.includes(q),
                ),
            }))
            .filter((g) => g.entries.length > 0)
    }, [filter])

    const filteredCustoms = useMemo(() => {
        const entries = Object.entries(customAliases).map(([alias, target]) => ({ alias, target }))
        if (!filter.trim()) return entries
        const q = filter.toLowerCase()
        return entries.filter((e) => e.alias.includes(q) || e.target.includes(q))
    }, [customAliases, filter])

    const toggleFamily = useCallback((key) => {
        setOpenFamilies((prev) => ({ ...prev, [key]: !prev[key] }))
    }, [])

    const updateCustom = useCallback((oldAlias, newAlias, newTarget) => {
        const map = { ...customAliases }
        if (oldAlias !== newAlias) delete map[oldAlias]
        map[newAlias.toLowerCase().trim()] = newTarget
        syncForm(setForm, map)
    }, [customAliases, setForm])

    const deleteCustom = useCallback((alias) => {
        const map = { ...customAliases }
        delete map[alias]
        syncForm(setForm, map)
    }, [customAliases, setForm])

    const addCustom = useCallback(() => {
        const key = newAlias.toLowerCase().trim()
        if (!key) return
        const map = { ...customAliases, [key]: newTarget }
        syncForm(setForm, map)
        setNewAlias('')
        setNewTarget(DEEPSEEK_TARGET_MODELS[0])
    }, [customAliases, newAlias, newTarget, setForm])

    const defaultCount = Object.keys(DEFAULT_MODEL_ALIASES).length
    const customCount = Object.keys(customAliases).length

    return (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-semibold">{t('settings.modelTitle')}</h3>

            {/* Search / Filter */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder={t('settings.modelFilterAliases')}
                    className="w-full bg-background border border-border rounded-lg pl-9 pr-8 py-2 text-sm"
                />
                {filter && (
                    <button
                        type="button"
                        onClick={() => setFilter('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Default Aliases (read-only) */}
            <div className="border border-border rounded-lg overflow-hidden">
                <button
                    type="button"
                    onClick={() => setDefaultsOpen(!defaultsOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 hover:bg-secondary/80 text-sm font-medium"
                >
                    <span className="flex items-center gap-2">
                        {defaultsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        {t('settings.modelDefaultAliases', { count: defaultCount })}
                    </span>
                </button>
                {defaultsOpen && (
                    <div className="divide-y divide-border">
                        {filteredDefaults.length === 0 && (
                            <p className="px-4 py-3 text-sm text-muted-foreground">No matches</p>
                        )}
                        {filteredDefaults.map((group) => (
                            <div key={group.key}>
                                <button
                                    type="button"
                                    onClick={() => toggleFamily(group.key)}
                                    className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary/30"
                                >
                                    <span className="flex items-center gap-2">
                                        {openFamilies[group.key] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${group.color}`}>
                                            {group.label}
                                        </span>
                                    </span>
                                    <span className="text-[10px]">{group.entries.length}</span>
                                </button>
                                {openFamilies[group.key] && (
                                    <div className="px-4 pb-2 space-y-0.5">
                                        {group.entries.map(({ alias, target }) => (
                                            <div key={alias} className="flex items-center gap-2 text-xs py-0.5">
                                                <code className="text-foreground/80 min-w-0 truncate">{alias}</code>
                                                <span className="text-muted-foreground">→</span>
                                                <code className="text-primary truncate">{target}</code>
                                                {customAliases[alias] && (
                                                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                                                        {t('settings.modelOverridesDefault')}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Custom Aliases (editable) */}
            <div className="border border-border rounded-lg overflow-hidden">
                <button
                    type="button"
                    onClick={() => setCustomsOpen(!customsOpen)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-secondary/50 hover:bg-secondary/80 text-sm font-medium"
                >
                    <span className="flex items-center gap-2">
                        {customsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        {t('settings.modelCustomAliases', { count: customCount })}
                    </span>
                </button>
                {customsOpen && (
                    <div className="divide-y divide-border">
                        {filteredCustoms.length === 0 && !filter && (
                            <p className="px-4 py-3 text-sm text-muted-foreground">
                                {t('settings.modelNoCustomAliases')}
                            </p>
                        )}
                        {filteredCustoms.map(({ alias, target }) => (
                            <div key={alias} className="flex items-center gap-2 px-4 py-2">
                                <input
                                    type="text"
                                    defaultValue={alias}
                                    onBlur={(e) => {
                                        const val = e.target.value.toLowerCase().trim()
                                        if (val && val !== alias) updateCustom(alias, val, target)
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') e.target.blur()
                                    }}
                                    className="flex-1 min-w-0 bg-background border border-border rounded px-2 py-1 text-xs font-mono"
                                    placeholder={t('settings.modelAliasName')}
                                />
                                <select
                                    value={target}
                                    onChange={(e) => updateCustom(alias, alias, e.target.value)}
                                    className="flex-1 min-w-0 bg-background border border-border rounded px-2 py-1 text-xs font-mono"
                                >
                                    {DEEPSEEK_TARGET_MODELS.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                                {DEFAULT_MODEL_ALIASES[alias] && (
                                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                                        {t('settings.modelOverridesDefault')}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => deleteCustom(alias)}
                                    className="shrink-0 p-1 text-muted-foreground hover:text-destructive"
                                    title={t('settings.modelDeleteAlias')}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}

                        {/* Add new alias row */}
                        <div className="flex items-center gap-2 px-4 py-2 bg-secondary/20">
                            <input
                                type="text"
                                value={newAlias}
                                onChange={(e) => setNewAlias(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') addCustom() }}
                                className="flex-1 min-w-0 bg-background border border-border rounded px-2 py-1 text-xs font-mono"
                                placeholder={t('settings.modelAliasName')}
                            />
                            <select
                                value={newTarget}
                                onChange={(e) => setNewTarget(e.target.value)}
                                className="flex-1 min-w-0 bg-background border border-border rounded px-2 py-1 text-xs font-mono"
                            >
                                {DEEPSEEK_TARGET_MODELS.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={addCustom}
                                disabled={!newAlias.trim()}
                                className="shrink-0 p-1 text-primary hover:text-primary/80 disabled:opacity-40"
                                title={t('settings.modelAddAlias')}
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
