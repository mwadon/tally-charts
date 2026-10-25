import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { examples } from '../examples.generated'

const appDir = path.resolve(import.meta.dirname, '..')

function exampleFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const full = path.join(dir, d.name)
    if (d.isDirectory()) return exampleFiles(full)
    return d.name.endsWith('.tsx') && !d.name.endsWith('.test.tsx') ? [full] : []
  })
}

test('the source of every entry is the exact content of its example file', () => {
  const entries = Object.values(examples)
  expect(entries.length).toBeGreaterThan(0)
  for (const entry of entries) {
    expect(readFileSync(path.join(appDir, entry.file), 'utf8'), entry.id).toBe(entry.source)
  }
})

test('the registry holds exactly the files of examples/**/*.tsx, keyed by their id', () => {
  const examplesDir = path.join(appDir, 'examples')
  const ids = exampleFiles(examplesDir)
    .map((f) =>
      path
        .relative(examplesDir, f)
        .split(path.sep)
        .join('/')
        .replace(/\.tsx$/, ''),
    )
    .sort()
  expect(Object.keys(examples).sort()).toEqual(ids)
  for (const [key, entry] of Object.entries(examples)) expect(entry.id).toBe(key)
})

test('entries are sorted by id', () => {
  const keys = Object.keys(examples)
  expect(keys).toEqual([...keys].sort())
})

test('there is at least one rscSafe and one client-only example', () => {
  const flags = Object.values(examples).map((e) => e.rscSafe)
  expect(flags).toContain(true)
  expect(flags).toContain(false)
})
