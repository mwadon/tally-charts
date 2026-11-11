import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { CtaArt, HomeArt } from './home-art'

test('the drawing is decoration: hidden from assistive technology and not focusable', () => {
  const { container } = render(<HomeArt />)
  const svg = container.querySelector('svg.home-art')

  expect(svg?.getAttribute('aria-hidden')).toBe('true')
  expect(svg?.getAttribute('focusable')).toBe('false')
  expect(svg?.querySelector('title')).toBeNull()
})

test('every shape takes its color from a class, never from an inline color', () => {
  const { container } = render(<HomeArt />)
  const shapes = [...container.querySelectorAll('path, circle')]

  expect(shapes.length).toBeGreaterThan(10)
  for (const shape of shapes) {
    expect(shape.getAttribute('fill')).toBeNull()
    expect(shape.getAttribute('stroke')).toBeNull()
    expect(shape.getAttribute('style')).toBeNull()
    expect(shape.closest('[class^="art-"]')).not.toBeNull()
  }
})

test('the areas use the loss, accent, soft accent, gain and warn tones', () => {
  const { container } = render(<HomeArt />)
  const tones = new Set(
    [...container.querySelectorAll('path[fill-opacity]')].map((p) => p.getAttribute('class')),
  )

  expect([...tones].sort()).toEqual(['art-accent', 'art-gain', 'art-loss', 'art-soft', 'art-warn'])
})

test('the ridges of the closing band are decoration colored by classes', () => {
  const { container } = render(<CtaArt />)
  const svg = container.querySelector('svg.cta-art')

  expect(svg?.getAttribute('aria-hidden')).toBe('true')
  expect(svg?.getAttribute('focusable')).toBe('false')
  const paths = [...container.querySelectorAll('path')]
  expect(paths.length).toBeGreaterThan(2)
  for (const path of paths) {
    expect(path.getAttribute('class')).toMatch(/^art-/)
    expect(path.getAttribute('fill')).toBeNull()
  }
})
