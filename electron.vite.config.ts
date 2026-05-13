import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    // 排除 uuid 和 @electron-toolkit/utils，让它们被打包进 main bundle
    // 这样打包后不依赖运行时 node_modules
    plugins: [externalizeDepsPlugin({ exclude: ['uuid', '@electron-toolkit/utils'] })]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
