import { round2 } from './path'

export interface AreaPoint {
  x: number
  y: number
}

/**
 * A closed SVG path through the points (straight segments) and back along the baseline.
 * Non-finite points are dropped; fewer than two points or a bad baseline give ''.
 */
export function areaPath(points: readonly AreaPoint[], baseline: number): string {
  const kept = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  const first = kept[0]
  const last = kept[kept.length - 1]
  if (!first || !last || kept.length < 2 || !Number.isFinite(baseline)) return ''
  const line = kept.map((p, i) => `${i === 0 ? 'M' : 'L'}${round2(p.x)},${round2(p.y)}`).join('')
  const base = round2(baseline)
  return `${line}L${round2(last.x)},${base}L${round2(first.x)},${base}Z`
}
