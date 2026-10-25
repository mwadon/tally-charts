import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { examples } from '../examples.generated'
import { Gallery, type GalleryProps, galleryBlock, gallerySchema } from './gallery'
import { parseBlockProps } from './registry'

vi.mock('next/headers', () => ({ draftMode: vi.fn() }))

const props: GalleryProps = {
  heading: 'Nine reference dashboards',
  lede: 'Live examples of each.',
  items: [
    { exampleId: 'bar-chart/margin-by-week', caption: 'Margin' },
    { exampleId: 'line-chart/revenue-forecast' },
  ],
}

test('renders the heading, the lede, the tiles and their charts', async () => {
  const { container } = render(await Gallery(props))

  expect(screen.getByRole('heading', { level: 2, name: props.heading })).toBeTruthy()
  expect(container.querySelector('.section-lede')?.textContent).toBe(props.lede)
  expect(container.querySelectorAll('ul.gallery > li.card.gallery-tile')).toHaveLength(2)
  for (const { exampleId } of props.items)
    expect(screen.getByRole('application', { name: examples[exampleId].title })).toBeTruthy()
})

test('a caption and the lede are optional', async () => {
  const { container } = render(await Gallery({ heading: 'H', items: props.items.slice(1) }))

  expect(container.querySelector('.section-lede')).toBeNull()
  expect(container.querySelector('.gallery-tile p')).toBeNull()
})

test('the caption is shown under the chart', async () => {
  const { container } = render(await Gallery(props))

  expect(container.querySelector('.gallery-tile p')?.textContent).toBe('Margin')
})

test('the items field is an array with items', () => {
  const field = galleryBlock.fields.find((f) => f.name === 'items')
  expect(field?.fieldType).toBe('array')
  expect(field?.items?.length).toBeGreaterThan(0)
})

test('schema accepts the props', () => {
  expect(gallerySchema.safeParse(props).success).toBe(true)
})

test.each([
  ['an empty list', { ...props, items: [] }],
  ['an unknown example', { ...props, items: [{ exampleId: 'nope' }] }],
  ['no heading', { items: props.items }],
])('parseBlockProps rejects %s', (_, bad) => {
  expect(parseBlockProps('gallery', bad).success).toBe(false)
})
