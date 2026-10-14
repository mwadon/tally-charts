import { describe, expect, it } from 'vitest'
import { bandPath, linePath } from './line'

describe('linePath', () => {
  it('joins points with straight segments', () => {
    expect(
      linePath([
        { x: 0, y: 10 },
        { x: 50, y: 20 },
        { x: 100, y: 5 },
      ]),
    ).toBe('M0,10L50,20L100,5')
  })

  it('breaks a line at missing values into separate runs', () => {
    const d = linePath([
      { x: 0, y: 10 },
      { x: 25, y: 12 },
      { x: 50, y: Number.NaN },
      { x: 100, y: 5 },
      { x: 150, y: 6 },
    ])
    expect(d).toBe('M0,10L25,12M100,5L150,6')
    expect(d).not.toContain('NaN')
  })

  it('draws nothing for lone points', () => {
    expect(linePath([{ x: 0, y: 10 }])).toBe('')
    expect(
      linePath([
        { x: 0, y: 10 },
        { x: Number.NaN, y: 4 },
        { x: 100, y: 5 },
      ]),
    ).toBe('')
    expect(linePath([])).toBe('')
  })

  it('rounds to two decimals', () => {
    expect(
      linePath([
        { x: 1 / 3, y: 2 / 3 },
        { x: 1, y: 1 },
      ]),
    ).toBe('M0.33,0.67L1,1')
  })
})

describe('bandPath', () => {
  it('closes the area along the high values and back along the low values', () => {
    expect(
      bandPath([
        { x: 0, low: 30, high: 10 },
        { x: 50, low: 35, high: 15 },
      ]),
    ).toBe('M0,10L50,15L50,35L0,30Z')
  })

  it('splits into one shape per run of complete points', () => {
    const d = bandPath([
      { x: 0, low: 30, high: 10 },
      { x: 50, low: 35, high: 15 },
      { x: 100, low: Number.NaN, high: 15 },
      { x: 150, low: 30, high: 10 },
      { x: 200, low: 32, high: 12 },
    ])
    expect(d).toBe('M0,10L50,15L50,35L0,30ZM150,10L200,12L200,32L150,30Z')
    expect(d).not.toContain('NaN')
  })

  it('draws nothing without two complete points', () => {
    expect(bandPath([{ x: 0, low: 30, high: 10 }])).toBe('')
  })

  it('treats an infinite x or high value as a gap', () => {
    const d = bandPath([
      { x: 0, low: 30, high: 10 },
      { x: 50, low: 35, high: 15 },
      { x: Number.POSITIVE_INFINITY, low: 30, high: 10 },
      { x: 150, low: 30, high: Number.POSITIVE_INFINITY },
      { x: 200, low: 32, high: 12 },
    ])
    expect(d).toBe('M0,10L50,15L50,35L0,30Z')
    expect(d).not.toContain('Infinity')
  })
})
