import {
  autoTickLabels,
  createDateFormatter,
  type DateFormatSpec,
  isDateFormat,
} from '../../core/date'
import type { FormatPreset, FormatPresetSpec, Formatter } from '../../core/format'
import {
  categoryTicks,
  estimateWidth,
  linearTicks,
  type MeasureTick,
  type Tick,
  type TickAnchor,
  type TickSpec,
  thinTicks,
} from '../../core/ticks'
import type { TimeScale } from '../../core/time'
import type { Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { useLocale } from '../ChartsProvider'
import { type InternalChartContext, useChartContext, type ValueScale } from '../context'
import { toneVar } from '../ui/util'
import { valueContext } from './value-scale'

export type AxisSide = 'bottom' | 'top' | 'left' | 'right'
/** A tick value: a number on a value axis, the category on a band or point axis, a Date on a time axis. */
export type AxisValue = string | number | Date

/**
 * A tick label function. Declared as a method so that a number-only `(v: number) => string`
 * stays assignable for value axes, while an unannotated arrow gets `AxisValue`.
 */
export type AxisFormatter = { format(value: AxisValue): string }['format']

/**
 * Number presets label value axes, date specs label time axes, and a function labels any axis.
 * Category axes show the category unless a function is given; a preset or date spec there is
 * ignored with a development warning.
 */
export type AxisFormat = FormatPreset | FormatPresetSpec | DateFormatSpec | AxisFormatter

export interface AxisProps {
  side: AxisSide
  /**
   * Default 'all'. A list of values works on a linear scale only; elsewhere it gives the default
   * ticks and a development warning. Values outside the domain or `extent` are dropped, and `thin`
   * can still drop labels that overlap.
   */
  ticks?: TickSpec
  format?: AxisFormat
  /** Drop labels that would overlap. Default true. */
  thin?: boolean
  /** Distance between the plot edge and the labels in px. Default 8. */
  offset?: number
  /** A tick value (e.g. a band) whose label is emphasized. */
  highlight?: string | number
  /**
   * Linear axes only: the value range to label when the scale runs past it, e.g. a waterfall
   * that leaves room below its lowest total. Default: the scale's domain.
   */
  extent?: readonly [number, number]
  /**
   * The value scale to label on a left or right axis, independent of `side`. Default 'y'. Ignored,
   * with a warning, on a top or bottom axis, which labels `x`.
   */
  scale?: ValueScale
  /** Tints the labels, to tie a value axis to its series. Default: the muted axis color. */
  tone?: Tone
}

const LABEL_HEIGHT = 14

interface LabelPosition {
  x: number
  y: number
  textAnchor: 'start' | 'middle' | 'end'
  dominantBaseline: 'hanging' | 'auto' | 'middle'
}

function place(
  side: AxisSide,
  tick: Tick,
  innerWidth: number,
  innerHeight: number,
  offset: number,
): LabelPosition {
  switch (side) {
    case 'bottom':
      return {
        x: tick.position,
        y: innerHeight + offset,
        textAnchor: tick.anchor,
        dominantBaseline: 'hanging',
      }
    case 'top':
      return { x: tick.position, y: -offset, textAnchor: tick.anchor, dominantBaseline: 'auto' }
    case 'left':
      return { x: -offset, y: tick.position, textAnchor: 'end', dominantBaseline: 'middle' }
    case 'right':
      return {
        x: innerWidth + offset,
        y: tick.position,
        textAnchor: 'start',
        dominantBaseline: 'middle',
      }
  }
}

const FIXED_DECIMALS: ReadonlySet<FormatPreset> = new Set(['percent', 'pts'])

/**
 * The number formatter for a value axis. A preset that always shows decimals (percent, pts) drops
 * them when every tick is a whole number, so the axis reads "0%" rather than "0.0%"; explicit
 * `digits` are kept. Date specs don't apply to numbers and fall back to 'number'.
 */
function valueFormatter(
  ctx: InternalChartContext,
  format: AxisFormat | undefined,
  ticks: readonly Tick[],
): Formatter {
  if (format === undefined || typeof format === 'function' || isDateFormat(format)) {
    return ctx.format('number')
  }
  const spec = typeof format === 'string' ? { preset: format } : format
  const whole =
    spec.digits === undefined &&
    FIXED_DECIMALS.has(spec.preset) &&
    ticks.every((tick) => Number.isInteger(tick.value))
  return ctx.format(whole ? { ...spec, digits: 0 } : spec)
}

/** Labels for a run of time tick values, in epoch ms. */
type TimeLabels = (values: readonly number[]) => string[]

/**
 * Labels for time tick values. 'auto' (the default) writes multi-scale labels; another date spec
 * formats every tick alike; a function gets each tick as a Date. 'ends' labels the domain ends
 * in full.
 */
function timeLabels(
  scale: TimeScale,
  spec: TickSpec,
  format: AxisFormat | undefined,
  locale: string,
): TimeLabels {
  if (typeof format === 'function') return (values) => values.map((v) => format(new Date(v)))
  // The distance between the ticks, also when thinning keeps only some of them.
  const [a, b] = scale.ticks(typeof spec === 'number' ? spec : undefined)
  const options = {
    locale,
    zone: scale.zone,
    step: a !== undefined && b !== undefined ? b - a : undefined,
  }
  if (spec === 'ends' || (isDateFormat(format) && format !== 'auto')) {
    const date = createDateFormatter(isDateFormat(format) ? format : 'auto', options)
    return (values) => values.map(date)
  }
  return (values) => autoTickLabels(values, options)
}

/**
 * Unlabelled ticks for a time scale. With `anchorEnds` (axes above or below the plot),
 * a label on a plot edge is anchored inward, as on a point scale with padding 0, so it doesn't
 * run past the plot.
 */
function timeTicks(scale: TimeScale, spec: TickSpec, anchorEnds: boolean): Tick[] {
  const values =
    spec === 'ends' ? scale.domain() : scale.ticks(typeof spec === 'number' ? spec : undefined)
  const [r0, r1] = scale.range()
  const atEdge = (px: number, edge: number) => anchorEnds && Math.abs(px - edge) < 0.5
  return values.map((value) => {
    const position = scale(value)
    const anchor: TickAnchor = atEdge(position, Math.min(r0, r1))
      ? 'start'
      : atEdge(position, Math.max(r0, r1))
        ? 'end'
        : 'middle'
    return { value, position, label: '', anchor }
  })
}

/** Index of the tick whose value is `highlight` (compared as strings); undefined when none. */
function indexOfValue(
  ticks: readonly Tick[],
  highlight: string | number | undefined,
): number | undefined {
  const i = ticks.findIndex((t) => String(t.value) === String(highlight))
  return highlight === undefined || i < 0 ? undefined : i
}

/** The ticks with labels for their (epoch ms) values. */
function withLabels(ticks: readonly Tick[], label: TimeLabels): Tick[] {
  const labels = label(ticks.map((tick) => tick.value as number))
  return ticks.map((tick, i) => ({ ...tick, label: labels[i] ?? '' }))
}

/**
 * Time labels for the ticks thinning kept. Labels are written again, since a dropped tick may
 * have carried the year; a tick whose label repeats the one before it (a coarse format on fine
 * ticks) is dropped; and the new labels are thinned again until nothing changes, so they fit.
 */
function fitTimeTicks(
  ticks: readonly Tick[],
  label: TimeLabels,
  measure?: MeasureTick,
  highlight?: string | number,
): Tick[] {
  let kept = withLabels(ticks, label)
  for (let pass = 0; pass < 4; pass++) {
    const distinct = kept.filter((tick, i) => i === 0 || tick.label !== kept[i - 1]?.label)
    const keep = indexOfValue(distinct, highlight)
    const next = withLabels(measure ? thinTicks(distinct, measure, { keep }) : distinct, label)
    if (next.length === kept.length && next.every((tick, i) => tick.label === kept[i]?.label)) {
      return next
    }
    kept = next
  }
  return kept
}

export function Axis({
  side,
  ticks: spec = 'all',
  format,
  thin = true,
  offset = 8,
  highlight,
  extent,
  scale,
  tone,
}: AxisProps) {
  const chart = useChartContext('Axis')
  const horizontal = side === 'bottom' || side === 'top'
  if (DEV && horizontal && scale === 'y2') {
    chart.warn(
      'y2-axis-side',
      'Axis `scale="y2"` only applies on side left or right and was ignored.',
    )
  }
  const ctx = valueContext(chart, horizontal ? undefined : scale)
  const { locale } = useLocale()
  if (!ctx) return null
  const resolved = horizontal ? ctx.x : ctx.y
  const custom = typeof format === 'function' ? format : undefined
  if (DEV && typeof spec === 'object' && resolved.kind !== 'linear') {
    ctx.warn(
      'axis-tick-list',
      'Axis `ticks` as a list of values needs a linear scale; the default ticks are used instead.',
    )
  }

  let raw: Tick[]
  let timeLabel: TimeLabels | undefined
  if (resolved.kind === 'time') {
    timeLabel = timeLabels(resolved.scale, spec, format, locale)
    raw = withLabels(timeTicks(resolved.scale, spec, horizontal), timeLabel)
  } else if (resolved.kind === 'linear') {
    const values = linearTicks(resolved.scale, spec, String, extent)
    const label = custom ?? valueFormatter(ctx, format, values)
    raw = values.map((tick) => ({ ...tick, label: label(tick.value as number) }))
  } else {
    if (DEV && format !== undefined && !custom) {
      ctx.warn(
        'axis-category-format',
        'Axis `format` must be a function on a band or point scale; presets and date formats are ignored there.',
      )
    }
    raw = categoryTicks(resolved.scale, spec, custom ?? String, { anchorEnds: horizontal })
  }
  const measure: MeasureTick | undefined = horizontal ? undefined : () => LABEL_HEIGHT
  // The highlighted label survives thinning.
  const keep = indexOfValue(raw, highlight)
  let ticks = thin ? thinTicks(raw, measure, { keep }) : raw
  if (timeLabel) {
    ticks = fitTimeTicks(ticks, timeLabel, thin ? (measure ?? estimateWidth) : undefined, highlight)
  }

  return (
    <g
      data-ch-part="axis"
      data-ch-side={side}
      data-ch-tone={tone}
      style={tone ? toneVar(tone) : undefined}
    >
      {ticks.map((tick) => (
        <text
          key={`${tick.value}`}
          data-ch-part="axis-label"
          data-ch-tone-text={tone ? 'true' : undefined}
          {...place(side, tick, ctx.innerWidth, ctx.innerHeight, offset)}
          data-ch-active={
            highlight !== undefined && String(tick.value) === String(highlight) ? 'true' : undefined
          }
        >
          {tick.label}
        </text>
      ))}
    </g>
  )
}
