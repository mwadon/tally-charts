import { resolveAccessor, toFieldGetter } from '../../core/accessor'
import { bandPath } from '../../core/line'
import type { Accessor, Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { useChartContext } from '../context'
import { toneVar } from '../ui/util'
import { seriesScales } from './series'

export interface BandProps<D> {
  /** Defaults to <Chart data>. */
  data?: readonly D[]
  /** Category or date field. Defaults to the field on <Chart x>. */
  x?: Accessor<D, string | number | Date>
  low: Accessor<D, number>
  high: Accessor<D, number>
  /** Default 'accent'. */
  tone?: Tone
}

/** A soft area between `low` and `high` at each category or date, e.g. a likely range. Gaps break it. */
export function Band<D>({ data, x, low, high, tone = 'accent' }: BandProps<D>) {
  const ctx = useChartContext('Band')
  const scales = seriesScales(ctx, 'Band')
  if (!scales) return null
  const getX = toFieldGetter(x) ?? ctx.x.field
  if (!getX) {
    if (DEV) {
      ctx.warn(
        'band-fields',
        'Band needs an x field: pass `x` to <Band> or set `field` on <Chart x>.',
      )
    }
    return null
  }
  const getLow = resolveAccessor(low)
  const getHigh = resolveAccessor(high)
  const rows = (data ?? ctx.data) as readonly D[]
  const d = bandPath(
    rows.map((row, i) => ({
      x: scales.x(getX(row, i)),
      low: scales.y(getLow(row, i)),
      high: scales.y(getHigh(row, i)),
    })),
  )
  if (!d) return null
  return <path data-ch-part="band" data-ch-tone={tone} d={d} style={toneVar(tone)} />
}
