import { render, screen } from '@testing-library/react'
import { draftMode } from 'next/headers'
import { afterEach, expect, test, vi } from 'vitest'
import { examples } from '../examples.generated'
import { Hero, type HeroProps, heroBlock, heroSchema } from './hero'
import { parseBlockProps } from './registry'

vi.mock('next/headers', () => ({ draftMode: vi.fn() }))

const ID = 'bar-chart/margin-by-week'
const props: HeroProps = {
  eyebrow: 'React charts · 1.0',
  title: 'Charts that say what changed',
  lede: 'Bars and lines with a point of view.',
  actions: [
    { label: 'Read the docs', href: '/docs/line-chart', primary: true },
    { label: 'GitHub', href: 'https://github.com/' },
  ],
  exampleId: ID,
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.mocked(draftMode).mockReset()
})

test('renders the texts, the buttons and the live chart', async () => {
  const { container } = render(await Hero(props))

  expect(screen.getByRole('heading', { level: 1, name: props.title })).toBeTruthy()
  expect(container.querySelector('.eyebrow')?.textContent).toBe(props.eyebrow)
  expect(container.querySelector('.lede')?.textContent).toBe(props.lede)
  expect(screen.getByRole('link', { name: 'Read the docs' }).className).toBe(
    'button button-primary',
  )
  expect(screen.getByRole('link', { name: 'GitHub' }).className).toBe('button')
  expect(screen.getByRole('application', { name: examples[ID].title })).toBeTruthy()
  expect(container.querySelector('.hatch-field')?.getAttribute('aria-hidden')).toBe('true')
})

test('the section is labelled by the title and the eyebrow is optional', async () => {
  const { eyebrow: _, ...rest } = props
  const { container } = render(await Hero(rest))

  expect(screen.getByRole('region', { name: props.title })).toBeTruthy()
  expect(container.querySelector('.eyebrow')).toBeNull()
})

test('the actions field is an array with items', () => {
  const field = heroBlock.fields.find((f) => f.name === 'actions')
  expect(field?.fieldType).toBe('array')
  expect(field?.items?.length).toBeGreaterThan(0)
})

test('schema accepts the props', () => {
  expect(heroSchema.safeParse(props).success).toBe(true)
})

test.each([
  ['an unknown example', { ...props, exampleId: 'nope/missing' }],
  ['a missing title', { ...props, title: '' }],
  ['a missing lede', { ...props, lede: undefined }],
  ['a non-boolean primary', { ...props, actions: [{ label: 'a', href: '/b', primary: 'yes' }] }],
  ['an action without href', { ...props, actions: [{ label: 'a' }] }],
])('parseBlockProps rejects %s', (_, bad) => {
  expect(parseBlockProps('hero', bad).success).toBe(false)
})

const unknown = { ...props, exampleId: 'nope/missing' } as never

test('an unknown example shows the error instead of the block', async () => {
  vi.stubEnv('APP_ENV', undefined as never)
  const { container } = render(await Hero(unknown))

  expect(container.querySelector('.block-error')?.textContent).toContain('nope/missing')
  expect(container.querySelector('h1')).toBeNull()
})

test('an unknown example renders nothing on production without draft mode', async () => {
  vi.stubEnv('APP_ENV', 'production')
  vi.mocked(draftMode).mockResolvedValue({ isEnabled: false } as never)

  const { container } = render(await Hero(unknown))

  expect(container.innerHTML).toBe('')
})
