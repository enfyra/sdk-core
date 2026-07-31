import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'

export default defineConfig({
  root: fileURLToPath(new URL('./playground', import.meta.url)),
  resolve: {
    alias: {
      '@enfyra/sdk-core': fileURLToPath(new URL('./dist/index.mjs', import.meta.url)),
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: fileURLToPath(new URL('./dist-playground', import.meta.url)),
    emptyOutDir: true,
  },
})
