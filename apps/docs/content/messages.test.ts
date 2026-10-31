// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'

const messagesSource = readFileSync(
  path.resolve(import.meta.dirname, '../../../packages/tally-charts/src/react/messages.ts'),
  'utf8',
)
const page = readFileSync(path.join(import.meta.dirname, 'hooks-and-providers.json'), 'utf8')

test('hooks-and-providers lists every ChartsProvider messages key', () => {
  const defaults = messagesSource.slice(messagesSource.indexOf('export const DEFAULT_MESSAGES'))
  const keys = [...defaults.matchAll(/^ {2}(\w+):/gm)].map((m) => m[1] as string)
  expect(keys.length).toBeGreaterThan(50)
  // The table writes each key in backticks, as a cell of its own.
  expect(keys.filter((key) => !page.includes(`| \`${key}\` |`))).toEqual([])
})
