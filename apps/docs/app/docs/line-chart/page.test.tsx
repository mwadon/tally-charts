import { fireEvent, render, screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import DocsLayout from '../layout'
import { LINE_EXAMPLE_TITLE } from './line-example'
import LineChartPage from './page'

vi.mock('next/navigation', () => ({ usePathname: () => '/docs/line-chart' }))

function renderPage() {
  return render(
    <DocsLayout>
      <LineChartPage />
    </DocsLayout>,
  )
}

test('the LineChart page has its heading and a live chart in a ChartExample', () => {
  const { container } = renderPage()

  expect(screen.getByRole('heading', { level: 1, name: 'LineChart' })).toBeTruthy()
  expect(screen.getByRole('application', { name: LINE_EXAMPLE_TITLE })).toBeTruthy()
  expect(container.querySelector('svg')).not.toBeNull()
  expect(screen.getByRole('button', { name: 'Preview' }).getAttribute('aria-pressed')).toBe('true')
})

test('the header wordmark is a text link to the home page', () => {
  renderPage()

  const wordmark = within(screen.getByRole('banner')).getByRole('link', { name: 'tally-charts' })
  expect(wordmark.getAttribute('href')).toBe('/')
  expect(wordmark.querySelector('img')).toBeNull()
})

test('the sidebar lists the five groups and marks the current page', () => {
  renderPage()

  const nav = screen.getByRole('navigation', { name: 'Documentation' })
  const groups = within(nav)
    .getAllByRole('heading', { level: 2 })
    .map((h) => h.textContent)
  expect(groups).toEqual(['Start', 'Guides', 'Charts', 'Building blocks', 'Reference'])

  const current = within(nav).getByRole('link', { name: 'LineChart' })
  expect(current.getAttribute('aria-current')).toBe('page')
  // Pages that don't exist yet are listed but are not links.
  expect(within(nav).queryByRole('link', { name: 'Theming' })).toBeNull()
  expect(within(nav).getByText('Theming').getAttribute('aria-disabled')).toBe('true')
})

test('the table of contents links to the h2 anchors of the page', () => {
  const { container } = renderPage()

  const toc = screen.getByRole('navigation', { name: 'On this page' })
  const hrefs = within(toc)
    .getAllByRole('link')
    .map((a) => a.getAttribute('href')?.slice(1) ?? '')
  expect(hrefs.length).toBeGreaterThan(3)
  for (const id of hrefs) {
    expect(container.querySelector(`h2#${id}`), id).not.toBeNull()
  }
})

test('the menu button toggles the navigation panel it controls', () => {
  const { container } = renderPage()

  const button = screen.getByRole('button', { name: 'Menu' })
  const panel = container.querySelector(`#${button.getAttribute('aria-controls')}`)
  expect(panel?.getAttribute('data-open')).toBe('false')
  expect(button.getAttribute('aria-expanded')).toBe('false')

  fireEvent.click(button)
  expect(panel?.getAttribute('data-open')).toBe('true')
  expect(button.getAttribute('aria-expanded')).toBe('true')

  fireEvent.keyDown(document, { key: 'Escape' })
  expect(panel?.getAttribute('data-open')).toBe('false')
})
