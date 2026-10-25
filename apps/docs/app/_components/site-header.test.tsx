import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import pkg from '../../../../packages/tally-charts/package.json'
import { SiteHeader } from './site-header'

test('the header shows the version from packages/tally-charts/package.json', () => {
  render(<SiteHeader />)
  const header = screen.getByRole('banner')
  expect(within(header).getByText(`v${pkg.version}`)).toBeTruthy()
  expect(within(header).queryByText(/^v0\.9$/)).toBeNull()
})

test('the header has the theme switch and no disabled toggle button', () => {
  const { container } = render(<SiteHeader />)
  expect(screen.getByRole('combobox', { name: 'Theme' })).toBeTruthy()
  expect(container.querySelector('.theme-toggle')).toBeNull()
})
