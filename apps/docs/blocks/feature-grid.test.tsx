import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { featureGridBlock } from './feature-grid'
import { FeatureGrid } from './home-views'
import { parseBlockProps } from './registry'

type Item = { title: string; text: string }

const items: [Item, Item] = [
  { title: 'Accessible', text: 'Keyboard and screen readers.' },
  { title: 'Light and dark', text: 'Follows the system.' },
]

test('renders the heading and a card per item', () => {
  const { container } = render(<FeatureGrid heading="Built for dashboards" items={items} />)

  expect(screen.getByRole('heading', { level: 2, name: 'Built for dashboards' })).toBeTruthy()
  expect(container.querySelectorAll('ul.card-grid.card-grid-4 > li.card')).toHaveLength(2)
  for (const item of items) {
    expect(screen.getByRole('heading', { level: 3, name: item.title })).toBeTruthy()
    expect(screen.getByText(item.text)).toBeTruthy()
  }
})

test('an item with href ends with a link, labelled by linkLabel or "Learn more"', () => {
  const { container } = render(
    <FeatureGrid
      heading="H"
      items={[
        { ...items[0], href: '/docs/accessibility', linkLabel: 'Accessibility guide' },
        { ...items[1], href: '/docs/dark-mode' },
        { title: 'Plain', text: 'No link.' },
      ]}
    />,
  )

  expect(screen.getByRole('link', { name: 'Accessibility guide' }).getAttribute('href')).toBe(
    '/docs/accessibility',
  )
  expect(screen.getByRole('link', { name: 'Learn more' }).getAttribute('href')).toBe(
    '/docs/dark-mode',
  )
  expect(container.querySelectorAll('.card-link')).toHaveLength(2)
})

test('the registered component is the same view', () => {
  expect(featureGridBlock.component).toBe(FeatureGrid)
  expect(featureGridBlock.fields.find((f) => f.name === 'items')?.fieldType).toBe('array')
})

test.each([
  ['an empty list', { heading: 'H', items: [] }],
  ['no heading', { items }],
  ['an item without text', { heading: 'H', items: [{ title: 'a' }] }],
  ['an empty href', { heading: 'H', items: [{ title: 'a', text: 'b', href: '' }] }],
])('parseBlockProps rejects %s', (_, bad) => {
  expect(parseBlockProps('feature-grid', bad).success).toBe(false)
})
