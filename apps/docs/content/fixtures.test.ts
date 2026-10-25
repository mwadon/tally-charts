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

test('the available pages of the navigation are 25, in navigation order', async () => {
  const { groups } = await source.getNavigation()
  const available = groups.flatMap((g) => g.items).filter((i) => i.available)
  expect(available.map((i) => i.slug)).toEqual([
    'getting-started',
    'theming',
    'palettes',
    'time-scales',
    'formatting',
    'thresholds',
    'accessibility',
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
    'heatmap',
    'runway-chart',
    'composition',
    'small-pieces',
    'hooks-and-providers',
    'stability',
    'migration-1-0',
  ])
})

test('no item of the navigation is unavailable', async () => {
  const { groups } = await source.getNavigation()
  const unavailable = groups.flatMap((g) => g.items).filter((i) => !i.available)
  expect(unavailable.map((i) => i.slug)).toEqual([])
})

test('the navigation has every slug of F15 except home', async () => {
  const { groups } = await source.getNavigation()
  const all = groups.flatMap((g) => g.items.map((i) => i.slug))
  const f15 = [
    'getting-started',
    'composition',
    'theming',
    'palettes',
    'time-scales',
    'formatting',
    'thresholds',
    'accessibility',
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
    'heatmap',
    'runway-chart',
    'small-pieces',
    'hooks-and-providers',
    'stability',
    'migration-1-0',
  ]
  expect(f15).toHaveLength(25)
  expect(all).toEqual(expect.arrayContaining(f15))
})

/** The text of the prose, heading, callout and code-block blocks of a page, in order. */
async function pageText(slug: string) {
  const page = await source.getPage(slug)
  const blocks = [...walk(page?.componentTree ?? [])]
  const text = (n: ComponentNode) => {
    const props = n.props as Record<string, string>
    return props.markdown ?? props.text ?? props.code ?? ''
  }
  return {
    page,
    blocks,
    all: blocks.map(text).join('\n'),
    headings: (level: string) =>
      blocks.filter((n) => n.type === 'heading' && n.props.level === level).map(text),
    after: (heading: string) => {
      const start = blocks.findIndex((n) => n.type === 'heading' && n.props.text === heading)
      const rest = blocks.slice(start + 1)
      const end = rest.findIndex((n) => n.type === 'heading' && n.props.level === '2')
      return (end === -1 ? rest : rest.slice(0, end)).map(text).join('\n')
    },
  }
}

test('accessibility has the sections of docs/a11y.md and every known limit', async () => {
  const { page, headings, after } = await pageText('accessibility')

  expect(page?.title).toBe('Accessibility')
  expect(page?.seo.metaTitle).toBe('Accessibility · tally-charts')
  expect(headings('2')).toEqual([
    'What CI checks',
    'Keyboard model',
    'What a screen reader gets',
    'Decorative on purpose',
    'The vivid palette',
    'Known limits',
    'Manual checklist',
  ])

  const limits = after('Known limits')
  for (const phrase of [
    'pointer-events: auto',
    '1.4.13',
    'aria-hidden',
    'lower-inclusive',
    'heatmapLevel',
    'RunwayChart',
    'planned for 1.x',
  ]) {
    expect(limits, phrase).toContain(phrase)
  }
  expect(limits.split('\n').filter((line) => line.startsWith('- '))).toHaveLength(13)
})

test('stability states the semver promise, what is public and what is not', async () => {
  const { page, headings, after, all } = await pageText('stability')

  expect(page?.title).toBe('Stability')
  expect(page?.seo.metaTitle).toBe('Stability · tally-charts')
  expect(headings('2')).toEqual([
    'The promise',
    'Public API',
    'Not public',
    'Styling that survives upgrades',
    'Known limits in 1.0',
  ])

  expect(all).toMatch(/strict \[semantic versioning\]\(https:\/\/semver\.org\) from 1\.0\.0/)
  for (const phrase of ['tally-charts/core', '--ch-*', 'data-ch-part', 'data-ch-*', 'theme.css']) {
    expect(after('Public API'), phrase).toContain(phrase)
  }
  for (const phrase of ['ch-*', '--_ch-*', '--_ch-swatch-color', 'i18n', 'size', 'DOM structure']) {
    expect(after('Not public'), phrase).toContain(phrase)
  }
  expect(after('Styling that survives upgrades')).toContain('[data-ch-part')
  expect(all).toContain('](/docs/accessibility')
})

test.each(['accessibility', 'stability'])(
  '%s links to docs pages by slug, not to files of the repo',
  async (slug) => {
    const { all } = await pageText(slug)
    expect(all).not.toMatch(/\]\(\.{1,2}\//)
    expect(all).not.toMatch(/\]\([^)]*\.md[)#]/)
    expect(all).not.toMatch(/\]\((?!https?:|\/docs\/|#)/)
  },
)

test('migration-1-0 lists four breaking changes with code before and an example after', async () => {
  const { page, blocks, headings, after, all } = await pageText('migration-1-0')

  expect(page?.title).toBe('Migration to 1.0')
  expect(page?.seo.metaTitle).toBe('Migration to 1.0 · tally-charts')
  expect(headings('2')).toEqual(['Breaking changes', 'Additive changes'])

  const start = blocks.findIndex((n) => n.type === 'heading' && n.props.text === 'Breaking changes')
  const end = blocks.findIndex((n) => n.type === 'heading' && n.props.text === 'Additive changes')
  const sections: ComponentNode[][] = []
  for (const node of blocks.slice(start + 1, end)) {
    if (node.type === 'heading') {
      expect(['2', '3']).toContain(node.props.level)
      sections.push([])
    } else sections.at(-1)?.push(node)
  }
  expect(sections.length).toBeGreaterThanOrEqual(4)
  for (const section of sections) {
    const before = section.filter(
      (n) => n.type === 'code-block' && n.props.filename === 'Before (0.9)',
    )
    expect(before.length).toBeGreaterThanOrEqual(1)
    const examples = section.filter((n) => n.type === 'chart-example')
    expect(examples.length).toBeGreaterThanOrEqual(1)
    for (const e of examples) expect(String(e.props.exampleId)).toMatch(/^migration\//)
  }

  const breaking = after('Breaking changes')
  expect(breaking).toContain('RankedBars: pass `fill="hatch"` to keep the old look')
  for (const phrase of [
    'fill="hatch"',
    'aria-labelledby',
    'BarChartProps<D> &',
    'Pick',
    'Omit',
    '& ChartName',
    'keyboardHint',
    '](/docs/stability)',
  ]) {
    expect(breaking, phrase).toContain(phrase)
  }

  const additive = after('Additive changes')
  for (const phrase of [
    'underlay',
    '](/docs/line-chart)',
    'createDateFormatter',
    'tally-charts/core',
    'DateFormatOptions',
    'DateFormatSpec',
    'DateFormatter',
    '](/docs/formatting)',
    'Press Enter to select.',
    'onSelect',
    'selectable: false',
  ]) {
    expect(additive, phrase).toContain(phrase)
  }
  expect(all).not.toMatch(/\]\((?!https?:|\/docs\/|#)/)
})
