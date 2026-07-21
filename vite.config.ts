import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        // 3D種目アニメの方式比較プロトタイプ(/proto3d.html)
        proto3d: resolve(__dirname, 'proto3d.html'),
      },
    },
  },
})
