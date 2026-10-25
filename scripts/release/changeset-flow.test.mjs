// Runs the real @changesets/cli on a throwaway workspace to pin the on-disk layout that
// release.yml relies on. The Version PR in pre mode moves the consumed changesets to
// `.changeset/pre/`; changesets/action@v1 (bundled @changesets/read 0.6) chokes on that directory,
// so release.yml uses changesets/action@v2. If a CLI upgrade changes this layout, re-check the
// action version before updating these assertions.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const cliBin = join(root, 'node_modules', '@changesets', 'cli', 'bin.js')

const write = (dir, rel, content) => {
  mkdirSync(dirname(join(dir, rel)), { recursive: true })
  writeFileSync(
    join(dir, rel),
    typeof content === 'string' ? content : `${JSON.stringify(content, null, 2)}\n`,
  )
}

const changeset = (dir, cmd) => {
  const r = spawnSync(process.execPath, [cliBin, ...cmd], { cwd: dir, encoding: 'utf8' })
  assert.equal(r.status, 0, `changeset ${cmd.join(' ')} failed:\n${r.stdout}\n${r.stderr}`)
  return r.stdout
}

const pendingChangesets = (dir) =>
  readdirSync(join(dir, '.changeset')).filter((f) => f.endsWith('.md') && f !== 'README.md')

const version = (dir) =>
  JSON.parse(readFileSync(join(dir, 'packages/tally-charts/package.json'), 'utf8')).version

describe('changesets flow in pre mode', {
  skip: !existsSync(cliBin) && 'run pnpm install first',
}, () => {
  let dir

  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'changeset-flow-'))
    symlinkSync(join(root, 'node_modules'), join(dir, 'node_modules'))
    write(dir, 'package.json', { name: 'fixture', private: true, version: '0.0.0' })
    write(dir, 'pnpm-workspace.yaml', 'packages:\n  - packages/*\n  - apps/*\n')
    write(dir, 'packages/tally-charts/package.json', { name: 'tally-charts', version: '0.9.0' })
    write(dir, 'apps/docs/package.json', { name: 'docs', private: true, version: '0.0.0' })
    write(dir, '.changeset/config.json', {
      changelog: '@changesets/cli/changelog',
      commit: false,
      access: 'public',
      baseBranch: 'main',
      privatePackages: { version: false, tag: false },
    })
    write(dir, '.changeset/pre.json', { mode: 'pre', tag: 'rc' })
    write(dir, '.changeset/big-change.md', '---\n"tally-charts": major\n---\n\nBreaking change.\n')
    write(dir, '.changeset/small-fix.md', '---\n"tally-charts": patch\n---\n\nA fix.\n')
  })

  after(() => rmSync(dir, { recursive: true, force: true }))

  it('versions to 1.0.0-rc.0 and moves the consumed changesets to .changeset/pre/', () => {
    changeset(dir, ['version'])
    assert.equal(version(dir), '1.0.0-rc.0')
    assert.deepEqual(pendingChangesets(dir), [])
    assert.deepEqual(readdirSync(join(dir, '.changeset/pre')).sort(), [
      'big-change.md',
      'small-fix.md',
    ])
    assert.equal(JSON.parse(readFileSync(join(dir, '.changeset/pre.json'), 'utf8')).mode, 'pre')
    assert.equal(version(dir).includes('-rc.'), true)
    assert.equal(existsSync(join(dir, 'apps/docs/CHANGELOG.md')), false)
  })

  it('pre exit then version gives 1.0.0 and removes pre.json', () => {
    changeset(dir, ['pre', 'exit'])
    assert.equal(JSON.parse(readFileSync(join(dir, '.changeset/pre.json'), 'utf8')).mode, 'exit')
    changeset(dir, ['version'])
    assert.equal(version(dir), '1.0.0')
    assert.equal(existsSync(join(dir, '.changeset/pre.json')), false)
    assert.deepEqual(readdirSync(join(dir, '.changeset/pre')), [])
    const log = readFileSync(join(dir, 'packages/tally-charts/CHANGELOG.md'), 'utf8')
    assert.match(log, /## 1\.0\.0\n/)
    assert.match(log, /Breaking change\./)
  })
})
