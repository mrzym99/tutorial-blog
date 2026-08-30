import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@lib': path.resolve(__dirname, 'docs/.vitepress/lib'),
      '@server': path.resolve(__dirname, 'docs/.vitepress/server'),
      '@data': path.resolve(__dirname, 'docs/.vitepress/data'),
    },
  },
  test: {
    environment: 'node',
    include: ['docs/.vitepress/**/*.test.ts'],
  },
})