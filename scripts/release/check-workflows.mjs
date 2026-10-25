import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const FORBIDDEN = /NPM_TOKEN|NODE_AUTH_TOKEN/
// setup-node with registry-url writes an auth-token placeholder into .npmrc, which breaks OIDC publishing.
const REGISTRY_URL = /^\s*(?:-\s*)?registry-url\s*:/

/**
 * Scans `.github/workflows/*.yml` in `dir` and returns one problem per offending line:
 * a token name anywhere, or `registry-url` in release.yml.
 */
export function checkWorkflows(dir) {
  const problems = []
  const files = readdirSync(dir)
    .filter((name) => /\.ya?ml$/.test(name))
    .sort()
  for (const name of files) {
    const lines = readFileSync(join(dir, name), 'utf8').split('\n')
    lines.forEach((text, index) => {
      const line = index + 1
      const token = text.match(FORBIDDEN)
      if (token) {
        problems.push({
          file: name,
          line,
          message: `${token[0]} is not allowed (publishing uses OIDC)`,
        })
      }
      if (/^release\.ya?ml$/.test(name) && REGISTRY_URL.test(text)) {
        problems.push({
          file: name,
          line,
          message:
            'registry-url makes setup-node write an auth-token placeholder to .npmrc and breaks OIDC',
        })
      }
    })
  }
  return problems
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = resolve(process.argv[2] ?? '.github/workflows')
  const problems = checkWorkflows(dir)
  for (const p of problems) console.error(`${p.file}:${p.line}: ${p.message}`)
  if (problems.length > 0) process.exit(1)
  console.log(`check-workflows: OK (${dir})`)
}
