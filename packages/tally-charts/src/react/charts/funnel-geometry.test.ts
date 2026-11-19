import { describe, expect, it } from 'vitest'
import { funnelGeometry } from './funnel-geometry'

const count = [[1240], [806], [532], [298], [262]]
const series = [
  [420, 380, 300, 140],
  [330, 250, 150, 76],
  [250, 160, 80, 42],
  [170, 80, 30, 18],
  [155, 68, 24, 15],
]
const base = { length: 584, thickness: 200, vertical: false }

/** Every number in a path, in order. */
const numbers = (path: string): number[] => (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)

describe('funnelGeometry', () => {
  it('places step lines and ribbon extents for one stream', () => {
    const g = funnelGeometry({ ...base, values: count })
    expect(g.lines).toEqual([0, 116.8, 233.6, 350.4, 467.2])
    expect(g.extents[0]).toEqual([0, 200])
    expect(g.extents[1]![0]).toBeCloseTo(35, 2)
    expect(g.extents[1]![1]).toBeCloseTo(165, 2)
    expect(g.extents[4]![0]).toBeCloseTo(78.87, 2)
    expect(g.extents[4]![1]).toBeCloseTo(121.13, 2)
    expect(g.paths).toHaveLength(1)
    const path = g.paths[0]!
    expect(path.startsWith('M0,0 H23.36 C70.08,0 70.08,35 116.8,35')).toBe(true)
    expect(path.endsWith('Z')).toBe(true)
    expect(path).toContain('H584')
  })

  it('swaps x and y when vertical', () => {
    const h = funnelGeometry({ ...base, values: count })
    const v = funnelGeometry({ ...base, values: count, vertical: true })
    expect(v.lines).toEqual(h.lines)
    expect(v.extents).toEqual(h.extents)
    expect(v.paths[0]!.startsWith('M0,0 V23.36 C0,70.08 35,70.08 35,116.8')).toBe(true)
    const hn = numbers(h.paths[0]!)
    const vn = numbers(v.paths[0]!)
    expect(vn).toHaveLength(hn.length)
  })

  it('stacks layers that share boundaries', () => {
    const g = funnelGeometry({ ...base, values: series })
    expect(g.paths).toHaveLength(4)
    const far0 = (420 / 1240) * 200
    expect(far0).toBeCloseTo(67.74, 2)
    // Layer 0 path: starts at near edge 0, its far edge at step 0 is the last backward curve's level.
    expect(g.paths[0]).toContain(`${Math.round(far0 * 100) / 100}`)
    // Last layer's far boundary is the ribbon far edge at every step.
    const last = g.paths[3]!
    for (const [, far] of g.extents) expect(last).toContain(`${Math.round(far * 100) / 100}`)
    // Layer k far = layer k+1 near: the near edge of layer 1 starts at the far edge of layer 0.
    expect(g.paths[1]!.startsWith(`M0,${Math.round(far0 * 100) / 100}`)).toBe(true)
  })

  it('keeps the minimum thickness on the ribbon', () => {
    const g = funnelGeometry({ ...base, values: [[1000], [1]] })
    expect(g.extents[1]![1] - g.extents[1]![0]).toBeCloseTo(2, 5)
    const s = funnelGeometry({
      ...base,
      values: [
        [500, 500],
        [1, 1],
      ],
    })
    expect(s.extents[1]![1] - s.extents[1]![0]).toBeCloseTo(2, 5)
    // two layers 1 wide each: layer 1 starts at 100 (centre) in the narrow step
    expect(s.paths[0]).toContain('99')
    expect(s.paths[0]).toContain('100')
    expect(s.paths[1]).toContain('101')
  })

  it('handles zero steps and zero layers without NaN', () => {
    const g = funnelGeometry({ ...base, values: [[10], [0], [5]] })
    expect(g.extents[1]![0]).toBe(g.extents[1]![1])
    expect(g.paths[0]).not.toContain('NaN')
    expect(funnelGeometry({ ...base, values: [[0], [0]] }).paths).toEqual([null])
    expect(
      funnelGeometry({
        ...base,
        values: [
          [5, 0],
          [3, 0],
        ],
      }).paths[1],
    ).toBeNull()
    const partial = funnelGeometry({
      ...base,
      values: [
        [5, 0],
        [3, 2],
      ],
    })
    expect(partial.paths[1]).not.toBeNull()
  })

  it('handles one step and degenerate sizes', () => {
    const one = funnelGeometry({ ...base, values: [[7]] })
    expect(one.lines).toEqual([0])
    expect(one.paths[0]).toBe('M0,0 H584 L584,200 H0 Z')
    for (const size of [{ length: 0 }, { thickness: 0 }, { length: 0, thickness: 0 }]) {
      const g = funnelGeometry({ ...base, ...size, values: series })
      for (const p of g.paths) expect(p).not.toMatch(/NaN|Infinity/)
      for (const [a, b] of g.extents) expect(Number.isFinite(a) && Number.isFinite(b)).toBe(true)
      expect(g.lines.every(Number.isFinite)).toBe(true)
    }
  })
})
