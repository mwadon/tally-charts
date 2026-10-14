// Module-scoped so it never conflicts with @types/node; bundlers replace `process.env.NODE_ENV`.
declare const process: { env: { NODE_ENV?: string } }

export type Warn = (key: string, message: string) => void

/**
 * True outside production builds. Reads `process.env.NODE_ENV` directly, as React does, so the
 * app's bundler must define it: the bundler then folds this to a constant and drops every
 * `if (DEV)` block together with its message strings in production.
 */
export const DEV: boolean = process.env.NODE_ENV !== 'production'

/** Alias of `DEV`, kept for the 0.1 public API. */
export const isDev = DEV

export function createWarner(): Warn {
  const seen = new Set<string>()
  return (key, message) => {
    if (!DEV || seen.has(key)) return
    seen.add(key)
    console.warn(`[tally-charts] ${message}`)
  }
}
