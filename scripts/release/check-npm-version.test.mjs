import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { compareVersions, isSupportedNpm } from './check-npm-version.mjs'

describe('isSupportedNpm', () => {
  it('rejects 11.5.0 and older', () => {
    assert.equal(isSupportedNpm('11.5.0'), false)
    assert.equal(isSupportedNpm('10.9.2'), false)
    assert.equal(isSupportedNpm('11.4.99'), false)
  })

  it('accepts 11.5.1 and newer', () => {
    assert.equal(isSupportedNpm('11.5.1'), true)
    assert.equal(isSupportedNpm('11.9.0'), true)
    assert.equal(isSupportedNpm('12.0.0'), true)
  })

  it('compares numerically, not lexically', () => {
    assert.equal(compareVersions('11.10.0', '11.9.0'), 1)
    assert.equal(compareVersions('9.0.0', '11.5.1'), -1)
  })
})

describe('check-npm-version CLI', () => {
  const script = join(dirname(fileURLToPath(import.meta.url)), 'check-npm-version.mjs')
  const run = (version) => spawnSync(process.execPath, [script, version], { encoding: 'utf8' })

  it('exits 1 for 11.5.0 and 0 for 11.5.1 and 12.0.0', () => {
    const old = run('11.5.0')
    assert.equal(old.status, 1)
    assert.match(old.stderr, /11\.5\.1/)
    assert.equal(run('11.5.1').status, 0)
    assert.equal(run('12.0.0').status, 0)
  })
})
