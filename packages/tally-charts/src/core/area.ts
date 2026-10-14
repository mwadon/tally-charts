export interface AreaPoint {
  x: number
  y: number
}

const round = (n: number) => Math.round(n * 100) / 100

/**
 * A closed SVG path through the points (straight segments) and back along the baseline.
 * Non-finite points are dropped; fewer than two points or a bad baseline give ''.
 */
export function areaPath(points: readonly AreaPoint[], baseline: number): string {
  const kept = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  const first = kept[0]
  const last = kept[kept.length - 1]
  if (!first || !last || kept.length < 2 || !Number.isFinite(baseline)) return ''
  const line = kept.map((p, i) => `${i === 0 ? 'M' : 'L'}${round(p.x)},${round(p.y)}`).join('')
  const base = round(baseline)
  return `${line}L${round(last.x)},${base}L${round(first.x)},${base}Z`
}
