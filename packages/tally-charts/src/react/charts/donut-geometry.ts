import { round2 } from '../../core/path'

export interface DonutArc {
  /** Angles in radians from 12 o'clock, clockwise, before the gap is cut. */
  start: number
  end: number
  /** Closed path of the slice around (0, 0), gap already cut. */
  path: string
  /** Point at the middle angle on the middle radius. */
  centroid: [number, number]
}

const TAU = Math.PI * 2

const at = (angle: number, radius: number): string =>
  `${round2(radius * Math.sin(angle))},${round2(-radius * Math.cos(angle))}`

export function donutGeometry(input: {
  /** All finite and > 0, in ring order. */
  values: readonly number[]
  outer: number
  inner: number
  /** Width of the gap between neighbours in px. */
  gap: number
  /** Minimum length of a slice on the outer edge in px, after the gap. */
  minArc: number
}): DonutArc[] {
  const { values, gap, minArc } = input
  const count = values.length
  if (count === 0) return []
  const outer = Math.max(0, input.outer)
  const inner = Math.min(Math.max(0, input.inner), outer)
  const total = values.reduce((sum, v) => sum + v, 0)

  const spans = values.map((v) => (total > 0 ? (v / total) * TAU : TAU / count))
  if (count > 1 && outer > 0) {
    const floor = (minArc + gap) / outer
    let added = 0
    let largest = 0
    spans.forEach((span, i) => {
      if (span < floor) {
        added += floor - span
        spans[i] = floor
      } else if (span > spans[largest]!) largest = i
    })
    if (added > 0) spans[largest] = Math.max(floor, spans[largest]! - added)
  }

  const middle = (outer + inner) / 2
  let cursor = 0
  return spans.map((span, i): DonutArc => {
    const start = cursor
    const end = i === count - 1 ? TAU : cursor + span
    cursor = end
    const mid = (start + end) / 2
    const centroid: [number, number] = [
      round2(middle * Math.sin(mid)),
      round2(-middle * Math.cos(mid)),
    ]

    if (count === 1) {
      const ring = (r: number, sweep: 0 | 1): string =>
        `A${round2(r)},${round2(r)} 0 0 ${sweep} ${at(Math.PI, r)}A${round2(r)},${round2(r)} 0 0 ${sweep} ${at(0, r)}`
      const path = `M${at(0, outer)}${ring(outer, 1)}L${at(0, inner)}${ring(inner, 0)}Z`
      return { start, end, path, centroid }
    }

    // Each side loses half a gap: 1 px at any radius, so the angle depends on the radius.
    const trimmed = (r: number): [number, number] => {
      const trim = r > 0 ? gap / 2 / r : 0
      const from = start + trim
      const to = end - trim
      return to < from ? [mid, mid] : [from, to]
    }
    const [os, oe] = trimmed(outer)
    const [is, ie] = trimmed(inner)
    const large = (a: number, b: number): 0 | 1 => (b - a > Math.PI ? 1 : 0)
    const ro = round2(outer)
    const ri = round2(inner)
    const path =
      `M${at(os, outer)}A${ro},${ro} 0 ${large(os, oe)} 1 ${at(oe, outer)}` +
      `L${at(ie, inner)}A${ri},${ri} 0 ${large(is, ie)} 0 ${at(is, inner)}Z`
    return { start, end, path, centroid }
  })
}
