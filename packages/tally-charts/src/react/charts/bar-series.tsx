import type { TickSpec } from '../../core/ticks'
import { linearTicks } from '../../core/ticks'
import type { Accessor, Fill, Tone } from '../../core/types'
import { DEV, type Warn } from '../../core/warn'
import { useChartContext } from '../context'

export interface BarSeries<D> {
  /** Stable key of the series; unique within the chart. */
  id: string
  /** Name for the tooltip, announcements and the data table header. */
  label: string
  /** Value field of the series. */
  value: Accessor<D, number>
  /** Default: the next tone of the default order: accent, accent-soft, warn, neutral, gain. */
  tone?: Tone
  /** Default 'solid'. */
  fill?: Fill
}

const DEFAULT_TONES: readonly Tone[] = ['accent', 'accent-soft', 'warn', 'neutral', 'gain']

/** The tone of every series: its own, else the next of the default order (repeating). */
export function seriesTones<D>(series: readonly BarSeries<D>[]): Tone[] {
  return series.map((s, i) => s.tone ?? (DEFAULT_TONES[i % DEFAULT_TONES.length] as Tone))
}

/** Vertical rules at the value ticks of a horizontal chart; `Grid` only rules a linear y. */
export function VerticalGrid({ ticks, chart }: { ticks: TickSpec; chart: string }) {
  const ctx = useChartContext(chart)
  if (ctx.x.kind !== 'linear') return null
  const lines = linearTicks(ctx.x.scale, ticks, String)
  return (
    <g data-ch-part="grid">
      {lines.map((tick) => (
        <line
          key={tick.value}
          data-ch-part="grid-line"
          x1={tick.position}
          x2={tick.position}
          y1={0}
          y2={ctx.innerHeight}
        />
      ))}
    </g>
  )
}

/** Development warnings for an empty series list and repeated series ids. */
export function warnSeries<D>(
  series: readonly BarSeries<D>[],
  warn: Warn,
  chart: string,
  prefix: string,
) {
  if (!DEV) return
  if (series.length === 0) {
    warn(`${prefix}-series-empty`, `${chart} needs at least one series; showing the empty state.`)
  }
  const seen = new Set<string>()
  for (const s of series) {
    if (seen.has(s.id)) warn(`${prefix}-series-id`, `${chart} has a repeated series id "${s.id}".`)
    seen.add(s.id)
  }
}
