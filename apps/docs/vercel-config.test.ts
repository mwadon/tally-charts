// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'

const read = (...parts: string[]) => readFileSync(path.join(import.meta.dirname, ...parts), 'utf8')

const config = JSON.parse(read('vercel.json')) as Record<string, unknown>
const envLines = read('.env.example').split('\n')

const releasing = read('..', '..', 'docs', 'releasing.md')
const start = releasing.indexOf('## 11. Docs on Vercel')
const rest = releasing.slice(start + 1)
const next = rest.indexOf('\n## ')
const section = start < 0 ? '' : next < 0 ? rest : rest.slice(0, next)

const TABLE_VARIABLES = [
  'CMS_BASE_URL',
  'CMS_TENANT',
  'CMS_API_KEY',
  'NEXT_PUBLIC_CMS_TENANT',
  'REVALIDATE_SECRET',
  'PREVIEW_SECRET',
  'SITE_URL',
  'APP_ENV',
]

test('vercel.json sets the framework and a frozen install', () => {
  expect(config.framework).toBe('nextjs')
  expect(config.installCommand).toBe('pnpm install --frozen-lockfile')
})

test('the build command builds tally-charts before docs, chained with &&', () => {
  const build = String(config.buildCommand)
  const library = build.indexOf('pnpm --filter tally-charts build')
  const docs = build.indexOf('pnpm --filter docs build')

  expect(library).toBeGreaterThanOrEqual(0)
  expect(docs).toBeGreaterThan(library)
  expect(build.slice(library, docs)).toMatch(/&&\s*$/)
})

test('vercel.json holds no env values', () => {
  expect(config).not.toHaveProperty('env')
  expect(config).not.toHaveProperty('build')
})

test('every variable of the table in releasing.md §11 is declared in .env.example', () => {
  expect(section).not.toBe('')
  const rows = section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|'))
  const names = new Set(
    rows.flatMap((row) => {
      const cell = row.split('|')[1] ?? ''
      return [...cell.matchAll(/`([A-Z][A-Z0-9_]+)`/g)].map((m) => m[1] as string)
    }),
  )

  for (const name of TABLE_VARIABLES) expect(names, name).toContain(name)
  for (const name of names) expect(envLines, name).toContain(`${name}=`)
})

test('releasing.md §11 keeps CMS_ADMIN_API_KEY off Vercel', () => {
  expect(section).toMatch(/`CMS_ADMIN_API_KEY` never goes to Vercel/)
  expect(envLines).toContain('CMS_ADMIN_API_KEY=')
})
