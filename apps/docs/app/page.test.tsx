import { readFileSync } from 'node:fs'
import path from 'node:path'
import { cleanup, screen, within } from '@testing-library/react'
import { draftMode } from 'next/headers'
import { renderToReadableStream } from 'react-dom/server'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { meta as heroMeta } from '../examples/bar-chart/margin-by-week'
import { examples } from '../examples.generated'
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
    'gallery',
    'install',
    'feature-grid',
    'link-row',
  ])
  expect(new Set(tree.map((n) => n.id)).size).toBe(tree.length)
  const expected = tree.flatMap((n) => (n.type === 'hero' ? [] : [n.props.heading as string]))
  // The dashboards in the gallery have h2 titles of their own; only the block headings are
  // direct section children of main.
  const sections = [...body.querySelectorAll('main > section > h2')].map((h) => h.textContent)
  expect(sections).toEqual(expected)
})

test('the gallery has a tile per reference dashboard, captioned with the example title', async () => {
  const body = await renderHome()

  const items = (nodeOf('gallery').props.items as { exampleId: string; caption: string }[]).map(
    (item) => item.exampleId,
  )
  expect(items).toEqual(
    Array.from({ length: 9 }, (_, i) => expect.stringMatching(new RegExp(`^reference/0${i + 1}-`))),
  )
  const tiles = [...body.querySelectorAll<HTMLElement>('li.gallery-tile')]
  expect(tiles).toHaveLength(9)
  tiles.forEach((tile, i) => {
    const id = items[i] as keyof typeof examples
    expect(within(tile).getByText(examples[id].title, { selector: 'p' })).toBeTruthy()
    // Below the fold: the chart mounts near the viewport, so the server sends a placeholder.
    expect(tile.querySelector('[data-lazy-placeholder]')).not.toBeNull()
    expect(tile.querySelector('svg')).toBeNull()
  })
})

test('each gallery tile reserves the height of its own dashboard, narrow and wide', async () => {
  const body = await renderHome()

  const placeholders = [
    ...body.querySelectorAll<HTMLElement>('li.gallery-tile [data-lazy-placeholder]'),
  ]
  expect(placeholders).toHaveLength(9)
  const narrow = placeholders.map((el) => el.style.minHeight)
  const wide = placeholders.map((el) => el.style.getPropertyValue('--lazy-min-height-wide'))
  // Dashboards are 400 to 2200 px tall, so a single height for every tile would be wrong.
  expect(new Set(narrow).size).toBeGreaterThan(5)
  expect(narrow).not.toContain('1600px')
  for (const value of [...narrow, ...wide]) expect(value).toMatch(/^\d+px$/)
  for (const el of placeholders) expect(el.hasAttribute('data-lazy-wide')).toBe(true)
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

test('the Install section has a copy button and a status', async () => {
  const body = await renderHome()

  const install = body.querySelectorAll('main > section')[3] as HTMLElement
  expect(within(install).getByRole('heading', { level: 2, name: 'Install' })).toBeTruthy()
  expect(within(install).getByRole('button', { name: /^Copy code/ })).toBeTruthy()
  expect(within(install).getByRole('status')).toBeTruthy()
  expect(install.textContent).toContain('npm i tally-charts')
})

test('the link row links Getting started, GitHub and npm', async () => {
  const body = await renderHome()

  const row = body.querySelector('ul.link-row') as HTMLElement
  expect(
    within(row)
      .getByRole('link', { name: /Getting started/ })
      .getAttribute('href'),
  ).toBe('/docs/getting-started')
  expect(row.querySelector('.nav-soon')).toBeNull()
  expect(within(row).getByRole('link', { name: 'GitHub' }).getAttribute('href')).toBe(
    'https://github.com/mwadon/tally-charts',
  )
  expect(within(row).getByRole('link', { name: 'npm' }).getAttribute('href')).toContain('npmjs.com')
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
