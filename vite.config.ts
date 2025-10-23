import path, { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        messageMain: resolve(__dirname, `src/pages/message/main/index.html`),
        messageIframe1: resolve(__dirname, `src/pages/message/iframe1/index.html`),
        messageIframe2: resolve(__dirname, `src/pages/message/iframe2/index.html`),
        messageIframe3: resolve(__dirname, `src/pages/message/iframe3/index.html`),
        ui: resolve(__dirname, `src/pages/ui/index.html`),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api-img': {
        target: 'https://gansu.gscn.com.cn', // Ensure this is a valid URL string
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-img/, ''),
      },
    },
  },
})
