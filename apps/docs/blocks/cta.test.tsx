import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { type CtaProps, ctaBlock, ctaSchema } from './cta'
import { CtaView } from './home-views'
import { parseBlockProps } from './registry'

const props: CtaProps = {
  heading: 'Draw your first chart',
  text: 'Install the package.',
  command: 'npm i tally-charts',
  action: { label: 'Getting started', href: '/docs/getting-started' },
}

test('renders the heading, the text, the command with a copy button and the button', () => {
  const { container } = render(<CtaView {...props} />)

  expect(screen.getByRole('region', { name: props.heading })).toBeTruthy()
  expect(container.querySelector('section')?.className).toBe('home-section cta')
  expect(container.querySelector('.cta-text')?.textContent).toBe(props.text)
  expect(container.querySelector('.install-line code')?.textContent).toBe(props.command)
  expect(screen.getByRole('button', { name: `Copy code: ${props.command}` })).toBeTruthy()
  expect(screen.getByRole('status')).toBeTruthy()
  const link = screen.getByRole('link', { name: 'Getting started' })
  expect(link.getAttribute('href')).toBe('/docs/getting-started')
  expect(link.className).toBe('button button-primary')
  expect(container.querySelector('section > svg.cta-art')?.getAttribute('aria-hidden')).toBe('true')
})

test('only the heading is required', () => {
  const { container } = render(<CtaView heading="H" />)

  expect(screen.getByRole('heading', { level: 2, name: 'H' })).toBeTruthy()
  expect(container.querySelector('.cta-text')).toBeNull()
  expect(container.querySelector('.cta-actions')).toBeNull()
})

test('the registered component is the view and the schema accepts the props', () => {
  expect(ctaBlock.component).toBe(CtaView)
  expect(ctaSchema.safeParse(props).success).toBe(true)
})

test.each([
  ['no heading', { text: 'a' }],
  ['an action without href', { heading: 'H', action: { label: 'a' } }],
  ['an action with an empty label', { heading: 'H', action: { label: '', href: '/a' } }],
])('parseBlockProps rejects %s', (_, bad) => {
  expect(parseBlockProps('cta', bad).success).toBe(false)
})
