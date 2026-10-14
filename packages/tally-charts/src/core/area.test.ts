import { describe, expect, it } from 'vitest'
import { areaPath } from './area'

describe('areaPath', () => {
  it('runs through the points and closes along the baseline', () => {
    const path = areaPath(
      [
        { x: 0, y: 10 },
        { x: 50, y: 20 },
        { x: 100, y: 5 },
      ],
      100,
    )
    expect(path).toBe('M0,10L50,20L100,5L100,100L0,100Z')
  })

  it('drops non-finite points and rounds to two decimals', () => {
    const path = areaPath(
      [
        { x: 1.23456, y: 2 },
        { x: Number.NaN, y: 3 },
        { x: 10, y: 4.006 },
      ],
      20,
    )
    expect(path).toBe('M1.23,2L10,4.01L10,20L1.23,20Z')
  })

  it('returns an empty path when there is nothing to fill', () => {
    expect(areaPath([{ x: 1, y: 1 }], 10)).toBe('')
    expect(areaPath([], 10)).toBe('')
    expect(
      areaPath(
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        Number.NaN,
      ),
    ).toBe('')
  })
})
