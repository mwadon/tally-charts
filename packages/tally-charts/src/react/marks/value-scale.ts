import { DEV } from '../../core/warn'
import type { InternalChartContext, ValueScale } from '../context'

/**
 * The chart context a mark draws with, so its geometry only ever reads `ctx.y`: the same object for
 * `'y'`, and a copy with `y` swapped for `y2` for `'y2'`. Without a `y2` on the chart it warns once
 * and returns undefined, and the mark draws nothing.
 */
export function valueContext(
  ctx: InternalChartContext,
  scale: ValueScale | undefined,
): InternalChartContext | undefined {
  if (scale !== 'y2') return ctx
  if (ctx.y2) return { ...ctx, y: ctx.y2 }
  if (DEV) {
    ctx.warn('y2-missing', 'A mark with `scale="y2"` needs a linear <Chart y2>; it was not drawn.')
  }
  return undefined
}
