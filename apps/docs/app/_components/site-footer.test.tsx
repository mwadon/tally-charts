import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { SiteFooter } from './site-footer'

test('the footer is the license and the two project links', () => {
  render(<SiteFooter />)
  const footer = screen.getByRole('contentinfo')

  expect(within(footer).getByText('tally-charts · MIT')).toBeTruthy()
  const nav = within(footer).getByRole('navigation', { name: 'Project' })
  expect(within(nav).getByRole('link', { name: 'GitHub' }).getAttribute('href')).toBe(
    'https://github.com/mwadon/tally-charts',
  )
  expect(within(nav).getByRole('link', { name: 'npm' }).getAttribute('href')).toBe(
    'https://www.npmjs.com/package/tally-charts',
  )
  expect(within(footer).getAllByRole('link')).toHaveLength(2)
})
