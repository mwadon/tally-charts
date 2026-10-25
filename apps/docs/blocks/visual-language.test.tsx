import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { examples } from '../examples.generated'
import { parseBlockProps } from './registry'
import {
  VisualLanguage,
  type VisualLanguageProps,
  visualLanguageBlock,
  visualLanguageSchema,
} from './visual-language'

vi.mock('next/headers', () => ({ draftMode: vi.fn() }))

const items: VisualLanguageProps['items'] = [
  { title: 'Hatched is plan', text: 'Stripes mark a plan.', exampleId: 'visual-language/hatch' },
  { title: 'Solid is actual', text: 'Filled marks happened.', exampleId: 'visual-language/solid' },
  { title: 'Pink is loss', text: 'One loud color.', exampleId: 'visual-language/loss' },
  { title: 'Targets first', text: 'The goal is drawn.', exampleId: 'visual-language/target' },
]

test('renders a card with a heading, a text and a live chart per item', async () => {
  const { container } = render(await VisualLanguage({ items }))

  expect(container.querySelectorAll('ul.card-grid.card-grid-4 > li.card')).toHaveLength(4)
  for (const item of items) {
    expect(screen.getByRole('heading', { level: 3, name: item.title })).toBeTruthy()
    expect(screen.getByText(item.text)).toBeTruthy()
    expect(screen.getByRole('application', { name: examples[item.exampleId].title })).toBeTruthy()
  }
})

test('the examples are server-safe', () => {
  for (const item of items) expect(examples[item.exampleId].rscSafe).toBe(true)
})

test('the items field is an array with items', () => {
  const field = visualLanguageBlock.fields.find((f) => f.name === 'items')
  expect(field?.fieldType).toBe('array')
  expect(field?.items?.length).toBeGreaterThan(0)
})

test('schema accepts the props', () => {
  expect(visualLanguageSchema.safeParse({ items }).success).toBe(true)
})

test.each([
  ['an empty list', { items: [] }],
  ['an unknown example', { items: [{ title: 'a', text: 'b', exampleId: 'nope' }] }],
  ['an item without text', { items: [{ title: 'a', exampleId: 'visual-language/hatch' }] }],
  ['no items', {}],
])('parseBlockProps rejects %s', (_, bad) => {
  expect(parseBlockProps('visual-language', bad).success).toBe(false)
})
