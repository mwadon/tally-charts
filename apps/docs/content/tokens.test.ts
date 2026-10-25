// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import type { ComponentNode } from '../lib/content/types'
// @ts-expect-error plain .mjs script without types
import { collectTokens } from '../scripts/gen-tokens.mjs'

const library = path.resolve(import.meta.dirname, '../../../packages/tally-charts/src')
const themeCss = readFileSync(path.join(library, 'theme/theme.css'), 'utf8')

/** Same pattern as the public-surface test in the library: skips templates such as `--ch-${tone}`. */
const TOKEN = /--ch-[a-z0-9]+(?:-[a-z0-9]+)*(?![a-z0-9-]|\$)/g
const unique = (values: Iterable<string>) => [...new Set(values)].sort()
const tokensIn = (text: string) => text.match(TOKEN) ?? []

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) return sources(file)
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [file] : []
  })
}

function* walk(nodes: readonly ComponentNode[]): Generator<ComponentNode> {
  for (const node of nodes) {
    yield node
    yield* walk(node.children ?? [])
  }
}

test('the theming page documents every --ch-* token the library uses', () => {
  const used = unique(
    [themeCss, ...sources(library).map((f) => readFileSync(f, 'utf8'))].flatMap(tokensIn),
  )

  // The token tables list what theme.css declares; the page text lists the rest.
  const tabled: string[] = collectTokens(themeCss).tokens.map((t: { name: string }) => t.name)
  const page = JSON.parse(readFileSync(path.join(import.meta.dirname, 'theming.json'), 'utf8'))
  const written = [...walk(page.componentTree as ComponentNode[])]
    .filter((n) => n.type === 'prose' || n.type === 'callout')
    .flatMap((n) => tokensIn(String(n.props.markdown)))

  expect(unique([...tabled, ...written])).toEqual(used)
})
