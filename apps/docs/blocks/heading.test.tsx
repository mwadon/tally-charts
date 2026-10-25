import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { collectToc, Heading, headingBlock, headingId, headingSchema, slugify } from './heading'

test('level 2 renders an h2 and level 3 an h3', () => {
  const { container, rerender } = render(<Heading text="Install" level="2" />)
  expect(container.querySelector('h2')?.textContent).toContain('Install')

  rerender(<Heading text="Install" level="3" />)
  expect(container.querySelector('h2')).toBeNull()
  expect(container.querySelector('h3')?.textContent).toContain('Install')
})

test('the id is the anchor, or else the slug of the text', () => {
  const { container, rerender } = render(<Heading text="Get started" level="2" anchor="intro" />)
  expect(container.querySelector('h2')?.id).toBe('intro')

  rerender(<Heading text="Get started" level="2" />)
  expect(container.querySelector('h2')?.id).toBe('get-started')
})

test('the anchor link points at the id and has an accessible name', () => {
  render(<Heading text="Get started" level="2" />)

  const link = screen.getByRole('link', { name: 'Link to section: Get started' })
  expect(link.getAttribute('href')).toBe('#get-started')
})

test('slugify strips diacritics and punctuation', () => {
  expect(slugify('Zażółć gęślą — jaźń!')).toBe('zazolc-gesla-jazn')
  expect(headingId({ text: '???' })).toBe('section')
})

test('the schema accepts valid props', () => {
  expect(headingSchema.safeParse({ text: 'A', level: '2' }).success).toBe(true)
  expect(headingSchema.safeParse({ text: 'A', level: '3', anchor: 'a-b-1' }).success).toBe(true)
})

test.each([
  ['level 4', { text: 'A', level: '4' }],
  ['a numeric level', { text: 'A', level: 2 }],
  ['an empty text', { text: '', level: '2' }],
  ['a bad anchor', { text: 'A', level: '2', anchor: 'Bad Anchor' }],
  ['a missing level', { text: 'A' }],
])('the schema rejects %s', (_name, props) => {
  expect(headingSchema.safeParse(props).success).toBe(false)
})

test('the level is a select in the CMS', () => {
  expect(headingBlock.fields.find((f) => f.name === 'level')?.fieldType).toBe('select')
})

test('collectToc returns headings in order, including nested ones, and skips the rest', () => {
  const toc = collectToc([
    { type: 'heading', props: { text: 'One', level: '2' } },
    { type: 'prose', props: { markdown: 'x' } },
    {
      type: 'columns',
      props: {},
      children: [
        { type: 'heading', props: { text: 'Nested', level: '3', anchor: 'nested-id' } },
        { type: 'heading', props: { text: 'Bad', level: '9' } },
      ],
    },
    { type: 'heading', props: { text: 'Two', level: '2' } },
  ])

  expect(toc).toEqual([
    { id: 'one', label: 'One' },
    { id: 'nested-id', label: 'Nested' },
    { id: 'two', label: 'Two' },
  ])
})
