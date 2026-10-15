import { clampToRange } from '../../core/linear'
import { toNumber } from '../../core/number'
import { categoryCenter } from '../../core/scale'
import { DEV } from '../../core/warn'
import type { ChartContextValue } from '../context'

/** Pixel positions for marks that draw values along x, such as `Line` and `Band`. */
export interface SeriesScales {
  /** Plot x of a category; NaN when the scale doesn't know it. */
  x: (value: unknown) => number
  /** Plot y of a value, clamped into the plot; NaN when the value is missing. */
  y: (value: unknown) => number
  /**
   * The point id an x value gets: the category as a string, so a chart that registers one point
   * per x (as LineChart does) lights the matching dots.
   */
  key: (value: unknown) => string
}

/**
 * The shared scale guard of `Line` and `Band`: a point or band scale on x and a linear scale on
 * y. Otherwise it warns once per chart and returns undefined, and the mark draws nothing.
 */
export function seriesScales(
  ctx: ChartContextValue,
  mark: 'Line' | 'Band',
): SeriesScales | undefined {
  const { x, y } = ctx
  if (x.kind === 'linear' || y.kind !== 'linear') {
    if (DEV) {
      ctx.warn(
        `${mark.toLowerCase()}-scales`,
        `${mark} needs a point or band scale on <Chart x> and a linear scale on <Chart y>.`,
      )
    }
    return undefined
  }
  const linear = y.scale
  return {
    x: (value) => categoryCenter(x, value) ?? Number.NaN,
    y: (value) => {
      const v = toNumber(value)
      return Number.isFinite(v) ? clampToRange(linear, linear(v)) : Number.NaN
    },
    key: String,
  }
}
