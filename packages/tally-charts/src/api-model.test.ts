// @vitest-environment node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { checkModels, MODEL_NAMES, normalizeModel, updateModels } from '../scripts/api-model.mjs'

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

const model = (extra = {}, chunk = 'BM9m96FR') => ({
  metadata: { toolVersion: '1' },
  members: [
    { kind: 'Function', name: 'a', fileUrlPath: `dist/thresholds-${chunk}.d.ts`, ...extra },
    { kind: 'Package', members: [{ fileUrlPath: 'dist/index.d.ts', name: 'b' }] },
  ],
})

function write(file: string, content: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

/** A package directory with `temp/api/<name>.api.json` for every model. */
function packageWith(generated = model(), committed?: object | null) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'api-model-'))
  dirs.push(root)
  for (const name of MODEL_NAMES) {
    write(path.join(root, 'temp', 'api', `${name}.api.json`), JSON.stringify(generated))
    if (committed) write(path.join(root, 'api', `${name}.api.json`), normalizeModel(committed))
  }
  return root
}

describe('normalizeModel', () => {
  it('removes fileUrlPath at every depth and keeps the rest', () => {
    const text = normalizeModel(model())
    expect(text).not.toContain('fileUrlPath')
    expect(JSON.parse(text)).toEqual({
      metadata: { toolVersion: '1' },
      members: [
        { kind: 'Function', name: 'a' },
        { kind: 'Package', members: [{ name: 'b' }] },
      ],
    })
  })

  it('is deterministic: same output for a model with other chunk hashes, indent 2, final newline', () => {
    expect(normalizeModel(model({}, 'OTHERHASH'))).toBe(normalizeModel(model()))
    const text = normalizeModel(model())
    expect(text.endsWith('}\n')).toBe(true)
    expect(text).toBe(`${JSON.stringify(JSON.parse(text), null, 2)}\n`)
  })
})

describe('checkModels', () => {
  it('reports nothing when the committed models equal the generated ones', () => {
    expect(checkModels(packageWith(model(), model()))).toEqual([])
  })

  it('reports the models that differ', () => {
    const root = packageWith(model(), model())
    write(path.join(root, 'temp', 'api', 'core.api.json'), JSON.stringify(model({ name: 'c' })))
    expect(checkModels(root)).toEqual(['core'])
  })

  it('reports a model whose committed file is missing', () => {
    expect(checkModels(packageWith(model(), null))).toEqual(MODEL_NAMES)
  })

  it('throws when the generated model is missing', () => {
    const root = packageWith(model(), model())
    fs.rmSync(path.join(root, 'temp'), { recursive: true })
    expect(() => checkModels(root)).toThrow(/api:update/)
  })
})

describe('updateModels', () => {
  it('writes the normalized models and reports them once', () => {
    const root = packageWith(model(), null)
    expect(updateModels(root)).toEqual(MODEL_NAMES)
    for (const name of MODEL_NAMES) {
      const written = fs.readFileSync(path.join(root, 'api', `${name}.api.json`), 'utf8')
      expect(written).toBe(normalizeModel(model()))
    }
    expect(checkModels(root)).toEqual([])
    expect(updateModels(root)).toEqual([])
  })
})

describe('api-model.mjs', () => {
  const run = (command: string, root: string) =>
    spawnSync('node', [path.resolve('scripts/api-model.mjs'), command, root], { encoding: 'utf8' })

  it('check exits 1 with the api:update hint when a model is stale', () => {
    const root = packageWith(model(), model({ name: 'other' }))
    const result = run('check', root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('api model is stale, run pnpm --filter tally-charts api:update')
    expect(result.stderr).toContain('api/tally-charts.api.json')
  })

  it('check exits 1 when the committed model does not exist', () => {
    const result = run('check', packageWith(model(), null))
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('api:update')
  })

  it('update refreshes both files and check then passes', () => {
    const root = packageWith(model(), model({ name: 'other' }))
    expect(run('update', root).status).toBe(0)
    expect(run('check', root).status).toBe(0)
  })

  it('exits 1 when the generated model is missing', () => {
    const root = packageWith(model(), model())
    fs.rmSync(path.join(root, 'temp'), { recursive: true })
    const result = run('check', root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('temp')
  })
})
