import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The frontend reads nothing from .env (its secrets are server-only), so
  // don't load it. On the server .env is unreadable to the deploy user, and
  // loading it would stop the build.
  envDir: false,
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
