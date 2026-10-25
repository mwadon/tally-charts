// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'

const lines = readFileSync(path.join(import.meta.dirname, '.env.example'), 'utf8').split('\n')
const NAMES = [
  'CMS_BASE_URL',
  'CMS_TENANT',
  'CMS_API_KEY',
  'NEXT_PUBLIC_CMS_TENANT',
  'APP_ENV',
  'REVALIDATE_SECRET',
  'PREVIEW_SECRET',
  'SITE_URL',
]

test('.env.example declares the eight variables, each empty and described by a comment above', () => {
  const assigned = lines.flatMap((line, i) => (/^[A-Z_]+=/.test(line) ? [i] : []))

  expect(assigned.map((i) => lines[i])).toEqual(NAMES.map((name) => `${name}=`))
  for (const i of assigned) expect(lines[i - 1]?.startsWith('#'), lines[i]).toBe(true)
})
