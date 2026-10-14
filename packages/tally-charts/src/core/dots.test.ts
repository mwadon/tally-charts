import { describe, expect, it } from 'vitest'
import { binDots, medianOf, stackStrip } from './dots'
import { linearScale } from './linear'

// 0–10 over 0–100px: 10px per unit.
const x = linearScale([0, 10], [0, 100])

describe('binDots', () => {
  it('stacks values per bin from the baseline up, sorted by bin then value', () => {
    const layout = binDots({
      values: [0.5, 0.7, 3.2, null, 'x', 12, -1],
      x,
      binWidth: 1,
      baseline: 100,
      top: 0,
    })
    // Bins are 10px wide: radius = min(6, 10/2 − 1, 100/3/2 − 1) = 4.
    expect(layout.radius).toBe(4)
    expect(layout.crowded).toBe(false)
    expect(layout.dots.map((d) => [d.index, d.bin, d.stack])).toEqual([
      [6, 0, 0],
      [0, 0, 1],
      [1, 0, 2],
      [2, 3, 0],
      [5, 9, 0],
    ])
    expect(layout.dots[0]).toMatchObject({ cx: 5, cy: 96 })
    expect(layout.dots[1]).toMatchObject({ cy: 86 })
    expect(layout.dots[3]).toMatchObject({ cx: 35 })
  })

  it('clamps out-of-domain values into the edge bins', () => {
    const { dots } = binDots({ values: [-5, 15], x, binWidth: 1, baseline: 100, top: 0 })
    expect(dots.map((d) => d.bin)).toEqual([0, 9])
    expect(dots.map((d) => d.cx)).toEqual([5, 95])
  })

  it('shrinks crowded bins to the minimum radius and flags them', () => {
    const layout = binDots({
      values: Array.from({ length: 30 }, () => 0.5),
      x,
      binWidth: 1,
      baseline: 100,
      top: 0,
    })
    expect(layout.crowded).toBe(true)
    expect(layout.radius).toBe(2)
  })

  it('compresses crowded stacks so every dot stays inside the plot', () => {
    const layout = binDots({
      values: Array.from({ length: 30 }, () => 0.5),
      x,
      binWidth: 1,
      baseline: 100,
      top: 0,
    })
    expect(layout.crowded).toBe(true)
    for (const d of layout.dots) {
      expect(d.cy - layout.radius).toBeGreaterThanOrEqual(0 - 1e-9)
      expect(d.cy + layout.radius).toBeLessThanOrEqual(100 + 1e-9)
    }
    // The tallest stack reaches the top exactly.
    expect(Math.min(...layout.dots.map((d) => d.cy)) - layout.radius).toBeCloseTo(0)
  })

  it('falls back to a fortieth of the domain for a bad bin width', () => {
    const { dots } = binDots({ values: [0.3, 0.1], x, binWidth: 0, baseline: 100, top: 0 })
    // Width 0.25: 0.1 → bin 0, 0.3 → bin 1.
    expect(dots.map((d) => d.bin)).toEqual([0, 1])
  })
})

describe('stackStrip', () => {
  it('places dots at their value and lifts the ones that would overlap', () => {
    const { dots, crowded } = stackStrip({
      values: [1, 1.5, 3, 1.2, null],
      x,
      baseline: 50,
      radius: 4,
      gap: 1,
    })
    expect(crowded).toBe(false)
    // Step 9px: x = 10, 12, 15 collide; 30 has room on the bottom level.
    expect(dots.map((d) => [d.index, d.level, d.cx, d.cy])).toEqual([
      [0, 0, 10, 46],
      [3, 1, 12, 37],
      [1, 2, 15, 28],
      [2, 0, 30, 46],
    ])
  })

  it('leaves the layout alone when the levels fit under top', () => {
    const layout = stackStrip({ values: [1, 1.5, 3, 1.2], x, baseline: 50, top: 0, radius: 4 })
    expect(layout.crowded).toBe(false)
    expect(layout.dots.map((d) => d.cy)).toEqual([46, 37, 28, 46])
  })

  it('compresses the levels of a crowded row under top and flags it', () => {
    const { dots, crowded } = stackStrip({
      values: Array.from({ length: 15 }, () => 5),
      x,
      baseline: 50,
      top: 20,
      radius: 4,
    })
    expect(crowded).toBe(true)
    expect(dots).toHaveLength(15)
    for (const d of dots) expect(d.cy - 4).toBeGreaterThanOrEqual(20 - 1e-9)
    expect(Math.max(...dots.map((d) => d.cy))).toBe(46)
  })
})

describe('medianOf', () => {
  it('takes the middle real value', () => {
    expect(medianOf([3, 1, 2])).toBe(2)
    expect(medianOf([4, 1, 2, 3])).toBe(2.5)
    expect(medianOf([null, '', true, 5])).toBe(5)
    expect(Number.isNaN(medianOf([]))).toBe(true)
  })
})
