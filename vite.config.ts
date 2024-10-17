import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
    plugins: [
    dts({ rollupTypes: true })
],
    build: {
        minify: true,
        lib: {
            fileName: 'index',
            entry: resolve(__dirname, 'src/index.ts'),
            formats: ['es']
        },
        rollupOptions: {
            external: ["vue-demi"],
            output: {
                globals: {
                    vue: "Vue",
                },
            },
        },
    }
})
