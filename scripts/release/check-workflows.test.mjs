import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkWorkflows } from './check-workflows.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const roots = []

function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'check-workflows-'))
  roots.push(dir)
  mkdirSync(dir, { recursive: true })
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content)
  return dir
}

after(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true })
})

const clean =
  'name: CI\non: push\njobs:\n  a:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n'

describe('checkWorkflows', () => {
  it('passes a clean workflow', () => {
    assert.deepEqual(checkWorkflows(fixture({ 'ci.yml': clean })), [])
  })

  it('reports NPM_TOKEN with file and line', () => {
    const dir = fixture({
      'ci.yml': `${clean}        env:\n          X: \${{ secrets.NPM_TOKEN }}\n`,
    })
    const problems = checkWorkflows(dir)
    assert.equal(problems.length, 1)
    assert.equal(problems[0].file, 'ci.yml')
    assert.equal(problems[0].line, 9)
    assert.match(problems[0].message, /NPM_TOKEN/)
  })

  it('reports NODE_AUTH_TOKEN', () => {
    const problems = checkWorkflows(fixture({ 'release.yml': `${clean}  NODE_AUTH_TOKEN: x\n` }))
    assert.equal(problems.length, 1)
    assert.match(problems[0].message, /NODE_AUTH_TOKEN/)
  })

  it('reports registry-url in release.yml only', () => {
    const withRegistry = `${clean}      - uses: actions/setup-node@v5\n        with:\n          registry-url: https://registry.npmjs.org\n`
    const problems = checkWorkflows(
      fixture({ 'release.yml': withRegistry, 'ci.yml': withRegistry }),
    )
    assert.deepEqual(
      problems.map((p) => [p.file, p.line]),
      [['release.yml', 10]],
    )
  })

  it('ignores non-yaml files', () => {
    assert.deepEqual(checkWorkflows(fixture({ 'notes.md': 'NPM_TOKEN' })), [])
  })
})

describe('check-workflows CLI', () => {
  const script = join(here, 'check-workflows.mjs')

  it('exits 1 and names file:line for a token', () => {
    const dir = fixture({ 'ci.yml': `${clean}  NODE_AUTH_TOKEN: x\n` })
    const result = spawnSync(process.execPath, [script, dir], { encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /ci\.yml:\d+: NODE_AUTH_TOKEN/)
  })

  it('exits 0 for a clean directory', () => {
    const result = spawnSync(process.execPath, [script, fixture({ 'ci.yml': clean })], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 0)
  })
})
