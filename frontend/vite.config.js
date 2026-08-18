import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 前端请求 /api/* 时自动转发到后端 8000 端口
      // 效果：浏览器只认识 5173，不知道 8000 的存在 → 没有跨域(CORS)问题
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
