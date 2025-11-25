import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import dynamicImport from 'vite-plugin-dynamic-import'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    return {
        define: {
            'process.env.API_BASE_URL': JSON.stringify(
                env.REACT_APP_API_BASE_URL,
            ),
        },
        plugins: [
            react({
                babel: {
                    plugins: ['babel-plugin-macros'],
                },
            }),
            dynamicImport(),
        ],
        assetsInclude: ['**/*.md'],
        resolve: {
            alias: {
                '@': path.join(__dirname, 'src'),
            },
        },
        build: {
            outDir: 'build',
        },
        // Configuración para evitar problemas con Dropbox/sincronización
        // Mover caché fuera de node_modules para evitar bloqueos
        cacheDir: '.vite',
        server: {
            watch: {
                // Evitar watch en node_modules para mejor rendimiento
                ignored: ['**/node_modules/**', '**/.git/**', '**/.vite/**'],
            },
            fs: {
                // Permitir servir archivos desde el workspace
                strict: false,
            },
        },
        optimizeDeps: {
            // Optimización de dependencias para evitar bloqueos
            force: false,
            holdUntilCrawlEnd: false,
        },
    }
})
