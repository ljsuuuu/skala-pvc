import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // 🚀 로컬 개발 서버 프록시 설정
  server: {
    proxy: {
      // 1. /api 로 시작하는 요청은 백엔드(3000번)로 보냄
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // 2. /uploads 로 시작하는 이미지 요청도 백엔드(3000번)로 보냄
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})