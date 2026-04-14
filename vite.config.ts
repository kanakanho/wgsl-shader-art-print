import process from 'node:process'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  base: process.env.GITHUB_PAGES ? 'wgsl-shader-art-print' : './',
})
