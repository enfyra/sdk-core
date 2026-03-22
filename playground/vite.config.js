import { defineConfig } from 'vite'

export default defineConfig({
  root: 'playground',
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
    outDir: '../dist-playground',
    emptyOutDir: true,
  },
})
