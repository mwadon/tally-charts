import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { featureGridBlock } from './feature-grid'
import { FeatureGrid } from './home-views'
import { parseBlockProps } from './registry'

const items = [
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

test('the registered component is the same view', () => {
  expect(featureGridBlock.component).toBe(FeatureGrid)
  expect(featureGridBlock.fields.find((f) => f.name === 'items')?.fieldType).toBe('array')
})

test.each([
  ['an empty list', { heading: 'H', items: [] }],
  ['no heading', { items }],
  ['an item without text', { heading: 'H', items: [{ title: 'a' }] }],
])('parseBlockProps rejects %s', (_, bad) => {
  expect(parseBlockProps('feature-grid', bad).success).toBe(false)
})
