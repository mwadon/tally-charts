import type { ScaleBand } from 'd3-scale'
import type { LinearScale } from './linear'

export type TickSpec = 'all' | 'ends' | number
export type TickAnchor = 'start' | 'middle' | 'end'

export interface Tick {
  value: string | number
  position: number
  label: string
  anchor: TickAnchor
}

export function bandTicks(
  scale: ScaleBand<string>,
  spec: TickSpec,
  format: (value: string) => string,
  /**
   * `anchorEnds` (default true) pins the 'ends' labels to the outer band edges, which suits an
   * axis below or above the plot. A side axis passes false so each label stays level with its row.
   */
  { anchorEnds = true }: { anchorEnds?: boolean } = {},
): Tick[] {
  const domain = scale.domain()
  const bandwidth = scale.bandwidth()
  if (spec === 'ends' && !anchorEnds) {
    const ends = domain.length > 1 ? [domain[0], domain[domain.length - 1]] : domain.slice(0, 1)
    return ends.flatMap((value) =>
      value === undefined
        ? []
        : [
            {
              value,
              position: (scale(value) ?? 0) + bandwidth / 2,
              label: format(value),
              anchor: 'middle' as const,
            },
          ],
    )
  }
  if (spec === 'ends') {
    const first = domain[0]
    const last = domain[domain.length - 1]
    if (first === undefined || last === undefined) return []
    const start = scale(first) ?? 0
    if (domain.length === 1) {
      return [
        { value: first, position: start + bandwidth / 2, label: format(first), anchor: 'middle' },
      ]
    }
    return [
      { value: first, position: start, label: format(first), anchor: 'start' },
      { value: last, position: (scale(last) ?? 0) + bandwidth, label: format(last), anchor: 'end' },
    ]
  }
  const step = typeof spec === 'number' ? Math.max(1, Math.ceil(domain.length / spec)) : 1
  return domain
    .filter((_, i) => i % step === 0)
    .map((value) => ({
      value,
      position: (scale(value) ?? 0) + bandwidth / 2,
      label: format(value),
      anchor: 'middle',
    }))
}

export function linearTicks(
  scale: LinearScale,
  spec: TickSpec,
  format: (value: number) => string,
): Tick[] {
  const values = spec === 'ends' ? scale.domain() : scale.ticks(typeof spec === 'number' ? spec : 5)
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

function fits(ticks: readonly Tick[], measure: MeasureTick): boolean {
  // Vertical axes list ticks top-down (descending position); compare in position order.
  const sorted = [...ticks].sort((a, b) => a.position - b.position)
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const next = sorted[i]
    if (prev && next && extent(prev, measure)[1] + MIN_GAP > extent(next, measure)[0]) return false
  }
  return true
}

/** Drops labels until they stop overlapping: every other, every fourth, …, then only the ends. */
export function thinTicks(ticks: readonly Tick[], measure: MeasureTick = estimateWidth): Tick[] {
  if (ticks.length <= 2 || fits(ticks, measure)) return [...ticks]
  for (let step = 2; step < ticks.length; step *= 2) {
    const kept = ticks.filter((_, i) => i % step === 0)
    if (kept.length > 2 && fits(kept, measure)) return kept
  }
  const first = ticks[0]
  const last = ticks[ticks.length - 1]
  if (!first || !last) return []
  return [
    { ...first, anchor: 'start' },
    { ...last, anchor: 'end' },
  ]
}
