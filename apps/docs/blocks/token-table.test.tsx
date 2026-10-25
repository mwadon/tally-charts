import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { TOKENS } from '../tokens.generated'
import { TokenTable, tokenTableSchema } from './token-table'

function rowOf(name: string) {
  const row = screen.getByRole('rowheader', { name }).closest('tr') as HTMLElement
  return within(row).getAllByRole('cell')
}

test('without a group there is a row with both values for every token', () => {
  render(<TokenTable />)

  expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
    'Token',
    'Light',
    'Dark',
  ])
  expect(screen.getAllByRole('rowheader')).toHaveLength(TOKENS.length)
  for (const token of TOKENS) {
    const [light, dark] = rowOf(token.name)
    expect(light?.textContent, token.name).toBe(token.light)
    expect(dark?.textContent, token.name).toBe(token.dark)
  }
})

test('accent has a different light and dark value', () => {
  render(<TokenTable />)

  const [light, dark] = rowOf('--ch-accent')
  expect(light?.textContent).toBe('#2f6bf0')
  expect(dark?.textContent).toBe('#4d86ff')
})

test('a hex value has a decorative swatch of its color, other values do not', () => {
  render(<TokenTable />)

  const [light] = rowOf('--ch-accent')
  const swatch = light?.querySelector<HTMLElement>('.token-swatch')
  expect(swatch?.getAttribute('aria-hidden')).toBe('true')
  expect(swatch?.style.background).not.toBe('')
  expect(rowOf('--ch-radius')[0]?.querySelector('.token-swatch')).toBeNull()
})

test('group shared lists only the theme-independent tokens', () => {
  render(<TokenTable group="shared" />)

  const shared = TOKENS.filter((t) => t.group === 'shared')
  expect(screen.getAllByRole('rowheader').map((h) => h.textContent)).toEqual(
    shared.map((t) => t.name),
  )
  expect(screen.queryByRole('rowheader', { name: '--ch-accent' })).toBeNull()
})

test('group theme lists only the tokens that differ per theme', () => {
  render(<TokenTable group="theme" />)

  expect(screen.getAllByRole('rowheader')).toHaveLength(
    TOKENS.filter((t) => t.group === 'theme').length,
  )
  expect(screen.queryByRole('rowheader', { name: '--ch-radius' })).toBeNull()
})

test('schema accepts no group and the two groups, and rejects others', () => {
  expect(tokenTableSchema.safeParse({}).success).toBe(true)
  expect(tokenTableSchema.safeParse({ group: 'theme' }).success).toBe(true)
  expect(tokenTableSchema.safeParse({ group: 'shared' }).success).toBe(true)
  expect(tokenTableSchema.safeParse({ group: 'nope' }).success).toBe(false)
})
