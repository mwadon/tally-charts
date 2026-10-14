import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HATCH,
  DEFAULT_RADIUS,
  fadeMaskId,
  paintFor,
  patternId,
  readHatchGeometry,
  readRadius,
} from './patterns'

describe('patterns', () => {
  it('builds chart-scoped ids', () => {
    expect(patternId('c1', 'loss')).toBe('c1-hatch-loss')
    expect(fadeMaskId('c1', 'left')).toBe('c1-fade-left')
  })

  it('paints solid fills with the tone token', () => {
    expect(paintFor('c1', 'loss', 'solid')).toEqual({ fill: 'var(--ch-loss)' })
  })

  it('paints hatches with the chart-scoped pattern', () => {
    expect(paintFor('c1', 'accent', 'hatch')).toEqual({ fill: 'url(#c1-hatch-accent)' })
  })

  it('adds the fade mask that matches the bar direction', () => {
    expect(paintFor('c1', 'accent', 'hatch-fade')).toEqual({
      fill: 'url(#c1-hatch-accent)',
      mask: 'url(#c1-fade-up)',
    })
    expect(paintFor('c1', 'accent', 'hatch-fade', 'down').mask).toBe('url(#c1-fade-down)')
  })

  it('reads the corner radius token and falls back to the default', () => {
    expect(readRadius({ getPropertyValue: () => ' 6px' })).toBe(6)
    expect(readRadius({ getPropertyValue: () => '' })).toBe(DEFAULT_RADIUS)
    expect(readRadius({ getPropertyValue: () => '-2px' })).toBe(DEFAULT_RADIUS)
  })

  it('reads hatch geometry from CSS custom properties', () => {
    const values: Record<string, string> = { '--ch-hatch-angle': ' 30', '--ch-hatch-gap': '8' }
    expect(readHatchGeometry({ getPropertyValue: (n) => values[n] ?? '' })).toEqual({
      angle: 30,
      gap: 8,
    })
  })

  it('falls back to the defaults for missing or invalid values', () => {
    expect(readHatchGeometry({ getPropertyValue: () => '' })).toEqual(DEFAULT_HATCH)
    expect(readHatchGeometry({ getPropertyValue: () => '-2' }).gap).toBe(DEFAULT_HATCH.gap)
  })
})
