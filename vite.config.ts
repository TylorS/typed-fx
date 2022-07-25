import { join } from 'path'

import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tracingPlugin } from './src/Tracing/index'

require('./require-hooks')

export default defineConfig({
  plugins: [
    tsconfigPaths({
      root: __dirname,
    }),
    tracingPlugin({
      tsconfig: join(__dirname, 'tsconfig.json'),
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
