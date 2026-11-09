import { fireEvent, render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { ErrorView } from './_components/error-view'
import PageError from './error'
import NotFound, { metadata } from './not-found'

test('the 404 page has the site header, one h1 and links to the home page and the docs', () => {
  const { container } = render(<NotFound />)

  expect(container.querySelector('header.site-header .wordmark')?.getAttribute('href')).toBe('/')
  expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([
    'Page not found',
  ])
  const main = container.querySelector('main#main') as HTMLElement
  const links = [...main.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')])
  expect(links).toEqual([
    ['Home', '/'],
    ['Getting started', '/docs/getting-started'],
  ])
  expect(metadata.title).toBe('Page not found · tally-charts')
})

test('the error page has one h1, a retry button and a link home', () => {
  const reset = vi.fn()
  const { container } = render(<PageError error={new Error('boom')} reset={reset} />)

  expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([
    'Something went wrong',
  ])
  expect(container.querySelector('main#main')).not.toBeNull()
  expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/')
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(reset).toHaveBeenCalledTimes(1)
})

test('the error page shows the digest of a server error, never the message', () => {
  const error = Object.assign(new Error('secret detail'), { digest: '1234567' })
  const { container } = render(<PageError error={error} reset={() => {}} />)

  expect(container.textContent).toContain('1234567')
  expect(container.textContent).not.toContain('secret detail')
})

test('without a digest there is no reference line', () => {
  const { container } = render(<ErrorView retry={() => {}} />)

  expect(container.textContent).not.toContain('Reference')
})
