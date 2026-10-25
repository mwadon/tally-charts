// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { build } from 'esbuild'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { bundledModules, definingModules, findLeaks } from '../scripts/treeshake.mjs'

// The check on a mini library (test/treeshake), bundled to a temp directory as one file with a
// sourcemap, like tsdown does for dist. Nothing here reads the built package.
const root = path.resolve(import.meta.dirname, '..')
const SRC = 'test/treeshake'
const temp: string[] = []

const bundleLibrary = async (index: string, sourcemap = true): Promise<string> => {
  // realpath: on macOS os.tmpdir() is behind a symlink, and the relative paths in the maps would not add up.
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'treeshake-')))
  temp.push(dir)
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ type: 'module', sideEffects: ['*.css'] }),
  )
  const outfile = path.join(dir, 'dist', 'index.js')
  await build({
    absWorkingDir: root,
    entryPoints: [`${SRC}/${index}`],
    outfile,
    bundle: true,
    format: 'esm',
    sourcemap: sourcemap ? 'linked' : false,
    logLevel: 'silent',
  })
  return outfile
}

const check = (dist: string, index: string, names: string[], forbid: string[] = []) =>
  findLeaks(
    {
      name: names.join(),
      specifier: dist,
      names,
      modules: definingModules(names, { root, indexFile: `${SRC}/${index}` }),
      forbid,
    },
    { root, srcDir: SRC, distDir: path.dirname(dist) },
  )

afterAll(() => {
  for (const dir of temp) fs.rmSync(dir, { recursive: true, force: true })
})

describe('findLeaks', () => {
  let clean: string
  let unmarked: string
  let withoutMap: string

  beforeAll(async () => {
    clean = await bundleLibrary('index.ts')
    unmarked = await bundleLibrary('index-unmarked.ts')
    withoutMap = await bundleLibrary('index.ts', false)
  })

  it('passes when the bundle holds only the import graph of the export', async () => {
    const result = await check(clean, 'index.ts', ['A'])
    expect(result.modules).toEqual([`${SRC}/a.ts`])
    expect(result).toMatchObject({ leaks: [], forbidden: [], problems: [] })
  })

  it('reports a module that a top-level call without /* @__PURE__ */ keeps in the bundle', async () => {
    const result = await check(unmarked, 'index-unmarked.ts', ['A'])
    expect(result.leaks).toContain(`${SRC}/heavy.ts`)
    expect(result.modules).toContain(`${SRC}/heavy.ts`)
  })

  it('does not report the same code once the call is marked /* @__PURE__ */', async () => {
    // clean also exports HEAVY_PURE, which is heavy.ts with the annotation.
    const result = await check(clean, 'index.ts', ['A'])
    expect(result.modules).not.toContain(`${SRC}/heavy-pure.ts`)
    expect(result.leaks).toEqual([])
  })

  it('accepts a module that the export imports and uses', async () => {
    const result = await check(clean, 'index.ts', ['AF'])
    expect(result.modules).toContain(`${SRC}/forbidden.ts`)
    expect(result.leaks).toEqual([])
    expect(result.forbidden).toEqual([])
  })

  it('fails with the module name when a rule forbids an import the export uses', async () => {
    const result = await check(clean, 'index.ts', ['AF'], [`${SRC}/forbidden.ts`])
    expect(result.forbidden).toEqual([`${SRC}/forbidden.ts`])
    expect(result.leaks).toEqual([])
  })

  it('matches a forbid glob across directories', async () => {
    const result = await check(clean, 'index.ts', ['AF'], [`${SRC}/**`])
    expect(result.forbidden).toEqual([`${SRC}/af.ts`, `${SRC}/forbidden.ts`])
  })

  it('throws instead of passing when dist has no sourcemap', async () => {
    await expect(check(withoutMap, 'index.ts', ['A'])).rejects.toThrow('no src modules mapped')
  })

  it('reports a bundled file that is not from dist', async () => {
    const result = await findLeaks(
      {
        name: 'A',
        specifier: clean,
        names: ['A'],
        modules: definingModules(['A'], { root, indexFile: `${SRC}/index.ts` }),
      },
      // Pretend dist is another directory: the temp bundle is then not a file of dist.
      { root, srcDir: SRC, distDir: path.join(root, 'dist') },
    )
    expect(result.problems).toEqual([expect.stringContaining('not a file of dist')])
  })

  it('rejects an export that the index does not have', () => {
    expect(() => definingModules(['Nope'], { root, indexFile: `${SRC}/index.ts` })).toThrow(
      'has no value export "Nope"',
    )
  })
})

describe('bundledModules', () => {
  const sources = [
    'src/a.ts',
    'src/b.ts',
    'src/c.ts',
    'node_modules/.pnpm/p@1/node_modules/@s/p/src/i.js',
  ]

  it('lists only sources a mapping segment points to, not every entry of sources', () => {
    // Line 1: source 0, then source 1 (relative +1). Line 2: back to source 0 (relative -1).
    // Source 2 is listed and never mapped.
    const map = { sources, mappings: 'AAAA,CCAA;ADAA' }
    expect([...bundledModules('x\ny', map, { root: '/r' })].sort()).toEqual([
      'src/a.ts',
      'src/b.ts',
    ])
  })

  it('names packages from node_modules and ignores segments without a source', () => {
    // A one-field segment ("E") has no source; "AAAA,AGAA" moves from source 0 to source 3.
    const map = JSON.stringify({ sources, mappings: 'AAAA,E,AGAA' })
    expect([...bundledModules('x', map, { root: '/r' })].sort()).toEqual(['pkg:@s/p', 'src/a.ts'])
  })

  it('throws when no source is under srcDir', () => {
    const map = { sources: ['dist/index.js'], mappings: 'AAAA' }
    expect(() => bundledModules('x', map, { root: '/r' })).toThrow('no src modules mapped')
  })
})
