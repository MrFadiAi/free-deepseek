import { Trash2 } from 'lucide-react'

export default function AutoDeleteSection({ t, form, setForm }) {
    return (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold">{t('settings.autoDeleteTitle')}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{t('settings.autoDeleteDesc')}</p>
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t('settings.autoDeleteSessions')}</label>
                <button
                    type="button"
                    role="switch"
                    aria-checked={form.auto_delete?.sessions || false}
                    onClick={() => setForm((prev) => ({
                        ...prev,
                        auto_delete: { ...prev.auto_delete, sessions: !prev.auto_delete?.sessions },
                    }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        form.auto_delete?.sessions ? 'bg-primary' : 'bg-muted'
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            form.auto_delete?.sessions ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>
            {form.auto_delete?.sessions && (
                <p className="text-xs text-amber-500 flex items-center gap-1">
                    {t('settings.autoDeleteWarning')}
                </p>
            )}
        </div>
    )
}
