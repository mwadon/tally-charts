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

const HEADING = 'A visual language that reads at a glance'

const items: VisualLanguageProps['items'] = [
  { title: 'Hatched is plan', text: 'Stripes mark a plan.', exampleId: 'visual-language/hatch' },
  { title: 'Solid is actual', text: 'Filled marks happened.', exampleId: 'visual-language/solid' },
  { title: 'Coral is loss', text: 'One loud color.', exampleId: 'visual-language/loss' },
  { title: 'Targets first', text: 'The goal is drawn.', exampleId: 'visual-language/target' },
]

test('renders a card with a heading, a text and a live chart per item', async () => {
  const { container } = render(await VisualLanguage({ heading: HEADING, items }))

  expect(container.querySelectorAll('section > ul.card-grid.card-grid-4 > li.card')).toHaveLength(4)
  const section = container.querySelector('section')
  expect(section?.getAttribute('aria-labelledby')).toBe(
    screen.getByRole('heading', { level: 2, name: HEADING }).id,
  )
  for (const item of items) {
    expect(screen.getByRole('heading', { level: 3, name: item.title })).toBeTruthy()
    expect(screen.getByText(item.text)).toBeTruthy()
    expect(screen.getByRole('application', { name: examples[item.exampleId].title })).toBeTruthy()
  }
})

test('the lede is optional and the section is a band', async () => {
  const without = render(await VisualLanguage({ heading: HEADING, items }))
  expect(without.container.querySelector('.section-lede')).toBeNull()
  expect(without.container.querySelector('section')?.className).toBe('home-section band')
  without.unmount()

  const { container } = render(
    await VisualLanguage({ heading: HEADING, lede: 'Four rules.', items }),
  )
  expect(container.querySelector('.section-lede')?.textContent).toBe('Four rules.')
})

test('the examples are server-safe, except the one that colors a bar by its value', () => {
  // A per-bar tone is a function prop, which a server component cannot pass.
  for (const item of items)
    expect(examples[item.exampleId].rscSafe, item.exampleId).toBe(
      item.exampleId !== 'visual-language/loss',
    )
})

test('every mini chart sits in a .rule-chart box above the heading of its card', async () => {
  const { container } = render(await VisualLanguage({ heading: HEADING, items }))

  const cards = [...container.querySelectorAll('li.card')]
  for (const card of cards) {
    expect(card.firstElementChild?.className).toBe('rule-chart')
    expect(card.querySelector('.rule-chart + h3')).not.toBeNull()
  }
})

test('the items field is an array with items', () => {
  const field = visualLanguageBlock.fields.find((f) => f.name === 'items')
  expect(field?.fieldType).toBe('array')
  expect(field?.items?.length).toBeGreaterThan(0)
})

test('schema accepts the props', () => {
  expect(visualLanguageSchema.safeParse({ heading: HEADING, items }).success).toBe(true)
})

test.each([
  ['an empty list', { heading: 'H', items: [] }],
  ['an unknown example', { heading: 'H', items: [{ title: 'a', text: 'b', exampleId: 'nope' }] }],
  [
    'an item without text',
    { heading: 'H', items: [{ title: 'a', exampleId: 'visual-language/hatch' }] },
  ],
  ['no items', { heading: 'H' }],
  ['no heading', { items }],
  ['an empty heading', { heading: '', items }],
])('parseBlockProps rejects %s', (_, bad) => {
  expect(parseBlockProps('visual-language', bad).success).toBe(false)
})
