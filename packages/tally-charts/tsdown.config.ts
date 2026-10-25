import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: { index: 'src/index.ts', 'core/index': 'src/core/index.ts' },
  format: 'esm',
  platform: 'neutral',
  dts: true,
  sourcemap: true,
  fixedExtension: false,
  clean: true,
  inputOptions: {
    // A type-only import of a package (`TimeInterval`) is dropped from the bundled `.d.ts`, but
    // rolldown keeps a bare `import "d3-time"` for an external it assumes has side effects.
    treeshake: { moduleSideEffects: (_id, external) => !external },
  },
  outputOptions: {
    // Keep `DEV` in an import-free chunk: esbuild only folds a cross-module constant from a module without imports.
    advancedChunks: { groups: [{ name: 'warn', test: /src\/core\/warn\.ts$/ }] },
    // Main entry is a client module (createContext at load); core stays server-safe.
    banner: (chunk) => (chunk.name === 'index' && chunk.isEntry ? "'use client';" : ''),
  },
})
