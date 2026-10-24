import path from 'node:path'
import type { NextConfig } from 'next'

// The workspace root, so Next does not guess it from lockfiles and warn about it.
const root = path.join(import.meta.dirname, '../..')

const config: NextConfig = {
  outputFileTracingRoot: root,
  turbopack: { root },
  // Next writes an AGENTS.md on first `next dev`; the repo keeps agent rules in CLAUDE.md.
  agentRules: false,
}

export default config
