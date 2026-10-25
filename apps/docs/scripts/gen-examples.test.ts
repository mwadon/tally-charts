import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, expect, test } from 'vitest'
// @ts-expect-error plain .mjs script without types
import { collectExamples, generate, renderRegistry } from './gen-examples.mjs'

interface Entry {
  id: string
  title: string
  rscSafe: boolean
  file: string
  source: string
}

let root: string
let dir: string

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'gen-examples-'))
  dir = path.join(root, 'examples')
  mkdirSync(dir)
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function write(rel: string, content: string) {
  const file = path.join(dir, rel)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, content)
}

function example(id: string, { rscSafe = true, directive = '' } = {}) {
  return `${directive}
export const meta = { id: '${id}', title: 'A "quoted" title', rscSafe: ${rscSafe} }
export default function Example() {
  return null
}
`
}

test('collects entries sorted by id with the exact source and metadata', () => {
  write('b/second.tsx', example('b/second'))
  write('a/first.tsx', example('a/first', { rscSafe: false, directive: "'use client'" }))
  write('a/first.test.tsx', 'not an example')
  write('types.ts', 'export type X = 1')

  const entries: Entry[] = collectExamples(dir)

  expect(entries.map((e) => e.id)).toEqual(['a/first', 'b/second'])
  expect(entries[0]).toEqual({
    id: 'a/first',
    title: 'A "quoted" title',
    rscSafe: false,
    file: 'examples/a/first.tsx',
    source: readFileSync(path.join(dir, 'a/first.tsx'), 'utf8'),
  })
})

test('reads meta written as `satisfies` and a default export written as a named export', () => {
  write(
    'x/y.tsx',
    `import type { ExampleMeta } from '../types'
export const meta = { id: 'x/y', title: 'T', rscSafe: true } satisfies ExampleMeta
function Y() { return null }
export { Y as default }
`,
  )
  expect(collectExamples(dir).map((e: Entry) => e.id)).toEqual(['x/y'])
})

test('a file without meta fails and names the file', () => {
  write('a/no-meta.tsx', 'export default function A() { return null }\n')
  expect(() => collectExamples(dir)).toThrow(
    /examples\/a\/no-meta\.tsx: missing `export const meta/,
  )
})

test('a file without a default export fails and names the file', () => {
  write(
    'a/no-default.tsx',
    "export const meta = { id: 'a/no-default', title: 'T', rscSafe: true }\n",
  )
  expect(() => collectExamples(dir)).toThrow(/examples\/a\/no-default\.tsx: missing default export/)
})

test('an id different from the path fails', () => {
  write('a/one.tsx', example('a/other'))
  expect(() => collectExamples(dir)).toThrow(
    /examples\/a\/one\.tsx: `meta\.id` "a\/other" must equal the path "a\/one"/,
  )
})

test('an id outside the allowed pattern fails', () => {
  write('Bad_Name.tsx', example('Bad_Name'))
  expect(() => collectExamples(dir)).toThrow(
    /examples\/Bad_Name\.tsx: `meta\.id` "Bad_Name" must match/,
  )
})

test("'use client' together with rscSafe: true fails", () => {
  write('a/client.tsx', example('a/client', { directive: "'use client'" }))
  expect(() => collectExamples(dir)).toThrow(
    /examples\/a\/client\.tsx: a file with 'use client' cannot have `rscSafe: true`/,
  )
})

test('non-literal meta values fail', () => {
  write(
    'a/dynamic.tsx',
    `const id = 'a/dynamic'
export const meta = { id, title: 'T', rscSafe: true }
export default function A() { return null }
`,
  )
  expect(() => collectExamples(dir)).toThrow(
    /examples\/a\/dynamic\.tsx: `meta\.id` must be a string literal/,
  )
})

test('all violations are reported together', () => {
  write('a/one.tsx', 'export default function A() { return null }\n')
  write('a/two.tsx', example('a/wrong'))
  expect(() => collectExamples(dir)).toThrow(/one\.tsx: [\s\S]*two\.tsx: /)
})

test('renderRegistry is deterministic, sorted and embeds JSON.stringify(source)', () => {
  const entries: Entry[] = [
    {
      id: 'b',
      title: 'B',
      rscSafe: true,
      file: 'examples/b.tsx',
      source: 'const b = `x` // "q"\n',
    },
    { id: 'a', title: 'A', rscSafe: false, file: 'examples/a.tsx', source: "'use client'\n" },
  ]
  const first = renderRegistry(entries)

  expect(renderRegistry([...entries].reverse())).toBe(first)
  expect(first.indexOf('"a": define')).toBeLessThan(first.indexOf('"b": define'))
  for (const e of entries) {
    expect(first).toContain(`source: ${JSON.stringify(e.source)}`)
    expect(first).toContain(`load: () => import("./${e.file.replace(/\.tsx$/, '')}")`)
  }
  expect(first).toContain('do not edit')
})

test('generate writes the file once and leaves it untouched when nothing changed', async () => {
  write('a/one.tsx', example('a/one'))

  expect(generate(root)).toBe(true)
  const output = path.join(root, 'examples.generated.ts')
  const before = statSync(output).mtimeMs
  await new Promise((resolve) => setTimeout(resolve, 20))

  expect(generate(root)).toBe(false)
  expect(statSync(output).mtimeMs).toBe(before)
  expect(readFileSync(output, 'utf8')).toContain('"a/one"')
})
