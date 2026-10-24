import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { HOME_CHART_TITLE } from './home-chart'
import Home from './page'

test('home page renders the heading and a chart from tally-charts', () => {
  const { container } = render(<Home />)

  expect(screen.getByRole('heading', { level: 1, name: 'tally-charts' })).toBeTruthy()
  expect(screen.getByRole('application', { name: HOME_CHART_TITLE })).toBeTruthy()
  expect(container.querySelector('svg')).not.toBeNull()
})
