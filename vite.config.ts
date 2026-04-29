import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  base: '/classmgr/',
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
