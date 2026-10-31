import { useId } from 'react'
import { toFieldGetter } from '../../core/accessor'
import { areaPath } from '../../core/area'
import { toNumber } from '../../core/number'
import type { Accessor, Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { useChartContext, type ValueScale } from '../context'
import { timeX } from './series'
import { valueContext } from './value-scale'

export interface AreaProps<D> {
  /** Defaults to <Chart data>. */
  data?: readonly D[]
  /** Band or date field. Defaults to the field on <Chart x>. */
  x?: Accessor<D, string | number | Date>
  /** Value field. Defaults to the field on <Chart y>. */
  y?: Accessor<D, number>
  /** Default 'accent'. */
  tone?: Tone
  /** Opacity at the top of the gradient; it fades to 0 at the baseline. Default 0.22. */
  opacity?: number
  /**
   * Fill only the gaps between bands, each from one band's far edge to the next band's near edge,
   * so bars drawn over the area keep their own fill. Default false: one area through the centres.
   */
  between?: boolean
  /** The value scale to draw on, and whose field `y` defaults to. Default 'y'. */
  scale?: ValueScale
}

/**
 * A soft gradient area through the band centres, or through the dates on a time scale, e.g.
 * joining the tops of bridge columns. A missing value or a date that is not on the scale breaks
 * the area, as it breaks a `Line`; a lone point between two breaks fills nothing.
 */
export function Area<D>({
  data,
  x,
  y,
  tone = 'accent',
  opacity = 0.22,
  between = false,
  scale,
}: AreaProps<D>) {
  const ctx = valueContext(useChartContext('Area'), scale)
  const id = useId()
  if (!ctx) return null
  const gradientId = `${ctx.chartId}-area-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const xScale = ctx.x
  if ((xScale.kind !== 'band' && xScale.kind !== 'time') || ctx.y.kind !== 'linear') {
    if (DEV)
      ctx.warn(
        'area-scales',
        'Area needs a band or time scale on <Chart x> and a linear scale on <Chart y>.',
      )
    return null
  }
  const getX = toFieldGetter(x) ?? ctx.x.field
  const getY = toFieldGetter(y) ?? ctx.y.field
  if (!getX || !getY) {
    if (DEV)
      ctx.warn(
        'area-fields',
        'Area needs x and y fields: pass them to <Area> or set `field` on <Chart x/y>.',
      )
    return null
  }
  const linear = ctx.y.scale
  const [r0, r1] = linear.range()
  const clamp = (px: number) => Math.min(Math.max(r0, r1), Math.max(Math.min(r0, r1), px))
  const [d0, d1] = linear.domain()
  const baseline = clamp(linear(Math.min(Math.max(0, Math.min(d0, d1)), Math.max(d0, d1))))
  // A date is a band of width 0 at its position.
  const size = xScale.kind === 'band' ? xScale.scale.bandwidth() : 0
  const startOf = (value: unknown): number | undefined =>
    xScale.kind === 'band'
      ? xScale.scale(String(value))
      : timeX(ctx, xScale.scale, value, 'Area', id)
  const rows = (data ?? ctx.data) as readonly D[]
  // An incomplete column is NaN, which breaks the area there.
  const columns = rows.map((d, i) => {
    const start = startOf(getX(d, i))
    const value = toNumber(getY(d, i))
    if (start === undefined || !Number.isFinite(value)) return { start: Number.NaN, y: Number.NaN }
    return { start, y: clamp(linear(value)) }
  })
  const path = between
    ? columns
        .slice(1)
        .map((b, i) => {
          const a = columns[i]
          return a
            ? areaPath(
                [
                  { x: a.start + size, y: a.y },
                  { x: b.start, y: b.y },
                ],
                baseline,
              )
            : ''
        })
        .join('')
    : areaPath(
        columns.map((c) => ({ x: c.start + size / 2, y: c.y })),
        baseline,
      )
  if (!path) return null
  // The fade runs toward the baseline. When the line is below it (negative values, or a reversed
  // scale whose baseline is the top edge) the gradient is turned over so the strong end stays
  // at the line.
  const flipped = baseline <= Math.min(...columns.map((c) => c.y).filter(Number.isFinite))
  return (
    <g data-ch-part="area-group">
      <defs>
        <linearGradient id={gradientId} x1="0" y1={flipped ? 1 : 0} x2="0" y2={flipped ? 0 : 1}>
          <stop offset="0" style={{ stopColor: `var(--ch-${tone})`, stopOpacity: opacity }} />
          <stop offset="1" style={{ stopColor: `var(--ch-${tone})`, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path data-ch-part="area" data-ch-tone={tone} d={path} fill={`url(#${gradientId})`} />
    </g>
  )
}
