import { runs } from './line'
import { round2, through } from './path'

export interface AreaPoint {
  x: number
  y: number
}

/**
 * Closed SVG paths through the points (straight segments) and back along the baseline, one per
 * run of finite points. A point with a non-finite coordinate breaks the area; a run of one point
 * fills nothing, and a bad baseline gives ''.
 */
export function areaPath(points: readonly AreaPoint[], baseline: number): string {
  if (!Number.isFinite(baseline)) return ''
  const base = round2(baseline)
  return runs(points, (p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .filter((run) => run.length > 1)
    .map((run) => {
      const first = run[0] as AreaPoint
      const last = run[run.length - 1] as AreaPoint
      return `${through(run)}L${round2(last.x)},${base}L${round2(first.x)},${base}Z`
    })
    .join('')
}
