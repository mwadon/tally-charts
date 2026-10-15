import { toFieldGetter } from '../../core/accessor'
import { linePath } from '../../core/line'
import { round2 } from '../../core/path'
import type { Accessor, Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { useChart } from '../context'
import { seriesScales } from './series'

export type LineDots = 'filled' | 'hollow' | 'none'

export interface LineProps<D> {
  /** Defaults to <Chart data>. */
  data?: readonly D[]
  /** Category or date field. Defaults to the field on <Chart x>. */
  x?: Accessor<D, string | number | Date>
  /** Value field. Defaults to the field on <Chart y>. */
  y?: Accessor<D, number>
  /** Default 'accent'. */
  tone?: Tone
  /** Dashed stroke, e.g. for a forecast. Default false. */
  dashed?: boolean
  /** A dot at each value. Default 'filled'. */
  dots?: LineDots
  /** Dot radius in px. Default 4. */
  radius?: number
}

/**
 * Straight segments through the category centres of a point or band x scale, or through the
 * dates on a time scale, in data order. A missing value breaks the line. The dot whose x equals
 * the chart's active id gets a ring (a category as a string, a date as its ISO string), so a
 * chart that registers one point per x lights every line at that x.
 */
export function Line<D>({
  data,
  x,
  y,
  tone = 'accent',
  dashed = false,
  dots = 'filled',
  radius = 4,
}: LineProps<D>) {
  const ctx = useChart('Line')
  const scales = seriesScales(ctx, 'Line')
  if (!scales) return null
  const getX = toFieldGetter(x) ?? ctx.x.field
  const getY = toFieldGetter(y) ?? ctx.y.field
  if (!getX || !getY) {
    if (DEV) {
      ctx.warn(
        'line-fields',
        'Line needs x and y fields: pass them to <Line> or set `field` on <Chart x/y>.',
      )
    }
    return null
  }
  const rows = (data ?? ctx.data) as readonly D[]
  const points = rows.map((d, index) => {
    const category = getX(d, index)
    return {
      index,
      key: scales.key(category),
      x: scales.x(category),
      y: scales.y(getY(d, index)),
    }
  })
  const path = linePath(points)
  const shown =
    dots === 'none' ? [] : points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  const active =
    ctx.activeId === null ? undefined : shown.find((p) => p.key === String(ctx.activeId))
  const r = Math.max(0, radius)
  const color = `var(--ch-${tone})`
  const hollow = dots === 'hollow'
  return (
    <g data-ch-part="line-group" data-ch-tone={tone}>
      {path ? (
        <path
          data-ch-part="line"
          data-ch-dashed={dashed ? 'true' : undefined}
          d={path}
          style={{ stroke: color }}
        />
      ) : null}
      {shown.map((p) => (
        <circle
          key={p.index}
          data-ch-part="line-dot"
          data-ch-hollow={hollow ? 'true' : undefined}
          cx={round2(p.x)}
          cy={round2(p.y)}
          r={r}
          style={hollow ? { stroke: color } : { fill: color }}
        />
      ))}
      {active ? (
        <circle
          data-ch-part="dot-ring"
          cx={round2(active.x)}
          cy={round2(active.y)}
          r={r + 3}
          style={{ stroke: color }}
        />
      ) : null}
    </g>
  )
}
