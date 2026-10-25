import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { examples } from '../examples.generated'
import { ChartExampleBlock, chartExampleSchema, exampleIds } from './chart-example'

const ID = 'line-chart/revenue-forecast'
const unknown = { exampleId: 'nope/missing', defaultView: 'preview' } as never

afterEach(() => {
  vi.unstubAllEnvs()
})

test('shows the live chart with a Preview / Code toggle', async () => {
  render(await ChartExampleBlock({ exampleId: ID, defaultView: 'preview' }))

  expect(screen.getByRole('application', { name: examples[ID].title })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Preview' }).getAttribute('aria-pressed')).toBe('true')
  expect(screen.getByRole('button', { name: 'Code' }).getAttribute('aria-pressed')).toBe('false')
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

test('a name from Object.prototype is not an example', async () => {
  const { container } = render(
    await ChartExampleBlock({ exampleId: 'constructor', defaultView: 'preview' } as never),
  )

  expect(container.querySelector('.block-error')?.textContent).toContain('constructor')
})
