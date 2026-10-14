import type { ScaleBand } from 'd3-scale'
import type { FieldGetter } from './accessor'
import type { LinearScale } from './linear'
import type { ResolvedScale } from './scale'
import type { Id } from './types'
import { DEV, type Warn } from './warn'

export type BarOrientation = 'vertical' | 'horizontal'
export type BarDirection = 'up' | 'down' | 'right' | 'left'
export type BarAlign = 'start' | 'center' | 'end'

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
  /** The whole band the bar sits in, along the band axis. Hit areas use it. */
  band: { start: number; size: number }
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
  /** Start value per row. Bars run from it to the value instead of from the zero baseline. */
  getFrom?: FieldGetter
  /** Bar thickness in px. Defaults to the band width and never exceeds it. */
  size?: number
  /** Where a bar thinner than its band sits. Default 'center'. */
  align?: BarAlign
  /** Extra shift along the band axis in px, applied after `align`. */
  offset?: number
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

function toNumber(raw: unknown): number {
  return raw === null || raw === undefined ? Number.NaN : Number(raw)
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
  const [r0, r1] = linear.range()
  const lo = Math.min(r0, r1)
  const hi = Math.max(r0, r1)
  // Keep geometry inside the plot when a value falls outside an explicit domain.
  const clamp = (px: number) => Math.min(hi, Math.max(lo, px))
  const zero = linear(Math.min(Math.max(0, Math.min(d0, d1)), Math.max(d0, d1)))
  const bandSize = band.bandwidth()
  const requested = input.size !== undefined && Number.isFinite(input.size) ? input.size : bandSize
  const thickness = Math.max(0, Math.min(requested, bandSize))
  const slack = bandSize - thickness
  const aligned = input.align === 'start' ? 0 : input.align === 'end' ? slack : slack / 2
  const shift = aligned + (input.offset ?? 0)
  const bars: BarRect[] = []
  const valueField = input.valueField ?? (orientation === 'vertical' ? 'y' : 'x')

  for (const [index, datum] of input.data.entries()) {
    const category = String(getCategory(datum, index))
    const bandStart = band(category)
    if (bandStart === undefined) continue
    const value = toNumber(getValue(datum, index))
    if (!Number.isFinite(value)) {
      if (DEV) {
        input.warn(
          'bars-value',
          `Bars skipped a missing or non-numeric value for field "${valueField}" at index ${index}.`,
        )
      }
      continue
    }
    const from = input.getFrom ? toNumber(input.getFrom(datum, index)) : Number.NaN
    const hasFrom = Number.isFinite(from)
    const base = hasFrom ? clamp(linear(from)) : zero
    const end = clamp(linear(value))
    const near = Math.min(base, end)
    const length = Math.abs(end - base)
    const start = bandStart + shift
    const id = input.ids[index] ?? index
    // Direction follows the drawn geometry; a zero-length bar falls back to the value's side
    // of its start value (or of zero).
    const towardStart = orientation === 'vertical' ? end < base : end > base
    const towardEnd = orientation === 'vertical' ? end > base : end < base
    const negative = towardEnd || (!towardStart && value < (hasFrom ? from : 0))
    const bandInfo = { start: bandStart, size: bandSize }
    if (orientation === 'vertical') {
      bars.push({
        id,
        index,
        datum,
        category,
        value,
        x: start,
        y: near,
        width: thickness,
        height: length,
        dir: negative ? 'down' : 'up',
        anchor: { x: start + thickness / 2, y: negative ? near + length : near },
        band: bandInfo,
      })
    } else {
      bars.push({
        id,
        index,
        datum,
        category,
        value,
        x: near,
        y: start,
        width: length,
        height: thickness,
        dir: negative ? 'left' : 'right',
        anchor: { x: negative ? near : near + length, y: start + thickness / 2 },
        band: bandInfo,
      })
    }
  }

  return { orientation, bars }
}
