import { ticks } from 'd3-array'
import type { LinearScale } from './linear'
import type { BandScale, PointScale } from './scale'

export type TickSpec = 'all' | 'ends' | number
export type TickAnchor = 'start' | 'middle' | 'end'

export interface Tick {
  value: string | number
  position: number
  label: string
  anchor: TickAnchor
  /** Start and end of the tick's band, set by `categoryTicks` with `anchorEnds`. See `thinTicks`. */
  bounds?: readonly [number, number]
}

/**
 * Labels for a band or point scale: every category ('all'), the first and last ('ends'), or
 * every nth. Labels sit at the band centres or on the points.
 *
 * `anchorEnds` (default true) suits an axis below or above the plot: band 'ends' labels pin to
 * the outer band edges, and points that sit on the plot edge (padding 0) anchor their labels
 * inward, so neither runs past the plot. A side axis passes false so every label stays level
 * with its row.
 */
export function categoryTicks(
  scale: BandScale | PointScale,
  spec: TickSpec,
  format: (value: string) => string,
  { anchorEnds = true }: { anchorEnds?: boolean } = {},
): Tick[] {
  const domain = scale.domain()
  const bandwidth = scale.bandwidth()
  const first = domain[0]
  const last = domain[domain.length - 1]
  const step = typeof spec === 'number' ? Math.max(1, Math.ceil(domain.length / spec)) : 1
  const picked =
    spec === 'ends'
      ? domain.filter((_, i) => i === 0 || i === domain.length - 1)
      : domain.filter((_, i) => i % step === 0)
  const [r0, r1] = scale.range()
  const lo = Math.min(r0, r1)
  const hi = Math.max(r0, r1)
  return picked.map((value): Tick => {
    const start = scale(value) ?? 0
    const tick: Tick = {
      value,
      position: start + bandwidth / 2,
      label: format(value),
      anchor: 'middle',
    }
    if (!anchorEnds || domain.length < 2) return tick
    if (bandwidth > 0) {
      if (spec !== 'ends') return { ...tick, bounds: [start, start + bandwidth] }
      return value === first
        ? { ...tick, position: start, anchor: 'start' }
        : { ...tick, position: start + bandwidth, anchor: 'end' }
    }
    if (value === first && Math.abs(start - lo) < 0.5) return { ...tick, anchor: 'start' }
    if (value === last && Math.abs(start - hi) < 0.5) return { ...tick, anchor: 'end' }
    return tick
  })
}

export function linearTicks(
  scale: LinearScale,
  spec: TickSpec,
  format: (value: number) => string,
  /** Value range to label, when it is narrower than the scale's domain. Default: the domain. */
  extent?: readonly [number, number],
): Tick[] {
  const [lo, hi] = extent ?? scale.domain()
  const count = typeof spec === 'number' ? spec : 5
  const values = spec === 'ends' ? [lo, hi] : extent ? ticks(lo, hi, count) : scale.ticks(count)
  return values.map((value) => ({
    value,
    position: scale(value),
    label: format(value),
    anchor: 'middle',
  }))
}

export type MeasureTick = (tick: Tick) => number

const CHAR_WIDTH = 6.5
const MIN_GAP = 8

/** Rough width of a 12px label; good enough to decide which labels to drop. */
export const estimateWidth: MeasureTick = (tick) => tick.label.length * CHAR_WIDTH

function extent(tick: Tick, measure: MeasureTick): [number, number] {
  const size = measure(tick)
  if (tick.anchor === 'start') return [tick.position, tick.position + size]
  if (tick.anchor === 'end') return [tick.position - size, tick.position]
  return [tick.position - size / 2, tick.position + size / 2]
}

/** True when no two labels overlap (with an 8px gap), measured with `measure`. */
export function fits(ticks: readonly Tick[], measure: MeasureTick): boolean {
  // Vertical axes list ticks top-down (descending position); compare in position order.
  const sorted = [...ticks].sort((a, b) => a.position - b.position)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const next = sorted[i]
    if (prev && next && extent(prev, measure)[1] + MIN_GAP > extent(next, measure)[0]) return false
  }
  return true
}

/**
 * Drops labels until they stop overlapping: every other, every fourth, …, then only the ends,
 * and only the first when even the ends would overlap.
 *
 * `keep` is the index in `ticks` of a label that must survive, e.g. an emphasized one. At every
 * step it stays and the labels that would overlap it go, except the first, which also stays. The
 * last resorts are the first and the kept label, then the kept label alone. With `keep`, the
 * first and the last label are pinned to the outer edges of their bands (`bounds`), where a label
 * has the most room, so a lone last label stays inside the plot.
 */
export function thinTicks(
  ticks: readonly Tick[],
  measure: MeasureTick = estimateWidth,
  { keep }: { keep?: number } = {},
): Tick[] {
  if (ticks.length <= 1 || fits(ticks, measure)) return [...ticks]
  // The first label always stays, so `keep: 0` needs nothing more.
  const pinned = keep ? ticks[keep] : undefined
  for (let step = 2; step < ticks.length; step *= 2) {
    const kept = ticks.filter(
      (tick, i) =>
        i === keep || (i % step === 0 && (i === 0 || !pinned || fits([tick, pinned], measure))),
    )
    if (kept.length > 2 && fits(kept, measure)) return kept
  }
  // Two or more ticks here.
  const first = ticks[0] as Tick
  const last = ticks[ticks.length - 1] as Tick
  // Without `keep` the labels stay at their band centres, as they always did.
  const pin = (tick: Tick, edge: 0 | 1): Tick => ({
    ...tick,
    anchor: edge ? 'end' : 'start',
    position: (keep === undefined ? undefined : tick.bounds?.[edge]) ?? tick.position,
  })
  const start = pin(first, 0)
  const target = pinned ?? last
  const end = target === last ? pin(last, 1) : target
  return fits([start, end], measure) ? [start, end] : [pinned ? end : start]
}
