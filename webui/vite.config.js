import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const webuiDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(webuiDir, '..')

export default defineConfig(({ mode }) => ({
    plugins: [
        react(),
    ],
    server: {
        port: 5173,
        fs: {
            allow: [repoRoot],
        },
        proxy: {
            // Proxy /admin API requests to backend
            '/admin': {
                target: 'http://localhost:5001',
                changeOrigin: true,
                // Only proxy API requests; return false for page requests to let Vite handle them
                bypass(req, res, proxyOptions) {
                    const url = req.url
                    // Exact /admin or /admin/ is a page request, don't proxy
                    if (url === '/admin' || url === '/admin/' || url === '/admin?') {
                        console.log('[Vite Proxy] Bypass (page):', url)
                        return '/index.html'
                    }
                    // Other /admin/* paths are API requests, proxy to backend
                    console.log('[Vite Proxy] Proxy to backend:', url)
                    // Return undefined or null to skip bypass (i.e. proceed with proxy)
                },
            },
            '/v1': {
                target: 'http://localhost:5001',
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: '../static/admin',
        emptyOutDir: true,
    },
    // Use / for dev, /admin/ for production build
    base: mode === 'production' ? '/admin/' : '/',
}))
