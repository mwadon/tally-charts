import { toFieldGetter } from '../../core/accessor'
import { computeBars } from '../../core/bars'
import type { FormatSpec } from '../../core/format'
import type { Accessor } from '../../core/types'
import { useChartContext } from '../context'

export interface ValueLabelProps<D> {
  /** Defaults to <Chart data>. */
  data?: readonly D[]
  at?: 'first' | 'last' | 'all' | number
  x?: Accessor<D, string | number>
  y?: Accessor<D, string | number>
  format?: FormatSpec
  /** Gap between the bar end and the label in px. Default 6. */
  offset?: number
}

/** Value text at the outer end of bars, computed from the same geometry as <Bars>. */
const LABEL_HEIGHT = 14

export function ValueLabel<D>({ data, at = 'all', x, y, format, offset = 6 }: ValueLabelProps<D>) {
  const ctx = useChartContext('ValueLabel')
  const getX = toFieldGetter(x) ?? ctx.x.field
  const getY = toFieldGetter(y) ?? ctx.y.field
  if (!getX || !getY) return null
  const { orientation, bars } = computeBars({
    data: data ?? ctx.data,
    ids: [],
    x: ctx.x,
    y: ctx.y,
    getX,
    getY,
    warn: ctx.warn,
  })
  const selected =
    at === 'all'
      ? bars
      : at === 'first'
        ? bars.slice(0, 1)
        : at === 'last'
          ? bars.slice(-1)
          : bars.filter((bar) => bar.index === at)
  const fmt = ctx.format(format)

  return (
    <g data-ch-part="value-labels">
      {selected.map((bar) => {
        if (orientation === 'vertical') {
          // Outward from the bar end, unless that would push the label out of the plot.
          const below =
            bar.dir === 'down' && bar.anchor.y + offset + LABEL_HEIGHT <= ctx.innerHeight
          return (
            <text
              key={bar.index}
              data-ch-part="value-label"
              x={bar.anchor.x}
              y={below ? bar.anchor.y + offset : bar.anchor.y - offset}
              textAnchor="middle"
              dominantBaseline={below ? 'hanging' : 'auto'}
            >
              {fmt(bar.value)}
            </text>
          )
        }
        const left = bar.dir === 'left'
        return (
          <text
            key={bar.index}
            data-ch-part="value-label"
            x={left ? bar.anchor.x - offset : bar.anchor.x + offset}
            y={bar.anchor.y}
            textAnchor={left ? 'end' : 'start'}
            dominantBaseline="middle"
          >
            {fmt(bar.value)}
          </text>
        )
      })}
    </g>
  )
}
