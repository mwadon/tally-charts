import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { HOME_CHART_TITLE } from './home-chart'
import Home from './page'

test('home page renders the hero sentence, a chart from tally-charts and the sections in order', () => {
  const { container } = render(<Home />)

  expect(
    screen.getByRole('heading', {
      level: 1,
      name: 'Opinionated React charts for narrative business dashboards.',
    }),
  ).toBeTruthy()
  expect(screen.getByRole('application', { name: HOME_CHART_TITLE })).toBeTruthy()
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

test('the header has a text wordmark linking to the home page and no logo image', () => {
  const { container } = render(<Home />)

  const header = screen.getByRole('banner')
  expect(within(header).getByRole('link', { name: 'tally-charts' }).getAttribute('href')).toBe('/')
  expect(container.querySelector('img')).toBeNull()
})
