import { useChart } from '../context'

export interface TargetProps {
  /** Draws a vertical rule at this x value. */
  x?: number
  /** Draws a horizontal rule at this y value. */
  y?: number
  label?: string
  labelPosition?: 'start' | 'end'
  variant?: 'line' | 'tick'
  /** Length of the tick variant in px. Default 16. */
  tickLength?: number
}

export function Target({
  x,
  y,
  label,
  labelPosition = 'end',
  variant = 'line',
  tickLength = 16,
}: TargetProps) {
  const ctx = useChart('Target')
  const horizontal = y !== undefined
  const value = horizontal ? y : x
  const resolved = horizontal ? ctx.y : ctx.x
  if (value === undefined) {
    ctx.warn('target-value', 'Target needs an `x` or `y` value.')
    return null
  }
  if (resolved.kind !== 'linear') {
    ctx.warn('target-scale', 'Target needs a linear scale on the axis it marks.')
    return null
  }

  const pos = resolved.scale(value)
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
    text = (
      <text
        data-ch-part="target-label"
        x={pos + 6}
        y={atEnd ? 0 : ctx.innerHeight}
        textAnchor="start"
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
