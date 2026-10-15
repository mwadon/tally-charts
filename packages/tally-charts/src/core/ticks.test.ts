import { describe, expect, it } from 'vitest'
import { bandScale, pointScale } from './band'
import { linearScale } from './linear'
import { bandTicks, linearTicks, pointTicks, type Tick, thinTicks } from './ticks'

const band = bandScale(['a', 'b', 'c', 'd'], [0, 400], 0, 0)

describe('bandTicks', () => {
  it('places ticks at band centres', () => {
    expect(bandTicks(band, 'all', String).map((t) => t.position)).toEqual([50, 150, 250, 350])
  })

  it('anchors end ticks to the outer band edges', () => {
    const [first, last] = bandTicks(band, 'ends', String)
    expect(first).toMatchObject({ value: 'a', position: 0, anchor: 'start' })
    expect(last).toMatchObject({ value: 'd', position: 400, anchor: 'end' })
  })

  it('centres end ticks on their bands when edge anchoring is off', () => {
    const [first, last] = bandTicks(band, 'ends', String, { anchorEnds: false })
    expect(first).toMatchObject({ value: 'a', position: 50, anchor: 'middle' })
    expect(last).toMatchObject({ value: 'd', position: 350, anchor: 'middle' })
  })

  it('thins to a target count for a numeric spec', () => {
    expect(bandTicks(band, 2, String).map((t) => t.value)).toEqual(['a', 'c'])
  })
})

describe('linearTicks', () => {
  it('formats round ticks', () => {
    const ticks = linearTicks(linearScale([0, 40], [0, 400]), 4, (v) => `${v}%`)
    expect(ticks.map((t) => t.label)).toEqual(['0%', '10%', '20%', '30%', '40%'])
    expect(ticks[1]?.position).toBe(100)
  })

  it('returns the domain ends for "ends"', () => {
    expect(linearTicks(linearScale([0, 60], [0, 600]), 'ends', String).map((t) => t.value)).toEqual(
      [0, 60],
    )
  })

  it('places ticks within an extent narrower than the scale domain', () => {
    const scale = linearScale([-10, 60], [0, 700])
    expect(linearTicks(scale, 'ends', String, [0, 60]).map((t) => t.position)).toEqual([100, 700])
    expect(linearTicks(scale, 3, String, [0, 60]).map((t) => t.value)).toEqual([0, 20, 40, 60])
  })
})

describe('thinTicks', () => {
  const row = (count: number, spacing: number, label: string): Tick[] =>
    Array.from({ length: count }, (_, i) => ({
      value: i,
      position: i * spacing,
      label,
      anchor: 'middle' as const,
    }))

  it('keeps ticks that fit', () => {
    expect(thinTicks(row(3, 100, 'Sep')).map((t) => t.value)).toEqual([0, 1, 2])
  })

  it('drops every other tick when labels overlap', () => {
    expect(thinTicks(row(9, 40, 'Aug 10')).map((t) => t.value)).toEqual([0, 2, 4, 6, 8])
  })

  it('falls back to the two ends with outer anchors', () => {
    const ticks = thinTicks(row(5, 10, 'Sep 21'))
    expect(ticks.map((t) => [t.value, t.anchor])).toEqual([
      [0, 'start'],
      [4, 'end'],
    ])
  })
})

describe('pointTicks', () => {
  // 400px, padding 0.5: a 100px step, points at 50, 150, 250 and 350.
  const s = pointScale(['Apr', 'May', 'Jun', 'Jul'], [0, 400], 0.5)

  it('labels every point, centred', () => {
    expect(pointTicks(s, 'all', String).map((t) => [t.label, t.position, t.anchor])).toEqual([
      ['Apr', 50, 'middle'],
      ['May', 150, 'middle'],
      ['Jun', 250, 'middle'],
      ['Jul', 350, 'middle'],
    ])
  })

  it('labels the ends or every nth point', () => {
    expect(pointTicks(s, 'ends', String).map((t) => t.label)).toEqual(['Apr', 'Jul'])
    expect(pointTicks(s, 2, String).map((t) => t.label)).toEqual(['Apr', 'Jun'])
  })

  it('formats labels and tolerates an empty domain', () => {
    expect(pointTicks(s, 'ends', (v) => v.toUpperCase()).map((t) => t.label)).toEqual([
      'APR',
      'JUL',
    ])
    expect(pointTicks(pointScale([], [0, 1], 0), 'all', String)).toEqual([])
  })
})
