import { describe, expect, it } from 'vitest'
import { thresholds } from './thresholds'

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

  it('throws on a malformed spec', () => {
    expect(() => thresholds([10], ['loss'], ['A'])).toThrow(/one more tone/)
    expect(() => thresholds([10], ['loss', 'gain'], ['A'])).toThrow(/one more tone/)
    expect(() => thresholds([20, 10], ['loss', 'warn', 'gain'], ['A', 'B', 'C'])).toThrow(
      /ascending/,
    )
    expect(() => thresholds([Number.NaN], ['loss', 'gain'], ['A', 'B'])).toThrow(/ascending/)
  })
})
