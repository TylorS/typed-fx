import { join } from 'path'

import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tracingPlugin } from './src/Tracing/vite'

const tsConfig = join(__dirname, 'tsconfig.test.json')

export default defineConfig({
  plugins: [
    tsconfigPaths({
      projects: [tsConfig],
    }),
    tracingPlugin({
      tsconfig: tsConfig,
    }),
  ],
  build: {
    outDir: join(__dirname, 'build'),
    sourcemap: true,
    manifest: true,
    emptyOutDir: true,
  },
  server: {
    port: 7777,
  },
})
