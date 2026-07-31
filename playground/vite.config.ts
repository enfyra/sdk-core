import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@enfyra/sdk-core': fileURLToPath(
        new URL('../dist/index.mjs', import.meta.url),
      ),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 3001,
  },
})
