import { describe, expect, it } from 'vitest'
import { bandScale, pointScale } from './band'
import { linearScale } from './linear'
import { categoryTicks, estimateWidth, fits, linearTicks, type Tick, thinTicks } from './ticks'

const band = bandScale(['a', 'b', 'c', 'd'], [0, 400], 0, 0)

describe('categoryTicks on a band scale', () => {
  it('places ticks at band centres', () => {
    expect(categoryTicks(band, 'all', String).map((t) => t.position)).toEqual([50, 150, 250, 350])
  })

  it('anchors end ticks to the outer band edges', () => {
    const [first, last] = categoryTicks(band, 'ends', String)
    expect(first).toMatchObject({ value: 'a', position: 0, anchor: 'start' })
    expect(last).toMatchObject({ value: 'd', position: 400, anchor: 'end' })
  })

  it('centres end ticks on their bands when edge anchoring is off', () => {
    const [first, last] = categoryTicks(band, 'ends', String, { anchorEnds: false })
    expect(first).toMatchObject({ value: 'a', position: 50, anchor: 'middle' })
    expect(last).toMatchObject({ value: 'd', position: 350, anchor: 'middle' })
  })

  it('thins to a target count for a numeric spec', () => {
    expect(categoryTicks(band, 2, String).map((t) => t.value)).toEqual(['a', 'c'])
  })

  it('centres the only band of a one-band scale', () => {
    const one = bandScale(['a'], [0, 100], 0, 0)
    expect(categoryTicks(one, 'ends', String)).toEqual([
      { value: 'a', position: 50, label: 'a', anchor: 'middle' },
    ])
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
    // 'Sep 21' is about 39px: every fourth tick (44px apart) still overlaps, the ends don't.
    const ticks = thinTicks(row(9, 11, 'Sep 21'))
    expect(ticks.map((t) => [t.value, t.anchor])).toEqual([
      [0, 'start'],
      [8, 'end'],
    ])
  })

  it('keeps only the first label when even the two ends would overlap', () => {
    expect(thinTicks(row(5, 10, 'Sep 21')).map((t) => [t.value, t.anchor])).toEqual([[0, 'start']])
    expect(thinTicks(row(2, 20, 'Sep 21')).map((t) => [t.value, t.anchor])).toEqual([[0, 'start']])
  })

  describe('with keep', () => {
    const measure = estimateWidth

    it('leaves ticks that fit alone', () => {
      expect(thinTicks(row(3, 100, 'Sep'), undefined, { keep: 1 }).map((t) => t.value)).toEqual([
        0, 1, 2,
      ])
    })

    it('keeps the index and drops the labels that would overlap it', () => {
      // Without keep: 0, 2, 4, 6, 8. Tick 7 sits 40px from 6 and 8, so both go.
      const ticks = row(9, 40, 'Aug 10')
      const kept = thinTicks(ticks, undefined, { keep: 7 })
      expect(kept.map((t) => t.value)).toEqual([0, 2, 4, 7])
      expect(fits(kept, measure)).toBe(true)
    })

    it('keeps the first label and the kept one where only the ends fit', () => {
      const ticks = row(9, 11, 'Sep 21')
      expect(thinTicks(ticks).map((t) => t.value)).toEqual([0, 8])
      const kept = thinTicks(ticks, undefined, { keep: 7 })
      expect(kept.map((t) => [t.value, t.anchor])).toEqual([
        [0, 'start'],
        [7, 'middle'],
      ])
      expect(fits(kept, measure)).toBe(true)
    })

    it('anchors a kept last tick to the outer edge', () => {
      const kept = thinTicks(row(9, 11, 'Sep 21'), undefined, { keep: 8 })
      expect(kept.map((t) => [t.value, t.anchor])).toEqual([
        [0, 'start'],
        [8, 'end'],
      ])
    })

    it('falls back to the kept label alone when it cannot sit beside the first', () => {
      expect(thinTicks(row(5, 10, 'Sep 21'), undefined, { keep: 3 }).map((t) => t.value)).toEqual([
        3,
      ])
      expect(thinTicks(row(5, 10, 'Sep 21'), undefined, { keep: 0 }).map((t) => t.value)).toEqual([
        0,
      ])
    })

    it('pins the first and the kept last label to their band edges', () => {
      // 20px bands, labels ~39px wide: at the band centres the ends overlap, at the edges not.
      const bands = Array.from({ length: 5 }, (_, i) => ({
        value: i,
        position: i * 20 + 10,
        label: 'Sep 21',
        anchor: 'middle' as const,
        bounds: [i * 20, i * 20 + 20] as const,
      }))
      expect(thinTicks(bands).map((t) => t.value)).toEqual([0])
      const kept = thinTicks(bands, undefined, { keep: 4 })
      expect(kept.map((t) => [t.value, t.position, t.anchor])).toEqual([
        [0, 0, 'start'],
        [4, 100, 'end'],
      ])
      expect(fits(kept, measure)).toBe(true)
    })

    it('pins a lone kept last label to the right edge of its band', () => {
      // Three 20px bands: even the first and last labels overlap, so only the kept one is left.
      const bands = Array.from({ length: 3 }, (_, i) => ({
        value: i,
        position: i * 20 + 10,
        label: 'Sep 21',
        anchor: 'middle' as const,
        bounds: [i * 20, i * 20 + 20] as const,
      }))
      expect(
        thinTicks(bands, undefined, { keep: 2 }).map((t) => [t.value, t.position, t.anchor]),
      ).toEqual([[2, 60, 'end']])
    })

    it('ignores an index outside the ticks', () => {
      const ticks = row(9, 40, 'Aug 10')
      expect(thinTicks(ticks, undefined, { keep: 20 })).toEqual(thinTicks(ticks))
    })
  })
})

