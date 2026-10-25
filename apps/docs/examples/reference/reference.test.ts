import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { examples } from '../../examples.generated'

const referenceDir = path.resolve(import.meta.dirname, '../../../../docs/reference')
const pngNames = readdirSync(referenceDir)
  .filter((f) => f.endsWith('.png'))
  .map((f) => f.replace(/\.png$/, ''))
  .sort()
const entries = Object.values(examples).filter((e) => e.id.startsWith('reference/'))

test('there is one example per docs/reference/*.png, named after it', () => {
  expect(pngNames).toHaveLength(9)
  expect(entries.map((e) => e.id)).toEqual(pngNames.map((n) => `reference/${n}`))
})

test.each(entries)('$id has a title', (entry) => {
  expect(entry.title.trim()).not.toBe('')
})

test('at least one reference is rscSafe', () => {
  expect(entries.some((e) => e.rscSafe)).toBe(true)
})

test.each(entries)('$id is self-contained and deterministic', (entry) => {
  const imports = [...entry.source.matchAll(/from '([^']+)'/g)].map((m) => m[1])
  for (const from of imports) expect(['react', 'tally-charts', '../types']).toContain(from)
  expect(entry.source).not.toMatch(/Date\.now\(|new Date\(\)|Math\.random|--_ch-/)
})

test.each(entries)('$id has "use client" exactly when it is not rscSafe', (entry) => {
  expect(/^'use client'/.test(entry.source)).toBe(!entry.rscSafe)
})

test('the styles of the references live in the ref- namespace and use only public tokens', () => {
  const css = readFileSync(path.join(import.meta.dirname, 'reference.css'), 'utf8')
  // Selectors only: drop comments, declaration blocks and attribute selectors first.
  const selectors = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\[[^\]]*\]/g, '')
    .split('{')
    .flatMap((part, i, all) => (i < all.length - 1 ? [part.split('}').pop() ?? ''] : []))
  const classes = selectors.flatMap((s) => [...s.matchAll(/\.([a-z][a-z0-9-]*)/g)].map((m) => m[1]))
  expect(classes.length).toBeGreaterThan(0)
  expect(classes.filter((c) => !c?.startsWith('ref-'))).toEqual([])
  expect(css).not.toContain('--_ch-')
})
