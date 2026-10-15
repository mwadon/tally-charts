import { useId } from 'react'
import { toFieldGetter } from '../../core/accessor'
import { areaPath } from '../../core/area'
import { toNumber } from '../../core/number'
import { toTime } from '../../core/time'
import type { Accessor, Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { useChartContext } from '../context'

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
}

/**
 * A soft gradient area through the band centres, or through the dates on a time scale, e.g.
 * joining the tops of bridge columns.
 */
export function Area<D>({
  data,
  x,
  y,
  tone = 'accent',
  opacity = 0.22,
  between = false,
}: AreaProps<D>) {
  const ctx = useChartContext('Area')
  const gradientId = `${ctx.chartId}-area-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
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
  const startOf = (value: unknown): number | undefined => {
    if (xScale.kind === 'band') return xScale.scale(String(value))
    const t = toTime(value)
    if (t === undefined) {
      if (DEV) {
        ctx.warn('x-time-value', `Area skipped an x value that is not a date: ${String(value)}.`)
      }
      return undefined
    }
    return xScale.scale(t)
  }
  const rows = (data ?? ctx.data) as readonly D[]
  const columns = rows.flatMap((d, i) => {
    const start = startOf(getX(d, i))
    const value = toNumber(getY(d, i))
    if (start === undefined || !Number.isFinite(value)) return []
    return [{ start, y: clamp(linear(value)) }]
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
  return (
    <g data-ch-part="area-group">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: `var(--ch-${tone})`, stopOpacity: opacity }} />
          <stop offset="1" style={{ stopColor: `var(--ch-${tone})`, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path data-ch-part="area" data-ch-tone={tone} d={path} fill={`url(#${gradientId})`} />
    </g>
  )
}
