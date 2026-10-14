import { describe, expect, it } from 'vitest'
import { clampToRange, linearScale, niceDomain } from './linear'

describe('linearScale', () => {
  it('maps the domain onto the range', () => {
    const s = linearScale([0, 40], [200, 0])
    expect(s(0)).toBe(200)
    expect(s(20)).toBe(100)
    expect(s(40)).toBe(0)
    expect(s.domain()).toEqual([0, 40])
    expect(s.range()).toEqual([200, 0])
  })

  it('maps a flat domain to the range start instead of NaN', () => {
    expect(linearScale([5, 5], [0, 100])(5)).toBe(0)
  })

  it('produces round ticks', () => {
    expect(linearScale([0, 40], [0, 1]).ticks(4)).toEqual([0, 10, 20, 30, 40])
  })
})

describe('niceDomain', () => {
  it('extends to round numbers', () => {
    expect(niceDomain([3.2, 37.9])).toEqual([0, 40])
  })
})

describe('clampToRange', () => {
  it('keeps pixel positions inside an inverted range', () => {
    const s = linearScale([0, 10], [100, 0])
    expect(clampToRange(s, s(15))).toBe(0)
    expect(clampToRange(s, s(-5))).toBe(100)
    expect(clampToRange(s, s(5))).toBe(50)
  })
})
