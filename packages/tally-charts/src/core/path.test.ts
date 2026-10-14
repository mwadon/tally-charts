import { describe, expect, it } from 'vitest'
import { round2, through } from './path'

describe('round2', () => {
  it('rounds to two decimals', () => {
    expect(round2(1 / 3)).toBe(0.33)
    expect(round2(2 / 3)).toBe(0.67)
    expect(round2(1.005)).toBe(1)
    expect(round2(-1.236)).toBe(-1.24)
    expect(round2(7)).toBe(7)
  })
})

describe('through', () => {
  it('emits M then L commands with rounded coordinates', () => {
    expect(
      through([
        { x: 1 / 3, y: 0 },
        { x: 10, y: 2 / 3 },
      ]),
    ).toBe('M0.33,0L10,0.67')
    expect(through([])).toBe('')
  })
})
