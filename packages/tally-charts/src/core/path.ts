/** Rounds to two decimals so SVG paths stay short and identical on server and client. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** M/L commands through the points, coordinates rounded with `round2`. */
export function through(points: readonly { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${round2(p.x)},${round2(p.y)}`).join('')
}
