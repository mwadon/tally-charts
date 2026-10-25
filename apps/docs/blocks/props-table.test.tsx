import { render, screen, within } from '@testing-library/react'
import { draftMode } from 'next/headers'
import { afterEach, expect, test, vi } from 'vitest'
import api from '../api.generated.json'
import { apiSymbols, PropsTable, propsTableSchema } from './props-table'

vi.mock('next/headers', () => ({ draftMode: vi.fn() }))

const setDraft = (isEnabled: boolean) =>
  vi.mocked(draftMode).mockResolvedValue({ isEnabled } as never)

afterEach(() => {
  vi.unstubAllEnvs()
  vi.mocked(draftMode).mockReset()
})

const renderTable = async (symbol: string) => render(await PropsTable({ symbol: symbol as never }))

function rowOf(name: string) {
  const row = screen.getByRole('rowheader', { name }).closest('tr') as HTMLElement
  return within(row)
}

test('LineChart: a table with the five columns and a row for data', async () => {
  await renderTable('LineChart')

  const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
  expect(headers).toEqual(['Name', 'Type', 'Default', 'Required', 'Description'])
  // The name is the row header, so the cells are type, default, required and description.
  const cells = rowOf('data').getAllByRole('cell')
  expect(cells[0]?.textContent).toBe('readonly D[]')
  expect(cells[1]?.textContent).toBe('—')
  expect(cells[2]?.textContent).toBe('Yes')
  expect(screen.getByRole('region', { name: 'Props of LineChart' })).toBeTruthy()
})

test('RankedBars: the default of fill is shown', async () => {
  await renderTable('RankedBars')

  const cells = rowOf('fill').getAllByRole('cell')
  expect(cells[1]?.textContent).toBe("'solid'")
  expect(cells[2]?.textContent).toBe('No')
})

test('createFormatter: parameters instead of props, and what it returns', async () => {
  await renderTable('createFormatter')

  expect(screen.getAllByRole('columnheader')[0]?.textContent).toBe('Parameter')
  const spec = rowOf('spec').getAllByRole('cell')
  expect(spec[0]?.textContent).toBe('FormatSpec')
  expect(spec[1]?.textContent).toBe("'number'")
  expect(rowOf('options').getAllByRole('cell')[0]?.textContent).toBe('FormatOptions')
  expect(screen.getByRole('region', { name: 'Parameters of createFormatter' })).toBeTruthy()
  expect(screen.getByText('Formatter').tagName).toBe('CODE')
})

test('descriptions are rendered as markdown', async () => {
  const { container } = await renderTable('createFormatter')

  expect(container.querySelector('td code')).not.toBeNull()
  expect(container.textContent).not.toContain('`locale`')
})

test('every symbol of the API model renders a table or a note', async () => {
  for (const symbol of apiSymbols) {
    const { container, unmount } = await renderTable(symbol)
    expect(container.querySelector('table, p'), symbol).not.toBeNull()
    unmount()
  }
})

test('schema accepts every symbol of the API model', () => {
  expect(apiSymbols).toEqual(Object.keys(api.symbols))
  for (const symbol of apiSymbols)
    expect(propsTableSchema.safeParse({ symbol }).success, symbol).toBe(true)
})

test.each([{ symbol: 'NotASymbol' }, {}, { symbol: 'LineChart', extra: 1 }, { symbol: 3 }])(
  'schema rejects %j',
  (props) => {
    const result = propsTableSchema.safeParse(props)
    // Zod objects strip unknown keys, so only the first, second and last are errors.
    expect(result.success).toBe('extra' in props)
  },
)

test.each([undefined, 'preview', 'development'])(
  'an unknown symbol shows a visible error when APP_ENV is %s',
  async (appEnv) => {
    vi.stubEnv('APP_ENV', appEnv as never)

    const { container } = await renderTable('NotASymbol')

    expect(container.querySelector('.block-error')?.textContent).toContain('NotASymbol')
  },
)

test('an unknown symbol renders nothing on production', async () => {
  vi.stubEnv('APP_ENV', 'production')

  const { container } = await renderTable('NotASymbol')

  expect(container.innerHTML).toBe('')
})

test('an unknown symbol renders nothing on production without draft mode', async () => {
  vi.stubEnv('APP_ENV', 'production')
  setDraft(false)

  const { container } = await renderTable('NotASymbol')

  expect(container.innerHTML).toBe('')
})

test('an unknown symbol shows a visible error on production in draft mode', async () => {
  vi.stubEnv('APP_ENV', 'production')
  setDraft(true)

  const { container } = await renderTable('NotASymbol')

  expect(container.querySelector('.block-error')?.textContent).toContain('NotASymbol')
})

test('a known symbol renders its table on production, in draft mode or not', async () => {
  vi.stubEnv('APP_ENV', 'production')
  setDraft(true)

  await renderTable('LineChart')

  expect(screen.getByRole('region', { name: 'Props of LineChart' })).toBeTruthy()
  expect(document.querySelector('.block-error')).toBeNull()
})

test('a name from Object.prototype is not a symbol', async () => {
  const { container } = await renderTable('toString')

  expect(container.querySelector('.block-error')?.textContent).toContain('toString')
})
