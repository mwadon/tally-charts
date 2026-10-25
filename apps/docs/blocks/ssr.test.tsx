// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { Callout } from './callout'
import { ChartExampleBlock } from './chart-example'
import { CodeBlock } from './code-block'
import { Heading } from './heading'
import { Hero } from './hero'
import { Install } from './install'
import { LinkRow } from './link-row'
import { PaletteSwatches } from './palette-swatches'
import { PropsTable } from './props-table'
import { Prose } from './prose'
import { TokenTable } from './token-table'

let errors: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  errors = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  errors.mockRestore()
})

test('Prose renders to a string on the server', () => {
  const html = renderToString(<Prose markdown={'# Hi\n\n**bold** and <script>x</script>'} />)

  expect(html).toContain('<strong>bold</strong>')
  expect(html).not.toContain('<script')
  expect(errors).not.toHaveBeenCalled()
})

test('Heading renders to a string on the server', () => {
  const html = renderToString(<Heading text="Get started" level="2" />)

  expect(html).toContain('<h2')
  expect(html).toContain('id="get-started"')
  expect(errors).not.toHaveBeenCalled()
})

test('Callout renders to a string on the server', () => {
  const html = renderToString(<Callout tone="tip" markdown="Try *this*" />)

  expect(html).toContain('data-tone="tip"')
  expect(html).toContain('<em>this</em>')
  expect(errors).not.toHaveBeenCalled()
})

test('CodeBlock is an async server component whose output renders to a string', async () => {
  const html = renderToString(
    await CodeBlock({ code: 'const a = 1', lang: 'ts', filename: 'a.ts' }),
  )

  expect(html).toContain('var(--shiki-')
  expect(html).toContain('role="status"')
  expect(errors).not.toHaveBeenCalled()
})

test('ChartExample is an async server component whose output renders to a string', async () => {
  const html = renderToString(
    await ChartExampleBlock({ exampleId: 'bar-chart/margin-by-week', defaultView: 'preview' }),
  )

  expect(html).toContain('aria-pressed="true"')
  expect(html).toContain('Margin by week')
  expect(errors).not.toHaveBeenCalled()
})

test('PropsTable is an async server component whose output renders to a string', async () => {
  const html = renderToString(await PropsTable({ symbol: 'LineChart' }))

  expect(html).toContain('Props of LineChart')
  expect(html).toContain('readonly D[]')
  expect(errors).not.toHaveBeenCalled()
})

test('TokenTable renders to a string on the server', () => {
  const html = renderToString(<TokenTable group="theme" />)

  expect(html).toContain('--ch-accent')
  expect(errors).not.toHaveBeenCalled()
})

test('PaletteSwatches renders to a string on the server', () => {
  const html = renderToString(<PaletteSwatches palette="vivid" />)

  expect(html).toContain('#f1a23b')
  expect(errors).not.toHaveBeenCalled()
})

test('Hero is an async server component whose output renders to a string', async () => {
  const html = renderToString(
    await Hero({
      title: 'Charts',
      lede: 'Lede',
      actions: [{ label: 'Docs', href: '/docs/line-chart', primary: true }],
      exampleId: 'bar-chart/margin-by-week',
    }),
  )

  expect(html).toContain('<h1')
  expect(html).toContain('button button-primary')
  expect(html).toContain('Margin by week')
  expect(errors).not.toHaveBeenCalled()
})

test('Install is an async server component whose output renders to a string', async () => {
  const html = renderToString(await Install({ heading: 'Install' }))

  expect(html).toContain('<h2')
  expect(html).toContain('role="status"')
  expect(errors).not.toHaveBeenCalled()
})

test('LinkRow is an async server component whose output renders to a string', async () => {
  const html = renderToString(
    await LinkRow({
      heading: 'Keep going',
      items: [
        { label: 'Soon', href: '/docs/accessibility' },
        { label: 'Now', href: '/docs/line-chart' },
      ],
    }),
  )

  expect(html).toContain('class="nav-soon"')
  expect(html).toContain('href="/docs/line-chart"')
  expect(errors).not.toHaveBeenCalled()
})
