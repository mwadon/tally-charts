import { render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { LinkRowView } from './home-views'
import { LinkRow, linkRowBlock } from './link-row'
import { parseBlockProps } from './registry'

beforeEach(() => {
  vi.stubEnv('CMS_BASE_URL', '')
})

const items = [
  { label: 'Getting started', href: '/docs/getting-started' },
  { label: 'Theming', href: '/docs/theming' },
  { label: 'LineChart', href: '/docs/line-chart#props' },
  { label: 'GitHub', href: 'https://github.com/example/repo' },
]

test('a docs page that does not exist yet is disabled, the others are links', async () => {
  const { container } = render(await LinkRow({ heading: 'Keep going', items }))

  expect(screen.getByRole('heading', { level: 2, name: 'Keep going' })).toBeTruthy()
  const soon = container.querySelector('span.nav-soon[aria-disabled="true"]')
  expect(soon?.textContent).toBe('Theming')
  expect(screen.queryByRole('link', { name: 'Theming' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Getting started' }).getAttribute('href')).toBe(
    '/docs/getting-started',
  )
  expect(screen.getByRole('link', { name: 'LineChart' }).getAttribute('href')).toBe(
    '/docs/line-chart#props',
  )
  expect(screen.getByRole('link', { name: 'GitHub' }).getAttribute('href')).toBe(
    'https://github.com/example/repo',
  )
})

test('a slug outside the navigation stays a link', async () => {
  render(await LinkRow({ heading: 'H', items: [{ label: 'Elsewhere', href: '/docs/not-listed' }] }))

  expect(screen.getByRole('link', { name: 'Elsewhere' })).toBeTruthy()
})

test('the view disables exactly the slugs it is given', () => {
  const { container } = render(
    <LinkRowView heading="H" items={items} unavailable={new Set(['line-chart'])} />,
  )

  expect(container.querySelectorAll('.nav-soon')).toHaveLength(1)
  expect(container.querySelector('.nav-soon')?.textContent).toBe('LineChart')
  expect(screen.getByRole('link', { name: 'Getting started' })).toBeTruthy()
})

test('the items field is an array with items', () => {
  const field = linkRowBlock.fields.find((f) => f.name === 'items')
  expect(field?.fieldType).toBe('array')
  expect(field?.items?.length).toBeGreaterThan(0)
})

test.each([
  ['an empty list', { heading: 'H', items: [] }],
  ['no heading', { items }],
  ['a link without href', { heading: 'H', items: [{ label: 'a' }] }],
])('parseBlockProps rejects %s', (_, bad) => {
  expect(parseBlockProps('link-row', bad).success).toBe(false)
})
