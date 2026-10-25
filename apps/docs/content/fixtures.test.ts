// @vitest-environment node
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import { type HeadingProps, headingId } from '../blocks/heading'
import { parseBlockProps } from '../blocks/registry'
import { createFixtureSource } from '../lib/content/fixtures'
import { loadNavigationConfig } from '../lib/content/navigation-config'
import type { ComponentNode } from '../lib/content/types'

const dir = import.meta.dirname
const source = createFixtureSource({ dir })

function* walk(nodes: readonly ComponentNode[]): Generator<ComponentNode> {
  for (const node of nodes) {
    yield node
    yield* walk(node.children ?? [])
  }
}

const slugs = readdirSync(dir)
  .filter((f) => f.endsWith('.json') && f !== 'navigation.json')
  .map((f) => path.basename(f, '.json'))

test('the fixtures include home and line-chart', () => {
  expect(slugs).toEqual(expect.arrayContaining(['home', 'line-chart']))
})

test.each(slugs)('%s passes the loader schema and its slug matches the file', async (slug) => {
  const page = await source.getPage(slug)
  expect(page?.slug).toBe(slug)
})

test.each(slugs)('every block of %s passes parseBlockProps', async (slug) => {
  const page = await source.getPage(slug)
  for (const node of walk(page?.componentTree ?? [])) {
    const result = parseBlockProps(node.type, node.props)
    expect(result.success, `${slug}: ${node.type} ${node.id}`).toBe(true)
  }
})

test('the ids of the nodes of a page are unique', async () => {
  for (const slug of slugs) {
    const ids = [...walk((await source.getPage(slug))?.componentTree ?? [])].map((n) => n.id)
    expect(new Set(ids).size, slug).toBe(ids.length)
  }
})

test('the heading anchors of a page are unique', async () => {
  for (const slug of slugs) {
    const page = await source.getPage(slug)
    const ids = [...walk(page?.componentTree ?? [])]
      .filter((n) => n.type === 'heading')
      .map((n) => headingId(n.props as HeadingProps))
    const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect(duplicates, slug).toEqual([])
  }
})

test('navigation.json is valid and its slugs are unique', async () => {
  const { groups } = await loadNavigationConfig(dir)
  const all = groups.flatMap((g) => g.items.map((i) => i.slug))
  expect(groups.map((g) => g.label)).toEqual([
    'Start',
    'Guides',
    'Charts',
    'Building blocks',
    'Reference',
  ])
  expect(new Set(all).size).toBe(all.length)
})

test('getting-started, theming, palettes, time-scales, formatting, thresholds, server-components, dark-mode, bar-chart, comparison-bars, ranked-bars, waterfall-chart, bridge-chart, dot-histogram, strip-plot, waffle-columns, line-chart, composition, small-pieces and hooks-and-providers are the only available pages in the navigation', async () => {
  const { groups } = await source.getNavigation()
  const available = groups.flatMap((g) => g.items).filter((i) => i.available)
  expect(available.map((i) => i.slug)).toEqual([
    'getting-started',
    'theming',
    'palettes',
    'time-scales',
    'formatting',
    'thresholds',
    'server-components',
    'dark-mode',
    'bar-chart',
    'comparison-bars',
    'ranked-bars',
    'waterfall-chart',
    'bridge-chart',
    'dot-histogram',
    'strip-plot',
    'waffle-columns',
    'line-chart',
    'composition',
    'small-pieces',
    'hooks-and-providers',
  ])
})
