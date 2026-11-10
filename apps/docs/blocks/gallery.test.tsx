import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { examples } from '../examples.generated'
import { Gallery, type GalleryProps, galleryBlock, galleryLabel, gallerySchema } from './gallery'
import { parseBlockProps } from './registry'

vi.mock('next/headers', () => ({ draftMode: vi.fn() }))

const props: GalleryProps = {
  heading: 'Nine reference dashboards',
  lede: 'Live examples of each.',
  items: [
    { exampleId: 'bar-chart/margin-by-week', label: 'Margin', caption: 'Margin by week' },
    { exampleId: 'line-chart/revenue-forecast' },
  ],
}
const [first, second] = props.items.map((item) => examples[item.exampleId].title) as [
  string,
  string,
]

test('renders the heading, the lede, a tab per item and the first chart', async () => {
  const { container } = render(await Gallery(props))

  expect(screen.getByRole('heading', { level: 2, name: props.heading })).toBeTruthy()
  expect(container.querySelector('section')?.id).toBe('dashboards')
  expect(container.querySelector('.section-lede')?.textContent).toBe(props.lede)
  expect(screen.getByRole('tablist', { name: props.heading })).toBeTruthy()
  expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Margin', second])
  expect(screen.getAllByRole('tab').map((tab) => tab.getAttribute('aria-selected'))).toEqual([
    'true',
    'false',
  ])

  const panel = screen.getByRole('tabpanel', { name: 'Margin' })
  expect(panel.className).toBe('card gallery-tile')
  expect(within(panel).getByRole('application', { name: first })).toBeTruthy()
  expect(panel.querySelector('.gallery-caption')?.textContent).toBe('Margin by week')
  // The other example is not in the page until its tab is chosen.
  expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
  expect(screen.queryByRole('application', { name: second })).toBeNull()
})

test('choosing a tab shows its example and keeps the first one mounted, hidden', async () => {
  const { container } = render(await Gallery(props))
  const [tabA, tabB] = screen.getAllByRole('tab') as [HTMLElement, HTMLElement]
  expect(tabB.hasAttribute('aria-controls')).toBe(false)

  fireEvent.click(tabB)

  const panel = screen.getByRole('tabpanel', { name: second })
  expect(within(panel).getByRole('application', { name: second })).toBeTruthy()
  expect(panel.querySelector('.gallery-caption')).toBeNull()
  expect(tabB.getAttribute('aria-selected')).toBe('true')
  expect(tabB.getAttribute('aria-controls')).toBe(panel.id)
  expect(tabA.getAttribute('aria-selected')).toBe('false')
  const panels = [...container.querySelectorAll<HTMLElement>('.gallery-tile')]
  expect(panels.map((p) => p.hidden)).toEqual([true, false])
})

test('arrow keys, Home and End move the selection and the focus; only the selected tab is in the Tab order', async () => {
  render(await Gallery(props))
  const [tabA, tabB] = screen.getAllByRole('tab') as [HTMLElement, HTMLElement]
  expect([tabA.tabIndex, tabB.tabIndex]).toEqual([0, -1])

  tabA.focus()
  fireEvent.keyDown(tabA, { key: 'ArrowRight' })
  expect(document.activeElement).toBe(tabB)
  expect([tabA.tabIndex, tabB.tabIndex]).toEqual([-1, 0])

  // Past the last tab the selection wraps to the first.
  fireEvent.keyDown(tabB, { key: 'ArrowDown' })
  expect(document.activeElement).toBe(tabA)
  fireEvent.keyDown(tabA, { key: 'ArrowLeft' })
  expect(document.activeElement).toBe(tabB)
  fireEvent.keyDown(tabB, { key: 'Home' })
  expect(tabA.getAttribute('aria-selected')).toBe('true')
  fireEvent.keyDown(tabA, { key: 'End' })
  expect(tabB.getAttribute('aria-selected')).toBe('true')

  fireEvent.keyDown(tabB, { key: 'a' })
  expect(tabB.getAttribute('aria-selected')).toBe('true')
})

test('a label and the lede are optional: the tab is named by the title of its example', async () => {
  const { container } = render(await Gallery({ heading: 'H', items: props.items.slice(1) }))

  expect(container.querySelector('.section-lede')).toBeNull()
  expect(screen.getByRole('tab').textContent).toBe(second)
  expect(galleryLabel({ exampleId: 'bar-chart/margin-by-week' })).toBe(first)
  expect(galleryLabel({ exampleId: 'bar-chart/margin-by-week', label: 'M' })).toBe('M')
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
  ['an empty label', { ...props, items: [{ exampleId: 'bar-chart/margin-by-week', label: '' }] }],
  ['no heading', { items: props.items }],
])('parseBlockProps rejects %s', (_, bad) => {
  expect(parseBlockProps('gallery', bad).success).toBe(false)
})
