import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    // @glokki-cms/react imports 'next/navigation' without an extension, which Node's ESM loader
    // rejects; inlining lets Vite resolve it.
    server: { deps: { inline: [/@glokki-cms\//] } },
    exclude: ['e2e/**', '.next/**', 'node_modules/**'],
  },
})
