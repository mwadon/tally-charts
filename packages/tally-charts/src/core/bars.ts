import type { ScaleBand } from 'd3-scale'
import type { FieldGetter } from './accessor'
import type { LinearScale } from './linear'
import type { ResolvedScale } from './scale'
import type { Id } from './types'
import { DEV, type Warn } from './warn'

export type BarOrientation = 'vertical' | 'horizontal'
export type BarDirection = 'up' | 'down' | 'right' | 'left'

export interface BarRect {
  id: Id
  index: number
  datum: unknown
  category: string
  value: number
  x: number
  y: number
  width: number
  height: number
  dir: BarDirection
  /** Centre of the bar's outer end; tooltips and value labels attach here. */
  anchor: { x: number; y: number }
}

export interface BarLayout {
  orientation: BarOrientation
  bars: BarRect[]
}

export interface BarLayoutInput {
  data: readonly unknown[]
  ids: readonly Id[]
  x: ResolvedScale
  y: ResolvedScale
  getX: FieldGetter
  getY: FieldGetter
  warn: Warn
  /** Names the value field in the missing-value warning. Defaults to the value axis letter. */
  valueField?: string
}

export function computeBars(input: BarLayoutInput): BarLayout {
  const { x, y } = input
  if (x.kind === 'band' && y.kind === 'linear') {
    return layoutBars(input, x.scale, y.scale, input.getX, input.getY, 'vertical')
  }
  if (y.kind === 'band' && x.kind === 'linear') {
    return layoutBars(input, y.scale, x.scale, input.getY, input.getX, 'horizontal')
  }
  if (DEV) input.warn('bars-scales', 'Bars need one band scale and one linear scale on <Chart>.')
  return { orientation: 'vertical', bars: [] }
}

function layoutBars(
  input: BarLayoutInput,
  band: ScaleBand<string>,
  linear: LinearScale,
  getCategory: FieldGetter,
  getValue: FieldGetter,
  orientation: BarOrientation,
): BarLayout {
  const [d0, d1] = linear.domain()
  const base = linear(Math.min(Math.max(0, Math.min(d0, d1)), Math.max(d0, d1)))
  const [r0, r1] = linear.range()
  const lo = Math.min(r0, r1)
  const hi = Math.max(r0, r1)
  const thickness = band.bandwidth()
  const bars: BarRect[] = []
  const valueField = input.valueField ?? (orientation === 'vertical' ? 'y' : 'x')

  for (const [index, datum] of input.data.entries()) {
    const category = String(getCategory(datum, index))
    const start = band(category)
    if (start === undefined) continue
    const raw = getValue(datum, index)
    const value = raw === null || raw === undefined ? Number.NaN : Number(raw)
    if (!Number.isFinite(value)) {
      if (DEV) {
        input.warn(
          'bars-value',
          `Bars skipped a missing or non-numeric value for field "${valueField}" at index ${index}.`,
        )
      }
      continue
    }
    // Keep geometry inside the plot when a value falls outside an explicit domain.
    const end = Math.min(hi, Math.max(lo, linear(value)))
    const from = Math.min(base, end)
    const length = Math.abs(end - base)
    const id = input.ids[index] ?? index
    // Direction follows the drawn geometry; a zero-length bar falls back to the value's sign.
    const towardStart = orientation === 'vertical' ? end < base : end > base
    const towardEnd = orientation === 'vertical' ? end > base : end < base
    const negative = towardEnd || (!towardStart && value < 0)
    if (orientation === 'vertical') {
      bars.push({
        id,
        index,
        datum,
        category,
        value,
        x: start,
        y: from,
        width: thickness,
        height: length,
        dir: negative ? 'down' : 'up',
        anchor: { x: start + thickness / 2, y: negative ? from + length : from },
      })
    } else {
      bars.push({
        id,
        index,
        datum,
        category,
        value,
        x: from,
        y: start,
        width: length,
        height: thickness,
        dir: negative ? 'left' : 'right',
        anchor: { x: negative ? from : from + length, y: start + thickness / 2 },
      })
    }
  }

  return { orientation, bars }
}
