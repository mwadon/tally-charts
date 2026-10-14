import { describe, expect, it } from 'vitest'
import { cx, toneVar, toPercent } from './util'

describe('ui utils', () => {
  it('maps a value onto 0–100 and clamps it', () => {
    expect(toPercent(30, 20, 40)).toBe(50)
    expect(toPercent(50, 20, 40)).toBe(100)
    expect(toPercent(0, 20, 40)).toBe(0)
  })

  it('returns 0 for bad input or an empty range', () => {
    expect(toPercent(Number.NaN, 0, 10)).toBe(0)
    expect(toPercent(5, 10, 10)).toBe(0)
  })

  it('joins class names and builds the swatch variable', () => {
    expect(cx('ch-a')).toBe('ch-a')
    expect(cx('ch-a', 'mine')).toBe('ch-a mine')
    expect(toneVar('loss')).toEqual({ '--ch-swatch-color': 'var(--ch-loss)' })
  })
})
