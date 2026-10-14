import { resolveAccessor, toFieldGetter } from '../../core/accessor'
import { bandPath } from '../../core/line'
import { clampToRange } from '../../core/linear'
import { toNumber } from '../../core/number'
import { categoryCenter } from '../../core/scale'
import type { Accessor, Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { useChart } from '../context'
import { toneVar } from '../ui/util'

export interface BandProps<D> {
  /** Defaults to <Chart data>. */
  data?: readonly D[]
  /** Category field. Defaults to the field on <Chart x>. */
  x?: Accessor<D, string | number>
  low: Accessor<D, number>
  high: Accessor<D, number>
  /** Default 'accent'. */
  tone?: Tone
}

/** A soft area between `low` and `high` at each category, e.g. a likely range. Gaps break it. */
export function Band<D>({ data, x, low, high, tone = 'accent' }: BandProps<D>) {
  const ctx = useChart('Band')
  if (ctx.x.kind === 'linear' || ctx.y.kind !== 'linear') {
    if (DEV) {
      ctx.warn(
        'band-scales',
        'Band needs a point or band scale on <Chart x> and a linear scale on <Chart y>.',
      )
    }
    return null
  }
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
  const xScale = ctx.x
  const linear = ctx.y.scale
  const px = (raw: unknown) => {
    const v = toNumber(raw)
    return Number.isFinite(v) ? clampToRange(linear, linear(v)) : Number.NaN
  }
  const rows = (data ?? ctx.data) as readonly D[]
  const d = bandPath(
    rows.map((row, i) => ({
      x: categoryCenter(xScale, getX(row, i)) ?? Number.NaN,
      low: px(getLow(row, i)),
      high: px(getHigh(row, i)),
    })),
  )
  if (!d) return null
  return <path data-ch-part="band" data-ch-tone={tone} d={d} style={toneVar(tone)} />
}
