import { readFileSync } from 'node:fs'
import path from 'node:path'
import { cleanup, screen, within } from '@testing-library/react'
import { draftMode } from 'next/headers'
import { renderToReadableStream } from 'react-dom/server'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { meta as heroMeta } from '../examples/bar-chart/margin-by-week'
import Home from './page'

vi.mock('next/headers', () => ({ draftMode: vi.fn() }))

const setDraft = (isEnabled: boolean) =>
  vi.mocked(draftMode).mockResolvedValue({ isEnabled } as never)

beforeEach(() => setDraft(false))
afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

interface Node {
  id: string
  type: string
  props: Record<string, unknown>
}

const dir = import.meta.dirname
const home = JSON.parse(readFileSync(path.join(dir, '..', 'content', 'home.json'), 'utf8')) as {
  componentTree: Node[]
}
const tree = home.componentTree

/**
 * The blocks are async Server Components, so the page is rendered like the server does it. The
 * server output has no `role=application` yet (a chart gets it once it is interactive in the
 * browser; the e2e specs check that), so a chart is found as a `figure` named by its title.
 */
async function renderHome() {
  const stream = await renderToReadableStream(await Home())
  await stream.allReady
  document.body.innerHTML = await new Response(stream).text()
  return document.body
}

const nodeOf = (type: string) => tree.find((n) => n.type === type) as Node

test('home page has the hero sentence as the only h1 and the live hero chart', async () => {
  const body = await renderHome()

  expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([
    'Opinionated React charts for narrative business dashboards.',
  ])
  const hero = body.querySelector('.hero') as HTMLElement
  expect(
    within(hero).getByRole('figure', { name: heroMeta.title }).querySelector('svg'),
  ).not.toBeNull()
})

test('the sections come from home.json, in its order', async () => {
  const body = await renderHome()

  expect(tree.map((n) => n.type)).toEqual([
    'hero',
    'visual-language',
    'chart-index',
    'gallery',
    'feature-grid',
    'cta',
  ])
  expect(new Set(tree.map((n) => n.id)).size).toBe(tree.length)
  const expected = tree.flatMap((n) => (n.type === 'hero' ? [] : [n.props.heading as string]))
  // The dashboards in the gallery have h2 titles of their own; only the block headings are
  // direct section children of main.
  const sections = [...body.querySelectorAll('main > section > h2')].map((h) => h.textContent)
  expect(sections).toEqual(expected)
})

test('the gallery has a tab per reference dashboard and the first one as a placeholder', async () => {
  const body = await renderHome()

  const items = nodeOf('gallery').props.items as { exampleId: string; label: string }[]
  expect(items.map((item) => item.exampleId)).toEqual(
    Array.from({ length: 9 }, (_, i) => expect.stringMatching(new RegExp(`^reference/0${i + 1}-`))),
  )
  const gallery = body.querySelector('#dashboards') as HTMLElement
  expect(
    within(gallery)
      .getAllByRole('tab')
      .map((tab) => tab.textContent),
  ).toEqual(items.map((item) => item.label))
  // Only the first dashboard is in the page, and below the fold: the server sends a placeholder.
  const panels = [...gallery.querySelectorAll<HTMLElement>('.gallery-tile')]
  expect(panels).toHaveLength(1)
  const placeholder = panels[0]?.querySelector<HTMLElement>('[data-lazy-placeholder]')
  expect(placeholder?.hasAttribute('data-lazy-wide')).toBe(true)
  // The narrow layout of a dashboard is a single column, so much taller than the wide one.
  const narrow = Number.parseInt(
    placeholder?.style.getPropertyValue('--lazy-min-height-narrow') ?? '',
    10,
  )
  const wide = Number.parseInt(
    placeholder?.style.getPropertyValue('--lazy-min-height-wide') ?? '',
    10,
  )
  expect(narrow).toBeGreaterThan(wide)
  expect(wide).toBeGreaterThan(300)
  expect(panels[0]?.querySelector('svg')).toBeNull()
})

test('the chart index links every chart page of the navigation', async () => {
  const body = await renderHome()

  const navigation = JSON.parse(
    readFileSync(path.join(dir, '..', 'content', 'navigation.json'), 'utf8'),
  ) as { groups: { label: string; items: { slug: string }[] }[] }
  const charts = navigation.groups.find((g) => g.label === 'Charts')?.items.map((i) => i.slug)
  const hrefs = [...body.querySelectorAll('#charts .chart-tile')].map((a) => a.getAttribute('href'))
  expect(charts?.length).toBeGreaterThan(0)
  for (const slug of charts ?? []) expect(hrefs).toContain(`/docs/${slug}`)
})

test('the visual language cards have a mini chart each', async () => {
  const body = await renderHome()

  const section = body.querySelectorAll('main > section')[1] as HTMLElement
  expect(section.querySelectorAll('li.card')).toHaveLength(4)
  const cards = [...section.querySelectorAll<HTMLElement>('li.card')]
  for (const card of cards) {
    expect(card.querySelector('[data-lazy-placeholder]')).not.toBeNull()
    expect(card.querySelector('svg')).toBeNull()
  }
})

test('the hero has the install command with a copy button and the code of its chart', async () => {
  const body = await renderHome()

  const hero = body.querySelector('.hero') as HTMLElement
  expect(hero.querySelector('.install-line code')?.textContent).toBe('npm i tally-charts')
  expect(within(hero).getByRole('button', { name: 'Copy code: npm i tally-charts' })).toBeTruthy()
  expect(hero.querySelector('.hero-code pre')?.textContent).toContain('<BarChart')
})

test('the feature cards link their guides and the closing band links Getting started', async () => {
  const body = await renderHome()

  const links = [...body.querySelectorAll('.feature-card .card-link a')].map((a) =>
    a.getAttribute('href'),
  )
  expect(links).toEqual([
    '/docs/accessibility',
    '/docs/server-components',
    '/docs/theming',
    '/docs/dark-mode',
  ])
  const cta = body.querySelector('section.cta') as HTMLElement
  expect(within(cta).getByRole('link', { name: 'Getting started' }).getAttribute('href')).toBe(
    '/docs/getting-started',
  )
  expect(cta.textContent).toContain('npm i tally-charts')
})

test('the footer links GitHub and npm', async () => {
  const body = await renderHome()

  const footer = body.querySelector('footer.site-footer') as HTMLElement
  expect(within(footer).getByRole('link', { name: 'GitHub' }).getAttribute('href')).toBe(
    'https://github.com/mwadon/tally-charts',
  )
  expect(within(footer).getByRole('link', { name: 'npm' }).getAttribute('href')).toContain(
    'npmjs.com',
  )
})

test('the header has a text wordmark linking to the home page and no logo image', async () => {
  const body = await renderHome()

  // The reference dashboards have headers of their own, so the site header is found by class.
  const header = body.querySelector('header.site-header') as HTMLElement
  expect(within(header).getByRole('link', { name: 'tally-charts' }).getAttribute('href')).toBe('/')
  expect(body.querySelector('img')).toBeNull()
})

test('in draft mode the page has the preview banner', async () => {
  setDraft(true)
  await renderHome()

  expect(screen.getByRole('alert').textContent).toContain('Preview mode')
})

test('outside draft mode there is no preview banner', async () => {
  await renderHome()

  expect(screen.queryByRole('alert')).toBeNull()
})
