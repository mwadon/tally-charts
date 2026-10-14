import { scaleBand } from 'd3-scale'
import { describe, expect, it } from 'vitest'
import { linearScale } from './linear'
import { bandTicks, linearTicks, type Tick, thinTicks } from './ticks'

const band = scaleBand<string>().domain(['a', 'b', 'c', 'd']).range([0, 400]).paddingInner(0)

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
