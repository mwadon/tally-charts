// @vitest-environment node
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

const appDir = path.join(import.meta.dirname, '..')
const tsx = path.join(appDir, 'node_modules', '.bin', 'tsx')

function seed(env: Record<string, string>, ...args: string[]) {
  // Only PATH and HOME of the real env: a CMS_* variable of the developer must not leak in.
  const result = spawnSync(tsx, ['scripts/seed.ts', ...args], {
    cwd: appDir,
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'test', ...env },
  })
  return { code: result.status, stdout: result.stdout, stderr: result.stderr }
}

describe('scripts/seed.ts without its environment', () => {
  test('exits 1 and names the missing key and the missing base url', () => {
    const result = seed({})

    expect(result.code).toBe(1)
    expect(result.stderr).toMatch(/^seed: /)
    expect(result.stderr).toContain('CMS_ADMIN_API_KEY')
    expect(result.stderr).toContain('CMS_BASE_URL')
    expect(result.stdout).toBe('')
  })

  test('a base url alone is not enough, and --dry-run does not change that', () => {
    for (const args of [[], ['--dry-run']]) {
      const result = seed({ CMS_BASE_URL: 'http://x' }, ...args)

      expect(result.code).toBe(1)
      expect(result.stderr).toContain('CMS_ADMIN_API_KEY is not set')
      expect(result.stderr).not.toContain('CMS_BASE_URL')
    }
  })

  test('accepts the -- that pnpm forwards', () => {
    const result = seed({}, '--', '--dry-run')

    expect(result.code).toBe(1)
    expect(result.stderr).toContain('CMS_ADMIN_API_KEY')
  })
})
