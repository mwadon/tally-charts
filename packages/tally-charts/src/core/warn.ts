// Module-scoped so it never conflicts with @types/node; bundlers replace the expression.
declare const process: { env: { NODE_ENV?: string } }

export type Warn = (key: string, message: string) => void

function detectDev(): boolean {
  try {
    return process.env.NODE_ENV !== 'production'
  } catch {
    // No bundler and no `process` (plain browser ESM): stay quiet.
    return false
  }
}

export const isDev = detectDev()

export function createWarner(): Warn {
  const seen = new Set<string>()
  return (key, message) => {
    if (!isDev || seen.has(key)) return
    seen.add(key)
    console.warn(`[tally-charts] ${message}`)
  }
}
