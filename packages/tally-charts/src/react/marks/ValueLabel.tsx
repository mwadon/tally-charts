import { toFieldGetter } from '../../core/accessor'
import { computeBars } from '../../core/bars'
import type { FormatSpec } from '../../core/format'
import { estimateWidth } from '../../core/ticks'
import type { Accessor } from '../../core/types'
import { useChartContext, type ValueScale } from '../context'
import { valueContext } from './value-scale'

export interface ValueLabelProps<D> {
  /** Defaults to <Chart data>. */
  data?: readonly D[]
  /** Which bars get a label. 'max' labels the highest finite bar, the first one on a tie. */
  at?: 'first' | 'last' | 'all' | 'max' | number
  x?: Accessor<D, string | number>
  y?: Accessor<D, string | number>
  format?: FormatSpec
  /** Gap between the bar end and the label in px. Default 6. */
  offset?: number
  /**
   * 'pill' draws the label on a filled rounded rectangle (part `value-label-pill`), sized from the
   * text. The pill is 18 px tall and is clamped horizontally to the chart's width, not vertically:
   * on the tallest bar it sits above the plot. A `Chart` with its default 20 px top margin needs a
   * `margin.top` of at least 24 to fit it at the default offset. Default 'text'.
   */
  variant?: 'text' | 'pill'
  /** The value scale to draw on, and whose field `y` defaults to. Default 'y'. */
  scale?: ValueScale
}

const LABEL_HEIGHT = 14
const PILL_HEIGHT = 18
const PILL_PADDING = 8

/** Value text at the outer end of bars, computed from the same geometry as <Bars>. */
export function ValueLabel<D>({
  data,
  at = 'all',
  x,
  y,
  format,
  offset = 6,
  variant = 'text',
  scale,
}: ValueLabelProps<D>) {
  const ctx = valueContext(useChartContext('ValueLabel'), scale)
  if (!ctx) return null
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
          : at === 'max'
            ? bars.reduce<typeof bars>(
                (best, bar) => (!best[0] || bar.value > best[0].value ? [bar] : best),
                [],
              )
            : bars.filter((bar) => bar.index === at)
  const fmt = ctx.format(format)
  const pill = variant === 'pill'
  const minX = -ctx.margin.left
  const maxX = ctx.innerWidth + ctx.margin.right

  return (
    <g data-ch-part="value-labels">
      {selected.map((bar) => {
        if (pill) {
          const text = fmt(bar.value)
          const width =
            estimateWidth({ value: 0, position: 0, label: text, anchor: 'middle' }) +
            2 * PILL_PADDING
          const vertical = orientation === 'vertical'
          const left = bar.dir === 'left'
          const below =
            vertical && bar.dir === 'down' && bar.anchor.y + offset + PILL_HEIGHT <= ctx.innerHeight
          const wanted = vertical
            ? bar.anchor.x - width / 2
            : left
              ? bar.anchor.x - offset - width
              : bar.anchor.x + offset
          const rectX = Math.max(minX, Math.min(wanted, maxX - width))
          const rectY = vertical
            ? below
              ? bar.anchor.y + offset
              : bar.anchor.y - offset - PILL_HEIGHT
            : bar.anchor.y - PILL_HEIGHT / 2
          return (
            <g key={bar.index}>
              <rect
                data-ch-part="value-label-pill"
                x={rectX}
                y={rectY}
                width={width}
                height={PILL_HEIGHT}
              />
              <text
                data-ch-part="value-label"
                data-ch-variant="pill"
                x={rectX + width / 2}
                y={rectY + PILL_HEIGHT / 2}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {text}
              </text>
            </g>
          )
        }
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
