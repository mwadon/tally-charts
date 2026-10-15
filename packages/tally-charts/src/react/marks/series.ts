import { clampToRange } from '../../core/linear'
import { toNumber } from '../../core/number'
import { categoryCenter } from '../../core/scale'
import { type TimeScale, toTime } from '../../core/time'
import { DEV } from '../../core/warn'
import type { InternalChartContext } from '../context'

/** Pixel positions for marks that draw values along x, such as `Line` and `Band`. */
export interface SeriesScales {
  /** Plot x of a category or date; NaN when the scale can't place it. */
  x: (value: unknown) => number
  /** Plot y of a value, clamped into the plot; NaN when the value is missing. */
  y: (value: unknown) => number
  /**
   * The point id an x value gets: the category as a string, or the date as an ISO string, so a
   * chart that registers one point per x (as LineChart does) lights the matching dots.
   */
  key: (value: unknown) => string
}

/**
 * The shared scale guard of `Line` and `Band`: a point, band or time scale on x and a linear
 * scale on y. Otherwise it warns once per chart and returns undefined, and the mark draws
 * nothing. On a time scale, x values `toTime` rejects are skipped with one warning per chart.
 */
export function seriesScales(
  ctx: InternalChartContext,
  mark: 'Line' | 'Band',
): SeriesScales | undefined {
  const { x, y } = ctx
  if (x.kind === 'linear' || y.kind !== 'linear') {
    if (DEV) {
      ctx.warn(
        `${mark.toLowerCase()}-scales`,
        `${mark} needs a point, band or time scale on <Chart x> and a linear scale on <Chart y>.`,
      )
    }
    return undefined
  }
  const linear = y.scale
  const yOf = (value: unknown) => {
    const v = toNumber(value)
    return Number.isFinite(v) ? clampToRange(linear, linear(v)) : Number.NaN
  }
  if (x.kind === 'time') {
    return {
      x: (value) => timeX(ctx, x.scale, value, mark) ?? Number.NaN,
      y: yOf,
      key: (value) => {
        const t = toTime(value)
        return t === undefined ? '' : new Date(t).toISOString()
      },
    }
  }
  return {
    x: (value) => categoryCenter(x, value) ?? Number.NaN,
    y: yOf,
    key: String,
  }
}

/**
 * Plot x of a date on a time scale. Undefined, with one warning per chart, for a value that is
 * not a date or a date outside the scale's domain, so marks treat it as missing and never draw
 * outside the plot.
 */
export function timeX(
  ctx: InternalChartContext,
  scale: TimeScale,
  value: unknown,
  mark: string,
): number | undefined {
  const t = toTime(value)
  const [d0, d1] = scale.domain()
  if (t !== undefined && t >= d0 && t <= d1) return scale(t)
  if (DEV) {
    if (t === undefined) {
      ctx.warn('x-time-value', `${mark} skipped an x value that is not a date: ${String(value)}.`)
    } else {
      ctx.warn(
        'x-time-outside',
        `${mark} skipped a date outside the x domain: ${new Date(t).toISOString()}.`,
      )
    }
  }
  return undefined
}
