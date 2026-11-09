import path from 'node:path'
import type { NextConfig } from 'next'
import { securityHeaders } from './lib/security-headers'

// The workspace root, so Next does not guess it from lockfiles and warn about it.
const root = path.join(import.meta.dirname, '../..')

const config: NextConfig = {
  outputFileTracingRoot: root,
  turbopack: { root },
  // Next writes an AGENTS.md on first `next dev`; the repo keeps agent rules in CLAUDE.md.
  agentRules: false,
  // Evaluated at build time, like the NEXT_PUBLIC_CMS_EDITOR_ORIGIN the CSP is made from.
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders() }]
  },
  // /docs has no page of its own.
  async redirects() {
    return [{ source: '/docs', destination: '/docs/getting-started', permanent: false }]
  },
}

export default config
