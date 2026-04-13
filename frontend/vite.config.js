import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_DESKTOP ? './' : '/',
  plugins: [vue(), tailwindcss()],
  test: {
    environment: 'happy-dom',
    globals: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/print': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
