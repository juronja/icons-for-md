import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // server: { // The idea is that you redirect all request that point to /api to express server root folder. Hence the rewrite. https://vite.dev/config/server-options.html#server-proxy
  //   proxy: {
  //     '/api': {
  //       target: 'http://localhost:3000', // Replace with your Express server's URL
  //       changeOrigin: true,
  //       //secure: false,
  //     }
  //   }
  // }
})
