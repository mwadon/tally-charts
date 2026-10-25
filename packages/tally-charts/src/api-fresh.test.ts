// @vitest-environment node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { newerThan } from '../scripts/api-fresh.mjs'

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

const SECOND = 1000
const NOW = Date.now() / SECOND

function touch(file: string, ageSeconds: number) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, '')
  fs.utimesSync(file, NOW - ageSeconds, NOW - ageSeconds)
}

/** A package with `dist/index.d.ts` 100 s old and one src file of the given age. */
function packageWith(files: Record<string, number>, built = true) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'api-fresh-'))
  dirs.push(root)
  if (built) touch(path.join(root, 'dist', 'index.d.ts'), 100)
  for (const [name, age] of Object.entries(files)) touch(path.join(root, 'src', name), age)
  return root
}

describe('newerThan', () => {
  it('returns the src files modified after the reference, nested ones and tests included', () => {
    const root = packageWith({
      'old.ts': 200,
      'core/new.ts': 10,
      'core/new.test.ts': 5,
    })
    const found = newerThan(path.join(root, 'src'), path.join(root, 'dist', 'index.d.ts'))
    expect(found?.map((file) => path.relative(path.join(root, 'src'), file))).toEqual([
      path.join('core', 'new.test.ts'),
      path.join('core', 'new.ts'),
    ])
  })

  it('returns nothing when every src file is older than the reference', () => {
    const root = packageWith({ 'a.ts': 200, 'b/c.ts': 150 })
    expect(newerThan(path.join(root, 'src'), path.join(root, 'dist', 'index.d.ts'))).toEqual([])
  })

  it('returns null when the reference does not exist', () => {
    const root = packageWith({ 'a.ts': 200 }, false)
    expect(newerThan(path.join(root, 'src'), path.join(root, 'dist', 'index.d.ts'))).toBeNull()
  })
})

describe('check-api-fresh', () => {
  const run = (root: string) =>
    spawnSync('node', [path.resolve('scripts/check-api-fresh.mjs')], {
      cwd: root,
      encoding: 'utf8',
    })

  it('exits 1 with the message when a src file is newer than dist', () => {
    const root = packageWith({ 'old.ts': 200, 'core/date.ts': 10 })
    const result = run(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('dist is older than src, run pnpm build')
    expect(result.stderr).toContain(path.join('src', 'core', 'date.ts'))
    expect(result.stderr).not.toContain('old.ts')
  })

  it('lists the first files only', () => {
    const files = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`f${i}.ts`, 10]))
    const result = run(packageWith(files))
    expect(result.stderr).toContain('and 3 more')
  })

  it('exits 1 when dist/index.d.ts does not exist', () => {
    const result = run(packageWith({ 'a.ts': 10 }, false))
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('dist is older than src, run pnpm build')
  })

  it('exits 0 when dist is newer than src', () => {
    const result = run(packageWith({ 'a.ts': 200 }))
    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
  })

  it('takes the package directory as an argument', () => {
    const root = packageWith({ 'a.ts': 10 })
    const result = spawnSync('node', [path.resolve('scripts/check-api-fresh.mjs'), root], {
      encoding: 'utf8',
    })
    expect(result.status).toBe(1)
  })
})
