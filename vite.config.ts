import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { handleRoute } from './src/server/http.js'

try {
  process.loadEnvFile(fileURLToPath(new URL('./.env.local', import.meta.url)))
} catch {
  /* .env.local not found */
}

function apiPlugin(): Plugin {
  return {
    name: 'crypton-api-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/api')) {
          handleRoute(req, res).catch((err) => {
            console.error('API middleware error:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Internal server error' }))
          })
          return
        }
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/api')) {
          handleRoute(req, res).catch((err) => {
            console.error('API preview error:', err)
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Internal server error' }))
          })
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
