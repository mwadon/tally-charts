import { linearTicks, type TickSpec } from '../../core/ticks'
import { DEV } from '../../core/warn'
import { useChart } from '../context'

export interface GridProps {
  /** Same as the y axis `ticks`. Default 'all' (about 5). */
  ticks?: TickSpec
  /** Value range to rule, like the axis `extent`. Default: the y domain. */
  extent?: readonly [number, number]
}

/** Horizontal lines across the plot at the y ticks. */
export function Grid({ ticks = 'all', extent }: GridProps) {
  const ctx = useChart('Grid')
  if (ctx.y.kind !== 'linear') {
    if (DEV) ctx.warn('grid-scale', 'Grid needs a linear scale on <Chart y>.')
    return null
  }
  const lines = linearTicks(ctx.y.scale, ticks, String, extent)
  return (
    <g data-ch-part="grid">
      {lines.map((tick) => (
        <line
          key={tick.value}
          data-ch-part="grid-line"
          x1={0}
          x2={ctx.innerWidth}
          y1={tick.position}
          y2={tick.position}
        />
      ))}
    </g>
  )
}
