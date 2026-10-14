import { nice, ticks } from 'd3-array'

/** A minimal linear scale. d3-scale's scaleLinear is avoided: it costs ~7.6 KB gzipped. */
export interface LinearScale {
  (value: number): number
  domain(): [number, number]
  range(): [number, number]
  ticks(count?: number): number[]
}

export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): LinearScale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0)
  const scale = ((value: number) => r0 + (value - d0) * k) as LinearScale
  scale.domain = () => [d0, d1]
  scale.range = () => [r0, r1]
  scale.ticks = (count = 5) => ticks(d0, d1, count)
  return scale
}

export function niceDomain(domain: readonly [number, number], count = 5): [number, number] {
  const [start, stop] = nice(domain[0], domain[1], count)
  return [start, stop]
}

/** Clamps a pixel position into the scale's range, so out-of-domain values stay in the plot. */
export function clampToRange(scale: LinearScale, px: number): number {
  const [r0, r1] = scale.range()
  return Math.min(Math.max(r0, r1), Math.max(Math.min(r0, r1), px))
}
