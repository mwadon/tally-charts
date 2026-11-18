import { useMemo } from 'react'
import { resolveAccessor } from '../../core/accessor'
import { createDateFormatter, isDateFormat } from '../../core/date'
import { categoryCenter, categoryStep, type TimeScaleSpec } from '../../core/scale'
import { DAY, type TimeInput, toTime } from '../../core/time'
import type { Accessor } from '../../core/types'
import { DEV, type Warn } from '../../core/warn'
import { useLocale } from '../ChartsProvider'
import type { InternalChartContext } from '../context'
import type { DataTableColumn } from '../DataTable'
import type { AxisFormat } from '../marks/Axis'
import { timeX } from '../marks/series'
import { type ChartMessages, HEADER_CATEGORY, HEADER_DATE } from '../messages'
import { headerOf, toNumber } from './shared'

/**
 * The `x` prop of a chart with one point per x: an accessor puts categories on a point scale, a
 * time scale spec with a `field` puts dates on a time axis.
 */
export type XProp<D> =
  | Accessor<D, string | number>
  | (TimeScaleSpec<D> & { field: Accessor<D, TimeInput> })

/** One row per x, in axis order. */
export interface XRow<D> {
  /** Point id: the category as a string, or the date as an ISO string. */
  key: string
  /** Epoch ms on a time axis; NaN on a category axis. */
  time: number
  /** The x as people read it: the formatted category or date (the key until `useXLabels`). */
  label: string
  datum: D
  index: number
  /** One value per getter, NaN when missing. */
  values: number[]
  /** A skipped row followed this one in data order: marks break after it. */
  gapAfter?: boolean
}

/** The time scale spec of `x`, or undefined on a category axis. */
export function timeSpecOf<D>(x: XProp<D>) {
  return typeof x === 'object' ? x : undefined
}

/** The smallest distance between neighbouring sorted values; Infinity for fewer than two. */
export function minGap(values: readonly number[]): number {
  return values.reduce(
    (gap, v, i) => (i ? Math.min(gap, v - (values[i - 1] as number)) : gap),
    Number.POSITIVE_INFINITY,
  )
}

/**
 * Rows keyed by x, one value per getter (NaN when not a finite number). A row with a missing x
 * (or, on a time axis, an x that is not a date) is skipped with a `${prefix}-x-missing` warning
 * and marks a gap after the row before it in data order; a repeated x is skipped with a
 * `${prefix}-x-repeated` warning. On a time axis rows are sorted by date (stable).
 */
export function buildXRows<D>(
  data: readonly D[],
  x: XProp<D>,
  getters: readonly Accessor<D, unknown>[],
  warn: Warn,
  chart: string,
  prefix: string,
): XRow<D>[] {
  const time = timeSpecOf(x)
  const getX = resolveAccessor(time ? time.field : (x as Accessor<D, string | number>))
  const get = getters.map((g) => resolveAccessor(g))
  const seen = new Set<string>()
  let previous: XRow<D> | undefined
  const all = data.flatMap((d, i): XRow<D>[] => {
    const raw = getX(d, i)
    const t = time ? toTime(raw) : Number.NaN
    const key =
      t === undefined
        ? ''
        : time
          ? new Date(t).toISOString()
          : raw === null || raw === undefined
            ? ''
            : String(raw)
    if (key === '') {
      if (DEV) {
        warn(
          `${prefix}-x-missing`,
          time
            ? `${chart} skipped an x value that is not a date at index ${i}.`
            : `${chart} skipped a missing x value at index ${i}.`,
        )
      }
      if (previous) previous.gapAfter = true
      return []
    }
    if (seen.has(key)) {
      if (DEV) {
        warn(`${prefix}-x-repeated`, `${chart} skipped a repeated x value "${key}" at index ${i}.`)
      }
      return []
    }
    seen.add(key)
    const row: XRow<D> = {
      key,
      time: t ?? Number.NaN,
      label: key,
      datum: d,
      index: i,
      values: get.map((g) => toNumber(g(d, i))),
    }
    previous = row
    return [row]
  })
  // Dates draw and step left to right, whatever order the data has. Sort is stable.
  return time ? all.sort((a, b) => a.time - b.time) : all
}

/**
 * `rows` with `label` set to the x as people read it, shared by the axis, the tooltip,
 * announcements and the table: `xAxisFormat` (a function, or a date format on a time axis),
 * otherwise the category itself or 'auto' dates in the provider's locale and the spec's zone.
 */
export function useXLabels<D>(
  rows: readonly XRow<D>[],
  x: XProp<D>,
  xAxisFormat: AxisFormat | undefined,
): XRow<D>[] {
  const { locale } = useLocale()
  const time = timeSpecOf(x)
  const zone = time?.zone ?? 'utc'
  return useMemo(() => {
    let label: (row: XRow<D>) => string
    if (typeof xAxisFormat === 'function') {
      label = (row) => xAxisFormat(time ? new Date(row.time) : row.key)
    } else if (!time) {
      label = (row) => row.key
    } else {
      const step = minGap(rows.map((r) => r.time))
      const date = createDateFormatter(isDateFormat(xAxisFormat) ? xAxisFormat : 'auto', {
        locale,
        zone,
        step: Number.isFinite(step) ? step : DAY,
      })
      label = (row) => date(row.time)
    }
    return rows.map((r) => ({ ...r, label: label(r) }))
  }, [rows, xAxisFormat, time, locale, zone])
}

/**
 * `rows` with a row of no values after each row a skipped one followed. It has a valid x, so
 * marks don't warn, and its NaN values break their paths.
 */
export function withBreaks<D>(rows: readonly XRow<D>[]): XRow<D>[] {
  return rows.flatMap((row) => (row.gapAfter ? [row, { ...row, values: [] }] : [row]))
}

/** The `<Chart x>` spec for rows from `buildXRows`. */
export function xScaleOf<D>(x: XProp<D>) {
  const time = timeSpecOf(x)
  return time
    ? ({
        type: 'time',
        field: 'time',
        domain: time.domain,
        nice: time.nice,
        zone: time.zone ?? 'utc',
      } as const)
    : ({ type: 'point', field: 'key' } as const)
}

/** The data-table column of the x: the row's label, headed by the x field's name. */
export function xColumn<D>(
  x: XProp<D>,
  messages: Partial<ChartMessages>,
): DataTableColumn<XRow<D>> {
  const time = timeSpecOf(x)
  return {
    header: time
      ? headerOf(time.field, messages.headerDate ?? HEADER_DATE)
      : headerOf(x, messages.headerCategory ?? HEADER_CATEGORY),
    value: (r) => r.label,
  }
}

/**
 * Plot x of a row. Undefined for a date outside the domain: such a row is neither drawn nor
 * registered, so the pointer and keys can't reach it.
 */
export function rowX<D>(
  ctx: InternalChartContext,
  row: XRow<D>,
  chart: string,
): number | undefined {
  const scale = ctx.x
  return scale.kind === 'time'
    ? timeX(ctx, scale.scale, row.time, chart)
    : categoryCenter(scale, row.key)
}

/**
 * `NearestPointer` radius for points at `xs` (plot x, sorted): half the smallest gap between
 * neighbouring x values, at least 12 px. Categories are a step apart, dates can be anything.
 */
export function snapRadius(ctx: InternalChartContext, xs: readonly number[]): number {
  const gap = ctx.x.kind === 'time' ? minGap(xs) : categoryStep(ctx.x)
  return Math.max(12, Number.isFinite(gap) ? gap / 2 : 0)
}