describe('categoryTicks on a point scale', () => {
  // 400px, padding 0.5: a 100px step, points at 50, 150, 250 and 350.
  const s = pointScale(['Apr', 'May', 'Jun', 'Jul'], [0, 400], 0.5)
  // Padding 0: the first and last points sit on the plot edges, at 0 and 300.
  const edge = pointScale(['Apr', 'May', 'Jun', 'Jul'], [0, 300], 0)

  it('labels every point, centred', () => {
    expect(categoryTicks(s, 'all', String).map((t) => [t.label, t.position, t.anchor])).toEqual([
      ['Apr', 50, 'middle'],
      ['May', 150, 'middle'],
      ['Jun', 250, 'middle'],
      ['Jul', 350, 'middle'],
    ])
  })

  it('labels the ends or every nth point', () => {
    expect(categoryTicks(s, 'ends', String).map((t) => t.label)).toEqual(['Apr', 'Jul'])
    expect(categoryTicks(s, 2, String).map((t) => t.label)).toEqual(['Apr', 'Jun'])
  })

  it('anchors the labels of points on the plot edges inward at padding 0', () => {
    expect(categoryTicks(edge, 'all', String).map((t) => [t.position, t.anchor])).toEqual([
      [0, 'start'],
      [100, 'middle'],
      [200, 'middle'],
      [300, 'end'],
    ])
    expect(categoryTicks(edge, 'ends', String).map((t) => t.anchor)).toEqual(['start', 'end'])
    // Every second point: Apr and Jun. Jun isn't on the edge, so it stays centred.
    expect(categoryTicks(edge, 2, String).map((t) => t.anchor)).toEqual(['start', 'middle'])
  })

  it('keeps edge labels centred on a side axis', () => {
    expect(categoryTicks(edge, 'all', String, { anchorEnds: false }).map((t) => t.anchor)).toEqual([
      'middle',
      'middle',
      'middle',
      'middle',
    ])
  })

  it('formats labels and tolerates an empty domain', () => {
    expect(categoryTicks(s, 'ends', (v) => v.toUpperCase()).map((t) => t.label)).toEqual([
      'APR',
      'JUL',
    ])
    expect(categoryTicks(pointScale([], [0, 1], 0), 'all', String)).toEqual([])
  })
})
