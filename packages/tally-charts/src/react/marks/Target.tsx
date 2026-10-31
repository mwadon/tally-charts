import { categoryCenter, categoryStep } from '../../core/scale'
import { estimateWidth, type Tick } from '../../core/ticks'
import { type TimeInput, toTime } from '../../core/time'
import { DEV } from '../../core/warn'
import { useChartContext, type ValueScale } from '../context'
import { valueContext } from './value-scale'

export interface TargetProps {
  /**
   * Draws a vertical rule at this x value: a number on a linear scale, or a date (`Date`, epoch
   * ms or ISO string) on a time scale.
   */
  x?: TimeInput
  /** Draws a horizontal rule at this y value, or at this category on a band or point scale. */
  y?: number | string
  /**
   * Where the rule sits within its category on a band or point scale, as a fraction of the step:
   * 0 is the start edge, 1 the end edge. Default 0.5, the centre. Values outside 0 to 1 are clamped.
   * Ignored, with a warning, on a linear or time scale.
   */
  position?: number
  /**
   * Text at the rule. On a vertical rule it sits to the right, or to the left when it wouldn't
   * fit before the chart's right edge and does fit inside the plot on that side.
   */
  label?: string
  labelPosition?: 'start' | 'end'
  variant?: 'line' | 'tick'
  /** Length of the tick variant in px. Default 16. */
  tickLength?: number
  /**
   * The value scale `y` is on. Default 'y'. On `'y2'`, `y` is a number: that scale is linear.
   * It has no effect on an `x` rule when the chart has a `y2`, and with no `y2` it removes the
   * rule, with a warning.
   */
  scale?: ValueScale
}

export function Target({
  x,
  y,
  position,
  label,
  labelPosition = 'end',
  variant = 'line',
  tickLength = 16,
  scale,
}: TargetProps) {
  const ctx = valueContext(useChartContext('Target'), scale)
  if (!ctx) return null
  const horizontal = y !== undefined
  const raw = horizontal ? y : x
  const resolved = horizontal ? ctx.y : ctx.x
  if (raw === undefined) {
    if (DEV) ctx.warn('target-value', 'Target needs an `x` or `y` value.')
    return null
  }
  let pos: number
  if (resolved.kind === 'linear' || resolved.kind === 'time') {
    if (DEV && position !== undefined) {
      ctx.warn(
        'target-position',
        '`position` only applies on a band or point scale and was ignored.',
      )
    }
    const value =
      resolved.kind === 'time'
        ? (toTime(raw) ?? Number.NaN)
        : typeof raw === 'number'
          ? raw
          : Number.NaN

    const [d0, d1] = resolved.scale.domain()
    if (!Number.isFinite(value) || value < Math.min(d0, d1) || value > Math.max(d0, d1)) {
      if (DEV) {
        ctx.warn(
          'target-domain',
          `Target value ${String(raw)} is outside the chart domain and was not drawn.`,
        )
      }
      return null
    }
    pos = resolved.scale(value)
  } else {
    const center = categoryCenter(resolved, raw)
    if (center === undefined) {
      if (DEV) {
        ctx.warn(
          'target-category',
          `Target category ${String(raw)} is not on the chart axis and was not drawn.`,
        )
      }
      return null
    }
    let fraction = position ?? 0.5
    if (!(fraction >= 0 && fraction <= 1)) {
      if (DEV) {
        ctx.warn(
          'target-position',
          `Target position ${String(position)} is outside 0 to 1 and was clamped.`,
        )
      }
      fraction = Math.min(1, Math.max(0, fraction || 0))
    }
    const length = horizontal ? ctx.innerHeight : ctx.innerWidth
    pos = Math.min(length, Math.max(0, center + (fraction - 0.5) * categoryStep(resolved)))
  }
  const half = tickLength / 2
  const atEnd = labelPosition === 'end'
  let line: { x1: number; x2: number; y1: number; y2: number }
  if (horizontal) {
    const mid = ctx.innerWidth / 2
    line =
      variant === 'line'
        ? { x1: 0, x2: ctx.innerWidth, y1: pos, y2: pos }
        : { x1: mid - half, x2: mid + half, y1: pos, y2: pos }
  } else {
    const mid = ctx.innerHeight / 2
    line =
      variant === 'line'
        ? { x1: pos, x2: pos, y1: 0, y2: ctx.innerHeight }
        : { x1: pos, x2: pos, y1: mid - half, y2: mid + half }
  }

  let text = null
  if (label && horizontal) {
    text = (
      <text
        data-ch-part="target-label"
        x={atEnd ? ctx.innerWidth : 0}
        y={pos - 6}
        textAnchor={atEnd ? 'end' : 'start'}
      >
        {label}
      </text>
    )
  } else if (label) {
    // A label that would pass the chart's right edge moves to the other side of the rule, unless
    // it would then leave the plot on the left, where the axis labels are.
    const room = estimateWidth({ label } as Tick) + 6
    const flip = pos + room > ctx.innerWidth + ctx.margin.right && pos >= room
    text = (
      <text
        data-ch-part="target-label"
        x={flip ? pos - 6 : pos + 6}
        y={atEnd ? 0 : ctx.innerHeight}
        textAnchor={flip ? 'end' : 'start'}
        dominantBaseline={atEnd ? 'hanging' : 'auto'}
      >
        {label}
      </text>
    )
  }

  return (
    <g data-ch-part="target-group">
      <line data-ch-part="target" data-ch-variant={variant} {...line} />
      {text}
    </g>
  )
}
