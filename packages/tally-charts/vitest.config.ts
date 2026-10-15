import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // One zone with a DST change on every machine and in CI, so 'local' time tests mean the
    // same everywhere. Node applies TZ when it is set, before any Date is created.
    env: { TZ: 'Europe/Warsaw' },
  },
})
