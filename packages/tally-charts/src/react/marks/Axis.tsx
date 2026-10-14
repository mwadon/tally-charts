import type { FormatPreset } from '../../core/format'
import { bandTicks, linearTicks, type Tick, type TickSpec, thinTicks } from '../../core/ticks'
import { useChart } from '../context'

export type AxisSide = 'bottom' | 'top' | 'left' | 'right'
export type AxisFormat = FormatPreset | ((value: string | number) => string)

export interface AxisProps {
  side: AxisSide
  ticks?: TickSpec
  format?: AxisFormat
  /** Drop labels that would overlap. Default true. */
  thin?: boolean
  /** Distance between the plot edge and the labels in px. Default 8. */
  offset?: number
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

export function Axis({ side, ticks: spec = 'all', format, thin = true, offset = 8 }: AxisProps) {
  const ctx = useChart('Axis')
  const horizontal = side === 'bottom' || side === 'top'
  const resolved = horizontal ? ctx.x : ctx.y
  const custom = typeof format === 'function' ? format : undefined
  const numeric = ctx.format(typeof format === 'string' ? format : 'number')

  const raw =
    resolved.kind === 'band'
      ? bandTicks(resolved.scale, spec, (v) => (custom ? custom(v) : v), {
          anchorEnds: horizontal,
        })
      : linearTicks(resolved.scale, spec, (v) => (custom ? custom(v) : numeric(v)))
  const ticks = thin ? thinTicks(raw, horizontal ? undefined : () => LABEL_HEIGHT) : raw

  return (
    <g data-ch-part="axis" data-ch-side={side}>
      {ticks.map((tick) => (
        <text
          key={`${tick.value}`}
          data-ch-part="axis-label"
          {...place(side, tick, ctx.innerWidth, ctx.innerHeight, offset)}
        >
          {tick.label}
        </text>
      ))}
    </g>
  )
}
