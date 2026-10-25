import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { draftMode } from 'next/headers'
import { renderToReadableStream } from 'react-dom/server'
import { afterEach, expect, test, vi } from 'vitest'
import { examples } from '../examples.generated'
import { ChartExampleBlock, chartExampleSchema, exampleIds } from './chart-example'

const ID = 'line-chart/revenue-forecast'
const unknown = { exampleId: 'nope/missing', defaultView: 'preview' } as never

vi.mock('next/headers', () => ({ draftMode: vi.fn() }))

const setDraft = (isEnabled: boolean) =>
  vi.mocked(draftMode).mockResolvedValue({ isEnabled } as never)

afterEach(() => {
  vi.unstubAllEnvs()
  vi.mocked(draftMode).mockReset()
})

test('shows the live chart with a Preview / Code toggle', async () => {
  render(await ChartExampleBlock({ exampleId: ID, defaultView: 'preview' }))

  expect(screen.getByRole('application', { name: examples[ID].title })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Preview' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button', { name: 'Code' }).getAttribute('aria-pressed')).toBe('false')
})

async function renderToHtml(element: React.ReactNode) {
  const stream = await renderToReadableStream(element)
  await stream.allReady
  return await new Response(stream).text()
}

test('in the server HTML an eager card has the chart and the others a placeholder', async () => {
  const props = { exampleId: ID, defaultView: 'preview' } as const

  const eager = await renderToHtml(await ChartExampleBlock({ ...props, eager: true }))
  expect(eager).toContain('<svg')
  expect(eager).not.toContain('data-lazy-placeholder')

  const lazy = await renderToHtml(await ChartExampleBlock(props))
  expect(lazy).toContain('data-lazy-placeholder')
  expect(lazy).not.toContain('<svg')
})

test('the placeholder is as tall as the content area of the panel', async () => {
  const props = { exampleId: ID, defaultView: 'preview' } as const

  const standard = await renderToHtml(await ChartExampleBlock(props))
  expect(standard).toContain('style="min-height:16rem"')

  const tall = await renderToHtml(await ChartExampleBlock({ ...props, height: 400 }))
  expect(tall).toContain('style="min-height:368px"')
})

test('an example with a taller narrow chart reserves a narrow and a wide height', async () => {
  const html = await renderToHtml(
    await ChartExampleBlock({
      exampleId: 'runway-chart/gpu-budgets',
      defaultView: 'preview',
      height: 381,
    }),
  )
  expect(html).toContain('--lazy-min-height-narrow:574px')
  expect(html).toContain('--lazy-min-height-wide:349px')
})

test('eager is not part of the schema', () => {
  expect(Object.keys(chartExampleSchema.shape)).not.toContain('eager')
})

test('Code shows the exact source of the example file, with a copy button', async () => {
  render(await ChartExampleBlock({ exampleId: ID, defaultView: 'preview' }))

  fireEvent.click(screen.getByRole('button', { name: 'Code' }))

  const file = path.join(import.meta.dirname, '..', examples[ID].file)
  expect(screen.getByRole('region', { name: 'revenue-forecast.tsx' }).textContent).toBe(
    readFileSync(file, 'utf8'),
  )
  expect(screen.getByRole('button', { name: 'Copy code: revenue-forecast.tsx' })).toBeTruthy()
  expect(screen.queryByRole('application', { name: examples[ID].title })).toBeNull()
})

test('defaultView code starts with the source visible', async () => {
  render(await ChartExampleBlock({ exampleId: ID, defaultView: 'code' }))

  expect(screen.getByRole('button', { name: 'Code' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('region', { name: 'revenue-forecast.tsx' })).toBeTruthy()
  expect(screen.queryByRole('application', { name: examples[ID].title })).toBeNull()
})

test('height sets the minimum height of both panels', async () => {
  const { container } = render(
    await ChartExampleBlock({ exampleId: ID, defaultView: 'preview', height: 400 }),
  )

  const panels = container.querySelectorAll<HTMLElement>('.chart-example-panel')
  expect(panels).toHaveLength(2)
  for (const panel of panels) expect(panel.style.minHeight).toBe('400px')
})

test('without height the panels keep the stylesheet height', async () => {
  const { container } = render(await ChartExampleBlock({ exampleId: ID, defaultView: 'preview' }))

  for (const panel of container.querySelectorAll<HTMLElement>('.chart-example-panel'))
    expect(panel.style.minHeight).toBe('')
})

test('schema accepts every registered example id', () => {
  expect(exampleIds).toEqual(Object.keys(examples))
  for (const exampleId of Object.keys(examples))
    expect(chartExampleSchema.safeParse({ exampleId, defaultView: 'preview' }).success).toBe(true)
})

test.each([
  ['an unknown id', { exampleId: 'nope', defaultView: 'preview' }],
  ['a bad defaultView', { exampleId: ID, defaultView: 'grid' }],
  ['a missing defaultView', { exampleId: ID }],
  ['height 0', { exampleId: ID, defaultView: 'preview', height: 0 }],
  ['a string height', { exampleId: ID, defaultView: 'preview', height: '400' }],
  ['a fractional height', { exampleId: ID, defaultView: 'preview', height: 400.5 }],
  ['a too tall height', { exampleId: ID, defaultView: 'preview', height: 1201 }],
])('schema rejects %s', (_, props) => {
  expect(chartExampleSchema.safeParse(props).success).toBe(false)
})

test.each([undefined, 'preview', 'development'])(
  'an unknown id shows a visible error when APP_ENV is %s',
  async (appEnv) => {
    if (appEnv !== undefined) vi.stubEnv('APP_ENV', appEnv)
    else vi.stubEnv('APP_ENV', undefined as never)

    const { container } = render(await ChartExampleBlock(unknown))

    const box = container.querySelector('.block-error')
    expect(box?.textContent).toContain('nope/missing')
  },
)

test('an unknown id renders nothing on production', async () => {
  vi.stubEnv('APP_ENV', 'production')

  const { container } = render(await ChartExampleBlock(unknown))

  expect(container.innerHTML).toBe('')
})

test('an unknown id renders nothing on production without draft mode', async () => {
  vi.stubEnv('APP_ENV', 'production')
  setDraft(false)

  const { container } = render(await ChartExampleBlock(unknown))

  expect(container.innerHTML).toBe('')
})

test('an unknown id shows a visible error on production in draft mode', async () => {
  vi.stubEnv('APP_ENV', 'production')
  setDraft(true)

  const { container } = render(await ChartExampleBlock(unknown))

  expect(container.querySelector('.block-error')?.textContent).toContain('nope/missing')
})

test('a name from Object.prototype is not an example', async () => {
  const { container } = render(
    await ChartExampleBlock({ exampleId: 'constructor', defaultView: 'preview' } as never),
  )

  expect(container.querySelector('.block-error')?.textContent).toContain('constructor')
})
