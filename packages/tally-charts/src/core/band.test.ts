import { describe, expect, it } from 'vitest'
import { bandScale, pointScale } from './band'

describe('bandScale', () => {
  it('splits the range into equal bands', () => {
    const s = bandScale(['a', 'b', 'c', 'd'], [0, 400], 0, 0)
    expect(['a', 'b', 'c', 'd'].map((c) => s(c))).toEqual([0, 100, 200, 300])
    expect(s.bandwidth()).toBe(100)
    expect(s.step()).toBe(100)
    expect(s.domain()).toEqual(['a', 'b', 'c', 'd'])
    expect(s.range()).toEqual([0, 400])
  })

  it('pads between and around the bands and centres them, like d3', () => {
    // step = 200 / (2 − 0.5 + 2 × 0.25) = 100; the bands start 25px in and are 50px wide.
    const s = bandScale(['a', 'b'], [0, 200], 0.5, 0.25)
    expect([s('a'), s('b')]).toEqual([25, 125])
    expect(s.bandwidth()).toBe(50)
    expect(s.step()).toBe(100)
  })

  it('counts a repeated category once and knows nothing else', () => {
    const s = bandScale(['a', 'b', 'a'], [0, 200], 0, 0)
    expect(s.domain()).toEqual(['a', 'b'])
    expect(s('b')).toBe(100)
    expect(s('z')).toBeUndefined()
  })

  it('lays bands out right to left on a reversed range', () => {
    const s = bandScale(['a', 'b', 'c', 'd'], [400, 0], 0, 0)
    expect(['a', 'b', 'c', 'd'].map((c) => s(c))).toEqual([300, 200, 100, 0])
  })

  it('clamps the inner padding at 1 and survives an empty domain', () => {
    expect(bandScale(['a', 'b'], [0, 100], 3, 0).bandwidth()).toBe(0)
    const empty = bandScale([], [0, 100], 0.2, 0)
    expect(empty.domain()).toEqual([])
    expect(Number.isFinite(empty.step())).toBe(true)
  })
})

describe('pointScale', () => {
  it('spaces points evenly with the padding at each end', () => {
    const s = pointScale(['a', 'b', 'c'], [0, 300], 0.5)
    expect([s('a'), s('b'), s('c')]).toEqual([50, 150, 250])
    expect(s.bandwidth()).toBe(0)
    expect(s.step()).toBe(100)
  })

  it('puts the end points on the range ends at padding 0 and centres a single point', () => {
    const edge = pointScale(['a', 'b', 'c', 'd'], [0, 300], 0)
    expect([edge('a'), edge('d')]).toEqual([0, 300])
    expect(pointScale(['a'], [0, 300], 0.5)('a')).toBe(150)
  })
})
