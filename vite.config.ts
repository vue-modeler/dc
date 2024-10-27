import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({ 
      copyDtsFiles: true,
      rollupTypes: true,
    }),
  ],
  test: {
    globals: true,
    environment: "jsdom",
  },
  build: {
    minify: true,
    lib: {
      fileName: 'index',
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
    },
    rollupOptions: {
      external: ['vue'],
    },
  },
})
