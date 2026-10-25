import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// npm trusted publishing (OIDC) needs npm >= 11.5.1.
export const MIN_NPM = '11.5.1'

/** Compares the numeric major.minor.patch of two versions (prerelease tags are ignored). */
export function compareVersions(a, b) {
  const pa = a.split(/[-+]/)[0].split('.').map(Number)
  const pb = b.split(/[-+]/)[0].split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff < 0 ? -1 : 1
  }
  return 0
}

export function isSupportedNpm(version) {
  return compareVersions(version, MIN_NPM) >= 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const version = process.argv[2] ?? execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim()
  if (!isSupportedNpm(version)) {
    console.error(
      `npm ${version} is older than ${MIN_NPM}, which trusted publishing (OIDC) requires`,
    )
    process.exit(1)
  }
  console.log(`npm ${version} >= ${MIN_NPM}: OK`)
}
