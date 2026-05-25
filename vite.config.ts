import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

const BACKEND_PORT = process.env.CLSMGR_BACKEND_PORT || '3000'
const BACKEND_TARGET = `http://localhost:${BACKEND_PORT}`
const FRONTEND_PORT = parseInt(process.env.CLSMGR_FRONTEND_PORT || '5173', 10)

export default defineConfig({
  plugins: [uni()],
  base: '/classmgr/',
  server: {
    host: '0.0.0.0',
    port: FRONTEND_PORT,
    proxy: {
      '/api': {
        target: BACKEND_TARGET,
        changeOrigin: true
      },
      '/uploads': {
        target: BACKEND_TARGET,
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
