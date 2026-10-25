import { render, screen } from '@testing-library/react'
import { beforeEach, expect, test, vi } from 'vitest'
import { LinkRowView } from './home-views'
import { LinkRow, linkRowBlock } from './link-row'
import { parseBlockProps } from './registry'

// The navigation is controlled here: `coming-soon` has no page, whatever content/ holds.
vi.mock('../lib/content', async (importOriginal) => {
  const { controlledNavigation } = await import('../lib/content/__fixtures__/navigation')
  return {
    ...(await importOriginal<typeof import('../lib/content')>()),
    getContentSource: () => ({
      kind: 'fixtures',
      getNavigation: async () => controlledNavigation,
      getPage: async () => null,
      listPages: async () => [],
    }),
  }
})

beforeEach(() => {
  vi.stubEnv('CMS_BASE_URL', '')
})

const items = [
  { label: 'Getting started', href: '/docs/getting-started' },
  { label: 'Coming soon', href: '/docs/coming-soon' },
  { label: 'LineChart', href: '/docs/line-chart#props' },
  { label: 'GitHub', href: 'https://github.com/example/repo' },
]

test('a docs page that does not exist yet is disabled, the others are links', async () => {
  const { container } = render(await LinkRow({ heading: 'Keep going', items }))

  expect(screen.getByRole('heading', { level: 2, name: 'Keep going' })).toBeTruthy()
  const soon = container.querySelector('span.nav-soon[aria-disabled="true"]')
  expect(soon?.textContent).toBe('Coming soon')
  expect(screen.queryByRole('link', { name: 'Coming soon' })).toBeNull()
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
