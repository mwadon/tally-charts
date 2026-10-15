import type { BandScale, PointScale } from './scale'

/**
 * A band scale with d3's layout rules (align 0.5, no rounding), without d3-scale's ordinal
 * machinery: `scale(category)` is the band's start. Repeated categories count once; unknown
 * ones give undefined. A reversed range lays the bands out right to left.
 */
export function bandScale(
  categories: readonly string[],
  range: readonly [number, number],
  paddingInner: number,
  paddingOuter: number,
): BandScale {
  const domain = [...new Set(categories)]
  const index = new Map(domain.map((c, i) => [c, i]))
  const [r0, r1] = range
  const reverse = r1 < r0
  const stop = reverse ? r0 : r1
  let start = reverse ? r1 : r0
  const inner = Math.min(1, paddingInner)
  const n = domain.length
  const step = (stop - start) / Math.max(1, n - inner + paddingOuter * 2)
  start += (stop - start - step * (n - inner)) * 0.5
  const bandwidth = step * (1 - inner)
  const scale = ((value: string) => {
    const i = index.get(value)
    return i === undefined ? undefined : start + step * (reverse ? n - 1 - i : i)
  }) as BandScale
  scale.domain = () => [...domain]
  scale.range = () => [r0, r1]
  scale.bandwidth = () => bandwidth
  scale.step = () => step
  return scale
}

/** A point scale: a band scale whose bands have no width; `padding` is the outer padding. */
export function pointScale(
  categories: readonly string[],
  range: readonly [number, number],
  padding: number,
): PointScale {
  return bandScale(categories, range, 1, padding)
}
