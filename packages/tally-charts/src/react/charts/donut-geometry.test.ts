import { describe, expect, it } from 'vitest'
import { donutGeometry } from './donut-geometry'

const base = { outer: 100, inner: 64, gap: 2, minArc: 2 }
const five = [773, 442, 294, 184, 147]
const TAU = Math.PI * 2

/** Every number in a path, in order. */
const numbers = (path: string): number[] => (path.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)

/** Endpoints of the two arcs of a slice path: [outerStart, outerEnd, innerStart, innerEnd]. */
const arcPoints = (path: string): [number, number][] => {
  const m = path.match(
    /^M(-?[\d.]+),(-?[\d.]+)A[^ ]+ 0 [01] 1 (-?[\d.]+),(-?[\d.]+)L(-?[\d.]+),(-?[\d.]+)A[^ ]+ 0 [01] 0 (-?[\d.]+),(-?[\d.]+)Z$/,
  )
  if (!m) throw new Error(`unexpected path ${path}`)
  const n = m.slice(1).map(Number) as number[]
  return [
    [n[0]!, n[1]!],
    [n[2]!, n[3]!],
    [n[6]!, n[7]!],
    [n[4]!, n[5]!],
  ]
}

const dist = (a: [number, number], b: [number, number]): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1])

describe('donutGeometry', () => {
  it('lays out contiguous arcs around the full circle', () => {
    const arcs = donutGeometry({ ...base, values: five })
    expect(arcs).toHaveLength(5)
    expect(arcs[0]!.start).toBe(0)
    expect(arcs[0]!.end).toBeCloseTo(2.6396, 3)
    for (let i = 1; i < arcs.length; i++) expect(arcs[i]!.start).toBe(arcs[i - 1]!.end)
    expect(arcs[4]!.end).toBeCloseTo(TAU, 6)
    for (const arc of arcs) {
      expect(arc.path.startsWith('M')).toBe(true)
      expect(arc.path).toContain('A100,100')
      expect(arc.path).toContain('A64,64')
      expect(arc.path.endsWith('Z')).toBe(true)
    }
  })

  it('sets the large-arc flag from the trimmed span', () => {
    const flags = (path: string): string[] =>
      [...path.matchAll(/A[\d.]+,[\d.]+ 0 ([01]) [01] /g)].map((m) => m[1]!)
    const arcs = donutGeometry({ ...base, values: five })
    expect(flags(arcs[0]!.path)).toEqual(['0', '0'])
    const two = donutGeometry({ ...base, values: [900, 100] })
    expect(flags(two[0]!.path)).toEqual(['1', '1'])
    expect(flags(two[1]!.path)).toEqual(['0', '0'])
  })

  it('starts the first slice half a gap after 12 o’clock and puts the centroid mid-ring', () => {
    const [arc] = donutGeometry({ ...base, values: five })
    const [x, y] = numbers(arc!.path).slice(0, 2)
    // numbers() drops the sign of "-"? it keeps it, so y is negative.
    expect(x).toBeCloseTo(100 * Math.sin(0.01), 1)
    expect(y).toBeCloseTo(-100 * Math.cos(0.01), 1)
    const mid = (arc!.start + arc!.end) / 2
    expect(Math.hypot(...arc!.centroid)).toBeCloseTo(82, 1)
    expect(arc!.centroid[0]).toBeCloseTo(82 * Math.sin(mid), 1)
    expect(arc!.centroid[1]).toBeCloseTo(-82 * Math.cos(mid), 1)
  })

  it('leaves a constant gap between neighbours on both radii', () => {
    const [a, b] = donutGeometry({ ...base, values: five })
    const pa = arcPoints(a!.path)
    const pb = arcPoints(b!.path)
    expect(dist(pa[1]!, pb[0]!)).toBeCloseTo(2, 1)
    expect(dist(pa[3]!, pb[2]!)).toBeCloseTo(2, 1)
  })

  it('draws a single value as a full ring without a gap', () => {
    const arcs = donutGeometry({ ...base, values: [42] })
    expect(arcs).toHaveLength(1)
    expect(arcs[0]!.start).toBe(0)
    expect(arcs[0]!.end).toBeCloseTo(TAU, 10)
    expect(arcs[0]!.path.match(/A/g)).toHaveLength(4)
    expect(arcs[0]!.path).not.toContain('NaN')
    expect(arcs[0]!.path.endsWith('Z')).toBe(true)
    // inner contour is wound the other way
    expect(arcs[0]!.path).toMatch(/A64,64 0 0 0 0,64A64,64 0 0 0 0,-64Z$/)
  })

  it('keeps tiny slices at least minArc long and the spans summing to 2π', () => {
    const arcs = donutGeometry({ ...base, values: [100000, 1, 1] })
    expect(arcs[1]!.end - arcs[1]!.start).toBeCloseTo(4 / 100, 6)
    expect(arcs[2]!.end - arcs[2]!.start).toBeCloseTo(4 / 100, 6)
    const total = arcs.reduce((sum, a) => sum + (a.end - a.start), 0)
    expect(total).toBeCloseTo(TAU, 6)
    expect(arcs[2]!.end).toBeCloseTo(TAU, 6)
  })

  it('does not throw or produce NaN for degenerate input', () => {
    expect(donutGeometry({ ...base, values: [] })).toEqual([])
    for (const input of [
      { ...base, outer: 0, values: [1, 2, 3] },
      { ...base, outer: 5, inner: 10, values: [1, 2, 3] },
      { ...base, outer: 0, values: [5] },
    ]) {
      const arcs = donutGeometry(input)
      expect(arcs).toHaveLength(input.values.length)
      for (const arc of arcs) {
        expect(arc.path).not.toMatch(/NaN|Infinity/)
        expect(arc.centroid.every(Number.isFinite)).toBe(true)
        expect(Number.isFinite(arc.start) && Number.isFinite(arc.end)).toBe(true)
      }
    }
  })
})
