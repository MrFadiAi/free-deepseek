import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    Upload,
    Cloud,
    Settings as SettingsIcon,
    LogOut,
    Server,
    Users,
    Globe,
    History,
    Loader2,
    BookOpen,
} from 'lucide-react'
import clsx from 'clsx'


import { useI18n } from '../i18n'

const AccountManagerContainer = lazy(() => import('../features/account/AccountManagerContainer'))
const ApiTesterContainer = lazy(() => import('../features/apiTester/ApiTesterContainer'))
const ChatHistoryContainer = lazy(() => import('../features/chatHistory/ChatHistoryContainer'))
const BatchImport = lazy(() => import('../components/BatchImport'))
const VercelSyncContainer = lazy(() => import('../features/vercel/VercelSyncContainer'))
const SettingsContainer = lazy(() => import('../features/settings/SettingsContainer'))
const ProxyManagerContainer = lazy(() => import('../features/proxy/ProxyManagerContainer'))
const InstructionsPage = lazy(() => import('../features/instructions/InstructionsPage'))

function TabLoadingFallback({ label }) {
    return (
        <div className="min-h-[320px] rounded-lg border border-border bg-card flex items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{label}</span>
            </div>
        </div>
    )
}

export default function DashboardShell({ token, onLogout, config, fetchConfig, showMessage, message, onForceLogout, isVercel }) {
    const { t } = useI18n()
    const location = useLocation()
    const navigate = useNavigate()

    const navItems = [
        { id: 'accounts', label: t('nav.accounts.label'), icon: Users },
        { id: 'instructions', label: t('nav.instructions.label'), icon: BookOpen },
        { id: 'test', label: t('nav.test.label'), icon: Server },
        { id: 'history', label: t('nav.history.label'), icon: History },
        { id: 'import', label: t('nav.import.label'), icon: Upload },
        { id: 'settings', label: t('nav.settings.label'), icon: SettingsIcon },
    ]

    const tabIds = new Set(navItems.map(item => item.id))
    const pathSegments = location.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
    const routeSegments = pathSegments[0] === 'admin' ? pathSegments.slice(1) : pathSegments
    const pathTab = routeSegments[0] || ''
    const activeTab = tabIds.has(pathTab) ? pathTab : 'accounts'
    const adminBasePath = pathSegments[0] === 'admin' ? '/admin' : ''
    const activeNavItem = navItems.find(n => n.id === activeTab)

    const navigateToTab = useCallback((tabID) => {
        const nextPath = tabID === 'accounts'
            ? `${adminBasePath || ''}/`
            : `${adminBasePath}/${tabID}`
        navigate(nextPath)
    }, [adminBasePath, navigate])

    const authFetch = useCallback(async (url, options = {}) => {
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        }
        const res = await fetch(url, { ...options, headers })

        if (res.status === 401) {
            onLogout()
            throw new Error(t('auth.expired'))
        }
        return res
    }, [onLogout, t, token])


    const [versionInfo, setVersionInfo] = useState(null)

    useEffect(() => {
        let disposed = false
        async function loadVersion() {
            try {
                const res = await authFetch('/admin/version')
                const data = await res.json()
                if (!disposed) {
                    setVersionInfo(data)
                }
            } catch (_err) {
                if (!disposed) {
                    setVersionInfo(null)
                }
            }
        }
        loadVersion()
        return () => {
            disposed = true
        }
    }, [authFetch])

    const renderTab = () => {
        switch (activeTab) {
            case 'accounts':
                return <AccountManagerContainer config={config} onRefresh={fetchConfig} onMessage={showMessage} authFetch={authFetch} />
            case 'proxies':
                return <ProxyManagerContainer config={config} onRefresh={fetchConfig} onMessage={showMessage} authFetch={authFetch} />
            case 'test':
                return <ApiTesterContainer config={config} onMessage={showMessage} authFetch={authFetch} />
            case 'history':
                return <ChatHistoryContainer onMessage={showMessage} authFetch={authFetch} />
            case 'instructions':
                return <InstructionsPage />
            case 'import':
                return <BatchImport onRefresh={fetchConfig} onMessage={showMessage} authFetch={authFetch} />
            case 'vercel':
                return <VercelSyncContainer onMessage={showMessage} authFetch={authFetch} isVercel={isVercel} config={config} />
            case 'settings':
                return <SettingsContainer onRefresh={fetchConfig} onMessage={showMessage} authFetch={authFetch} onForceLogout={onForceLogout} isVercel={isVercel} />
            default:
                return null
        }
    }

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden text-foreground">
            {/* Top Navigation Bar */}
            <header className="shrink-0 h-14 flex items-center border-b border-border bg-card px-4 gap-2">
                {/* Logo */}
                <div className="flex items-center gap-2 mr-4 shrink-0">
                    <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                        <LayoutDashboard className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm tracking-tight hidden sm:inline">Free DeepSeek</span>
                </div>

                {/* Nav Items — horizontal, scrollable */}
                <nav className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-none">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = activeTab === item.id
                        return (
                            <button
                                key={item.id}
                                onClick={() => navigateToTab(item.id)}
                                className={clsx(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{item.label}</span>
                            </button>
                        )
                    })}
                </nav>

                {/* Right side: version + sign out + credit */}
                <div className="flex items-center gap-3 shrink-0">
                    {versionInfo?.current_tag && (
                        <span className="text-[10px] font-mono text-muted-foreground hidden md:inline">
                            {versionInfo.current_tag}
                        </span>
                    )}
                    {versionInfo?.has_update && (
                        <a
                            className="text-[10px] text-amber-500 hover:text-amber-400 whitespace-nowrap hidden md:inline"
                            href={versionInfo?.release_url || 'https://github.com/MrFadiAi/free-deepseek/releases/latest'}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Update {versionInfo.latest_tag}
                        </a>
                    )}
                    <a
                        href="https://x.com/Mr_CryptoYT"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors hidden sm:flex items-center gap-1"
                    >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        Fdy
                    </a>
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <div className="flex-1 overflow-auto bg-background p-4 lg:p-10">
                    <div className="max-w-6xl mx-auto space-y-4 lg:space-y-6">
                        <div className="hidden lg:block mb-8">
                            <h1 className="text-3xl font-bold tracking-tight mb-2">
                                {activeNavItem?.label}
                            </h1>
                        </div>

                        {message && (
                            <div className={clsx(
                                "p-4 rounded-lg border flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
                                message.type === 'error' ? "bg-destructive/10 border-destructive/20 text-destructive" :
                                    "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                            )}>
                                {message.text}
                            </div>
                        )}

                        <div className="animate-in fade-in duration-500">
                            <Suspense fallback={<TabLoadingFallback label={activeNavItem?.label || 'Free DeepSeek'} />}>
                                {renderTab()}
                            </Suspense>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
