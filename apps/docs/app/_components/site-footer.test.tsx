import { readFileSync } from 'node:fs'
import path from 'node:path'
import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { SiteFooter } from './site-footer'

const navigation = JSON.parse(
  readFileSync(path.join(import.meta.dirname, '../../content/navigation.json'), 'utf8'),
) as { groups: { items: { slug: string }[] }[] }
const slugs = new Set(navigation.groups.flatMap((g) => g.items.map((i) => i.slug)))

test('the footer has three named link columns and the license', () => {
  render(<SiteFooter />)
  const footer = screen.getByRole('contentinfo')

  for (const name of ['Guides', 'Reference', 'Project'])
    expect(within(footer).getByRole('navigation', { name })).toBeTruthy()
  expect(within(footer).getByText('tally-charts · MIT')).toBeTruthy()
  expect(within(footer).getByRole('link', { name: 'GitHub' }).getAttribute('href')).toBe(
    'https://github.com/mwadon/tally-charts',
  )
})

test('every docs link of the footer is a page of the navigation', () => {
  const { container } = render(<SiteFooter />)

  const docs = [...container.querySelectorAll('a[href^="/docs/"]')].map((a) =>
    (a.getAttribute('href') as string).slice('/docs/'.length),
  )
  expect(docs.length).toBeGreaterThan(4)
  for (const slug of docs) expect(slugs.has(slug), slug).toBe(true)
})
