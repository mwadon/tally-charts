import { round2, through } from './path'

export interface LinePoint {
  x: number
  y: number
}

export interface BandPoint {
  x: number
  low: number
  high: number
}

/** Runs of consecutive points that pass `complete`; any other point ends the current run. */
function runs<P>(points: readonly P[], complete: (p: P) => boolean): P[][] {
  const out: P[][] = []
  let run: P[] = []
  for (const p of points) {
    if (complete(p)) {
      run.push(p)
    } else if (run.length > 0) {
      out.push(run)
      run = []
    }
  }
  if (run.length > 0) out.push(run)
  return out
}

/**
 * Straight segments through the points (px). A point with a non-finite coordinate breaks the
 * line; a run of one point draws nothing, so its dot is what shows it.
 */
export function linePath(points: readonly LinePoint[]): string {
  return runs(points, (p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .filter((run) => run.length > 1)
    .map(through)
    .join('')
}

/**
 * Closed shapes between `high` and `low` (px), one per run of complete points: forward along
 * `high`, back along `low`.
 */
export function bandPath(points: readonly BandPoint[]): string {
  return runs(points, (p) => [p.x, p.low, p.high].every(Number.isFinite))
    .filter((run) => run.length > 1)
    .map((run) => {
      const top = through(run.map((p) => ({ x: p.x, y: p.high })))
      const back = [...run]
        .reverse()
        .map((p) => `L${round2(p.x)},${round2(p.low)}`)
        .join('')
      return `${top}${back}Z`
    })
    .join('')
}
