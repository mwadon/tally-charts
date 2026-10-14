import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { index: 'src/index.ts', 'core/index': 'src/core/index.ts' },
  format: 'esm',
  platform: 'neutral',
  dts: true,
  sourcemap: true,
  fixedExtension: false,
  clean: true,
  outputOptions: {
    // Keep `DEV` in an import-free chunk: esbuild only folds a cross-module constant from a module without imports.
    advancedChunks: { groups: [{ name: 'warn', test: /src\/core\/warn\.ts$/ }] },
    // Main entry is a client module (createContext at load); core stays server-safe.
    banner: (chunk) => (chunk.name === 'index' && chunk.isEntry ? "'use client';" : ''),
  },
})
