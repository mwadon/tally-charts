import { render, screen, within } from '@testing-library/react'
import { draftMode } from 'next/headers'
import { beforeEach, expect, test, vi } from 'vitest'
import { meta } from '../examples/bar-chart/margin-by-week'
import Home from './page'

vi.mock('next/headers', () => ({ draftMode: vi.fn() }))

const setDraft = (isEnabled: boolean) =>
  vi.mocked(draftMode).mockResolvedValue({ isEnabled } as never)

beforeEach(() => setDraft(false))

test('home page renders the hero sentence, a chart from tally-charts and the sections in order', async () => {
  const { container } = render(await Home())

  expect(
    screen.getByRole('heading', {
      level: 1,
      name: 'Opinionated React charts for narrative business dashboards.',
    }),
  ).toBeTruthy()
  expect(screen.getByRole('application', { name: meta.title })).toBeTruthy()
  expect(container.querySelector('svg')).not.toBeNull()

  const sections = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
  expect(sections).toEqual([
    'A visual language that reads at a glance',
    'Nine reference dashboards',
    'Install',
    'Built for real dashboards',
    'Keep going',
  ])
})

test('the header has a text wordmark linking to the home page and no logo image', async () => {
  const { container } = render(await Home())

  const header = screen.getByRole('banner')
  expect(within(header).getByRole('link', { name: 'tally-charts' }).getAttribute('href')).toBe('/')
  expect(container.querySelector('img')).toBeNull()
})

test('in draft mode the page has the preview banner', async () => {
  setDraft(true)
  render(await Home())

  expect(screen.getByRole('alert').textContent).toContain('Preview mode')
})

test('outside draft mode there is no preview banner', async () => {
  render(await Home())

  expect(screen.queryByRole('alert')).toBeNull()
})
