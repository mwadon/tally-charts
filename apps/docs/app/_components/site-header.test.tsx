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

test('the version links to the stability page and Docs to getting started', () => {
  render(<SiteHeader />)
  const header = screen.getByRole('banner')
  expect(
    within(header)
      .getByRole('link', { name: `v${pkg.version}` })
      .getAttribute('href'),
  ).toBe('/docs/stability')
  expect(within(header).getByRole('link', { name: 'Docs' }).getAttribute('href')).toBe(
    '/docs/getting-started',
  )
})

test('only the home page header links to the Charts and Dashboards sections', () => {
  const home = render(<SiteHeader home />)
  expect(screen.getByRole('link', { name: 'Charts' }).getAttribute('href')).toBe('#charts')
  expect(screen.getByRole('link', { name: 'Dashboards' }).getAttribute('href')).toBe('#dashboards')
  home.unmount()

  render(<SiteHeader withMenu />)
  expect(screen.queryByRole('link', { name: 'Charts' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Docs' })).toBeNull()
})
