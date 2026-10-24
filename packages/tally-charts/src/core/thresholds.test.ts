import { describe, expect, it } from 'vitest'
import { heatmapLevel, thresholds } from './thresholds'

const margin = () =>
  thresholds(
    [10, 25, 38],
    ['loss', 'warn', 'accent-soft', 'gain'],
    ['Critical', 'At risk', 'Below target', 'On target'],
  )

describe('thresholds', () => {
  it('puts each value in the bin whose range holds it', () => {
    const th = margin()
    expect([5, 10, 24.9, 25, 38, 60].map((v) => th.indexOf(v))).toEqual([0, 1, 1, 2, 3, 3])
    expect(th.toneOf(12.3)).toBe('warn')
    expect(th.toneOf('40')).toBe('gain')
  })

  it('describes each bin with open ends', () => {
    const { bins } = margin()
    expect(bins[0]).toEqual({ label: 'Critical', tone: 'loss', min: -Infinity, max: 10 })
    expect(bins[3]).toEqual({ label: 'On target', tone: 'gain', min: 38, max: Infinity })
  })

  it('counts only real values in the legend', () => {
    const th = margin()
    expect(th.indexOf(null)).toBe(-1)
    expect(th.indexOf('')).toBe(-1)
    expect(th.toneOf(Number.NaN)).toBeUndefined()
    expect(th.legend([3, 12, 30, 40, 45, null, 'x', true])).toEqual([
      { label: 'Critical', tone: 'loss', count: 1 },
      { label: 'At risk', tone: 'warn', count: 1 },
      { label: 'Below target', tone: 'accent-soft', count: 1 },
      { label: 'On target', tone: 'gain', count: 2 },
    ])
  })

  it('puts a value on a break in the bin below with inclusive upper', () => {
    const th = thresholds([2.5, 4], ['gain', 'warn', 'loss'], ['Good', 'Needs work', 'Poor'], {
      inclusive: 'upper',
    })
    expect(th.inclusive).toBe('upper')
    expect([2.4, 2.5, 2.51, 4, 4.01].map((v) => th.indexOf(v))).toEqual([0, 0, 1, 1, 2])
    expect(th.toneOf(2.5)).toBe('gain')
    expect(th.legend([2.5, 4, 5]).map((l) => l.count)).toEqual([1, 1, 1])
    expect(margin().inclusive).toBe('lower')
  })

  it('throws on a malformed spec', () => {
    expect(() => thresholds([10], ['loss'], ['A'])).toThrow(/one more tone/)
    expect(() => thresholds([10], ['loss', 'gain'], ['A'])).toThrow(/one more tone/)
    expect(() => thresholds([20, 10], ['loss', 'warn', 'gain'], ['A', 'B', 'C'])).toThrow(
      /ascending/,
    )
    expect(() => thresholds([Number.NaN], ['loss', 'gain'], ['A', 'B'])).toThrow(/ascending/)
  })
})

describe('heatmapLevel', () => {
  it('maps values onto the levels Heatmap paints', () => {
    // Three breaks: four bins on levels 1, 2, 4 and 5.
    const breaks = [4000, 7000, 13000]
    expect([1900, 4000, 7900, 12999, 13000, 14800].map((v) => heatmapLevel(v, breaks))).toEqual([
      1, 2, 4, 4, 5, 5,
    ])
  })

  it('cleans breaks the way Heatmap does', () => {
    expect(heatmapLevel(5, [10, 1, 10])).toBe(heatmapLevel(5, [1, 10]))
    // Only the first four breaks count: 60 is in the last of five bins.
    expect(heatmapLevel(60, [10, 20, 30, 40, 50])).toBe(5)
    expect(heatmapLevel(45, [10, 20, 30, 40, 50])).toBe(5)
  })

  it('uses level 3 without breaks and 0 for a missing value', () => {
    expect(heatmapLevel(12, [])).toBe(3)
    expect(heatmapLevel(Number.NaN, [10])).toBe(0)
    expect(heatmapLevel(null, [10])).toBe(0)
    expect(heatmapLevel('7', [5])).toBe(5)
  })
})
