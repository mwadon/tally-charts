/** Rounds to two decimals so SVG paths stay short and identical on server and client. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
