import { type DateFormatSpec, isDateFormat } from '../../core/date'
import type { FormatPreset, FormatPresetSpec, Formatter } from '../../core/format'
import { categoryTicks, linearTicks, type Tick, type TickSpec, thinTicks } from '../../core/ticks'
import { type ChartContextValue, useChart } from '../context'

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
 * Category axes show the category unless a function is given.
 */
export type AxisFormat = FormatPreset | FormatPresetSpec | DateFormatSpec | AxisFormatter

export interface AxisProps {
  side: AxisSide
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
  ctx: ChartContextValue,
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

export function Axis({
  side,
  ticks: spec = 'all',
  format,
  thin = true,
  offset = 8,
  highlight,
  extent,
}: AxisProps) {
  const ctx = useChart('Axis')
  const horizontal = side === 'bottom' || side === 'top'
  const resolved = horizontal ? ctx.x : ctx.y
  const custom = typeof format === 'function' ? format : undefined

  let raw: Tick[]
  if (resolved.kind === 'linear') {
    const values = linearTicks(resolved.scale, spec, String, extent)
    const label = custom ?? valueFormatter(ctx, format, values)
    raw = values.map((tick) => ({ ...tick, label: label(tick.value as number) }))
  } else {
    raw = categoryTicks(resolved.scale, spec, custom ?? String, { anchorEnds: horizontal })
  }
  const ticks = thin ? thinTicks(raw, horizontal ? undefined : () => LABEL_HEIGHT) : raw

  return (
    <g data-ch-part="axis" data-ch-side={side}>
      {ticks.map((tick) => (
        <text
          key={`${tick.value}`}
          data-ch-part="axis-label"
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
