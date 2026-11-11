import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { type ChartIndexProps, chartIndexBlock, chartIndexSchema } from './chart-index'
import { thumbNames } from './chart-thumbs'
import { ChartIndexView } from './home-views'
import { parseBlockProps } from './registry'

const props: ChartIndexProps = {
  heading: 'Eleven charts, one grammar',
  lede: 'Pick the chart by the question.',
  items: thumbNames.map((thumb) => ({
    label: `Chart ${thumb}`,
    text: `About ${thumb}`,
    href: `/docs/${thumb}`,
    thumb,
  })),
}

test('renders a linked tile per item with the name, the text and a decorative drawing', () => {
  const { container } = render(<ChartIndexView {...props} />)

  expect(screen.getByRole('heading', { level: 2, name: props.heading })).toBeTruthy()
  expect(container.querySelector('section')?.id).toBe('charts')
  expect(container.querySelector('.section-lede')?.textContent).toBe(props.lede)
  const tiles = [...container.querySelectorAll<HTMLAnchorElement>('ul.chart-index > li > a')]
  expect(tiles.map((a) => a.getAttribute('href'))).toEqual(props.items.map((i) => i.href))
  for (const [i, tile] of tiles.entries()) {
    expect(tile.querySelector('.chart-tile-name')?.textContent).toBe(props.items[i]?.label)
    expect(tile.querySelector('.chart-tile-text')?.textContent).toBe(props.items[i]?.text)
    const svg = tile.querySelector('svg.chart-thumb')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    // Every drawing has shapes of its own.
    expect(svg?.childElementCount).toBeGreaterThan(0)
  }
  // The drawings are decoration, so a link is named by its text alone.
  expect(screen.getByRole('link', { name: 'Chart heatmap About heatmap' })).toBeTruthy()
})

test('every shape of a drawing takes its color from a ct-* class', () => {
  const { container } = render(<ChartIndexView {...props} />)

  const shapes = [...container.querySelectorAll('svg.chart-thumb :is(rect, circle, path)')]
  expect(shapes.length).toBeGreaterThan(0)
  for (const shape of shapes) {
    expect(shape.getAttribute('class')).toMatch(/^ct-/)
    expect(shape.getAttribute('fill')).toBeNull()
    expect(shape.getAttribute('stroke')).toBeNull()
  }
  expect(container.querySelector('pattern')).toBeNull()
})

test('the lede is optional', () => {
  const { container } = render(<ChartIndexView heading="H" items={props.items.slice(0, 1)} />)
  expect(container.querySelector('.section-lede')).toBeNull()
})

test('the registered component is the view and items is an array field', () => {
  expect(chartIndexBlock.component).toBe(ChartIndexView)
  expect(chartIndexBlock.fields.find((f) => f.name === 'items')?.fieldType).toBe('array')
  expect(chartIndexSchema.safeParse(props).success).toBe(true)
})

test.each([
  ['an empty list', { heading: 'H', items: [] }],
  ['no heading', { items: props.items }],
  ['an unknown thumb', { heading: 'H', items: [{ ...props.items[0], thumb: 'pie-chart' }] }],
  ['an item without href', { heading: 'H', items: [{ label: 'a', text: 'b', thumb: 'heatmap' }] }],
])('parseBlockProps rejects %s', (_, bad) => {
  expect(parseBlockProps('chart-index', bad).success).toBe(false)
})
