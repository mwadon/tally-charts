// @vitest-environment node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { checkDts, findSideEffectImports } from '../scripts/dts.mjs'

describe('findSideEffectImports', () => {
  it.each([
    ['double quotes', 'import "d3-time";'],
    ['single quotes', "import 'd3-time';"],
    ['indentation', '  \timport "d3-time";'],
    ['no semicolon', 'import "d3-time"'],
  ])('finds a bare import with %s', (_, text) => {
    expect(findSideEffectImports(text)).toEqual([{ line: 1, specifier: 'd3-time' }])
  })

  it('reports the line of each import', () => {
    const text = 'export declare const a: 1;\nimport "x";\n\nimport \'y/z\';\n'
    expect(findSideEffectImports(text)).toEqual([
      { line: 2, specifier: 'x' },
      { line: 4, specifier: 'y/z' },
    ])
  })

  it('ignores imports with bindings, type imports and re-exports', () => {
    const text = [
      'import { a } from "x";',
      'import type { B } from "x";',
      'import { type C } from "x";',
      'import * as ns from "x";',
      'import d from "x";',
      'import type D from "x";',
      'export { a } from "x";',
      'export type { B } from "x";',
      'export * from "x";',
      '// import "commented";',
      ' * import "in-a-doc-comment";',
    ].join('\n')
    expect(findSideEffectImports(text)).toEqual([])
  })
})

describe('check:dts', () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
  })

  function packageWith(files: Record<string, string>) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dts-check-'))
    dirs.push(root)
    for (const [name, text] of Object.entries(files)) {
      const file = path.join(root, 'dist', name)
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, text)
    }
    return root
  }
  const run = (root: string) =>
    spawnSync('node', [path.resolve('scripts/check-dts.mjs')], { cwd: root, encoding: 'utf8' })

  it('walks nested declaration files of every flavour and skips other files', () => {
    const root = packageWith({
      'index.d.ts': 'import { a } from "x";\n',
      'core/index.d.ts': 'export {};\nimport "d3-time";\n',
      'chunk.d.mts': "import 'one';\n",
      'chunk.d.cts': 'import "two";\n',
      'index.js': 'import "not-a-declaration";\n',
    })
    const found = checkDts(path.join(root, 'dist')).map(({ file, line, specifier }) => ({
      file: path.relative(path.join(root, 'dist'), file),
      line,
      specifier,
    }))
    expect(found).toEqual([
      { file: 'chunk.d.cts', line: 1, specifier: 'two' },
      { file: 'chunk.d.mts', line: 1, specifier: 'one' },
      { file: path.join('core', 'index.d.ts'), line: 2, specifier: 'd3-time' },
    ])
  })

  it('exits 1 and prints file:line for a side-effect import', () => {
    const root = packageWith({ 'thresholds.d.ts': 'export {};\nimport "d3-time";\n' })
    const result = run(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(`${path.join('dist', 'thresholds.d.ts')}:2`)
    expect(result.stderr).toContain('d3-time')
  })

  it('exits 0 for clean declarations', () => {
    const root = packageWith({
      'index.d.ts':
        'import type { TimeInterval } from "d3-time";\nexport type { A } from "./a";\nimport { b } from "b";\n',
    })
    expect(run(root).status).toBe(0)
  })

  it('exits 1 when dist does not exist', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dts-check-'))
    dirs.push(root)
    const result = run(root)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('dist')
  })
})
