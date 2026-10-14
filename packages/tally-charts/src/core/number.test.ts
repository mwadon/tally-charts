import { describe, expect, it } from 'vitest'
import { toNumber } from './number'

describe('toNumber', () => {
  it('keeps numbers, NaN and infinities as they are', () => {
    expect(toNumber(42)).toBe(42)
    expect(toNumber(-1.5)).toBe(-1.5)
    expect(toNumber(Number.NaN)).toBeNaN()
    expect(toNumber(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
  })

  it('parses non-blank numeric strings', () => {
    expect(toNumber('12')).toBe(12)
    expect(toNumber(' 3.5 ')).toBe(3.5)
    expect(toNumber('abc')).toBeNaN()
  })

  it('treats blank strings, null, undefined, booleans and objects as missing', () => {
    for (const raw of ['', '   ', null, undefined, true, false, {}, [], [1]]) {
      expect(toNumber(raw)).toBeNaN()
    }
  })
})
