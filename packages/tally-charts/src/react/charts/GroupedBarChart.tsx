import { useMemo } from 'react'
import { resolveAccessor, resolveIds, resolvePerItem } from '../../core/accessor'
import { groupSlots } from '../../core/bars'
import type { FormatSpec } from '../../core/format'
import { niceDomain } from '../../core/linear'
import { type BandScaleSpec, inferLinearDomain, type LinearScaleSpec } from '../../core/scale'
import { linearTicks, type TickSpec } from '../../core/ticks'
import type { Accessor, Fill, Id, PerItem, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { Chart, type ChartName } from '../Chart'
import { type Margin, useChartContext } from '../context'
import { Axis, type AxisFormat } from '../marks/Axis'
import { Bars } from '../marks/Bars'
import { Grid } from '../marks/Grid'
import { Target } from '../marks/Target'
import {
  type ChartPassThroughProps,
  type ChartTooltip,
  type DataTableOptions,
  toNumber,
} from './shared'

export interface BarSeries<D> {
  /** Stable key of the series; unique within the chart. */
  id: string
  /** Name for the tooltip, announcements and the data table header. */
  label: string
  value: Accessor<D, number>
  /** Default: the next tone of the default order: accent, accent-soft, warn, neutral, gain. */
  tone?: Tone
  /** Default 'solid'. */
  fill?: Fill
}

export type GroupedBarChartProps<D> = ChartName &
  ChartPassThroughProps<D> & {
    data: readonly D[]
    /** Category field: the band axis in both orientations. One row is one group. */
    x: Accessor<D, string | number>
    /** One bar per series in every group, in this order. */
    series: readonly BarSeries<D>[]
    /** Row id. A bar's id is `${rowId}:${series.id}`. Default: the data index. */
    id?: Accessor<D, Id>
    /** Category label for tooltips, announcements and the data table. Defaults to `x`. */
    label?: Accessor<D, string>
    /** Default 'vertical'. */
    orientation?: 'vertical' | 'horizontal'
    /** Value domain. Default: every series and the target, including zero, rounded to nice ticks. */
    domain?: readonly [number, number]
    /** A target value, optionally with a label. */
    target?: number | { value: number; label?: string }
    /**
     * Fill for every bar of a row, e.g. 'hatch' for a forecast period. `undefined` keeps each
     * series' own fill. Default: undefined.
     */
    fill?: PerItem<D, Fill | undefined>
    /** 'all' labels every bar when the labels fit. Default 'all'. */
    valueLabel?: 'all' | 'none'
    /** Format for value labels. Defaults to `format`. */
    valueFormat?: FormatSpec
    /** Format for tooltips, announcements and the data table. Default 'number'. */
    format?: FormatSpec
    /** Category axis ticks, or 'none'. Default: every category. */
    axis?: TickSpec | 'none'
    /**
     * Category axis labels: a function of the category. Number presets and date formats don't apply
     * to categories and are ignored with a development warning. Default: the category itself.
     */
    axisFormat?: AxisFormat
    /** Value axis ticks, or 'none'. Default: nice ticks. */
    valueAxis?: TickSpec | 'none'
    /** Value axis labels. Default: `format`. */
    valueAxisFormat?: AxisFormat
    /** Grid lines at the value ticks. Default true. */
    grid?: boolean
    /** Padding between groups, 0–1 of the step. Default 0.3. */
    padding?: number
    /** Gap between the bars of a group in px. Default 4. */
    gap?: number
    /**
     * Hidden data table for screen readers: `true`, `false`, or `{ caption, columns }` to set its
     * caption and rename column headers. Default true.
     */
    dataTable?: boolean | DataTableOptions
    /**
     * Tooltip on hover and focus: `true` for the default pill, or a function that renders the
     * content for a point (`point.datum` is your row). Default true.
     */
    tooltip?: ChartTooltip<D>
  }

const DEFAULT_TONES: readonly Tone[] = ['accent', 'accent-soft', 'warn', 'neutral', 'gain']
const BAR_THICKNESS = 16
const ROW_PADDING = 20

export function GroupedBarChart<D>({
  data,
  x,
  series,
  id,
  orientation = 'vertical',
  domain,
  target,
  fill,
  axis = 'all',
  axisFormat,
  valueAxis = 'all',
  valueAxisFormat,
  format,
  grid = true,
  padding = 0.3,
  gap = 4,
  margin,
  height,
  children,
  // Behaviour of these arrives with the points, labels, tooltip and table.
  label: _label,
  valueLabel: _valueLabel,
  valueFormat: _valueFormat,
  dataTable: _dataTable,
  tooltip: _tooltip,
  ...chart
}: GroupedBarChartProps<D>) {
  const warn = useMemo(() => createWarner(), [])
  const vertical = orientation === 'vertical'
  if (DEV) {
    if (series.length === 0) {
      warn(
        'grouped-series-empty',
        'GroupedBarChart needs at least one series; showing the empty state.',
      )
    }
    if (series.length > 4) {
      warn(
        'grouped-series-count',
        `GroupedBarChart has ${series.length} series; bars get thin above 4${series.length > 5 ? ' and tones repeat from 6' : ''}.`,
      )
    }
    const seen = new Set<string>()
    for (const s of series) {
      if (seen.has(s.id)) {
        warn('grouped-series-id', `GroupedBarChart has a repeated series id "${s.id}".`)
      }
      seen.add(s.id)
    }
  }

  const getters = useMemo(() => series.map((s) => resolveAccessor(s.value)), [series])
  const targetSpec = typeof target === 'number' ? { value: target } : target
  const targetValue = targetSpec?.value
  const valueTicks = typeof valueAxis === 'number' ? valueAxis : undefined
  const valueDomain = useMemo((): readonly [number, number] => {
    if (domain) return domain
    const values: number[] = []
    for (const getter of getters) {
      for (const [i, d] of data.entries()) values.push(toNumber(getter(d, i)))
    }
    if (targetValue !== undefined) values.push(targetValue)
    return niceDomain(inferLinearDomain(values, true), valueTicks)
  }, [domain, getters, data, targetValue, valueTicks])

  const band: BandScaleSpec<D> = { type: 'band', field: x, padding }
  const linear: LinearScaleSpec<D> = { domain: valueDomain }
  const showValueAxis = valueAxis !== 'none'
  const m: Margin = {
    ...(vertical
      ? { top: 24, right: 0, bottom: 28, left: showValueAxis ? 40 : 0 }
      : { top: 8, right: 48, bottom: showValueAxis ? 28 : 8, left: 96 }),
    ...margin,
  }
  const count = series.length
  const rows = Math.max(1, data.length)
  const autoHeight =
    !vertical && chart.aspectRatio === undefined
      ? rows * (count * BAR_THICKNESS + Math.max(0, count - 1) * gap + ROW_PADDING) +
        m.top +
        m.bottom
      : undefined
  const valueFmt: AxisFormat | undefined = valueAxisFormat ?? (format as AxisFormat | undefined)

  return (
    <Chart<D>
      {...chart}
      data={series.length === 0 ? [] : data}
      x={vertical ? band : linear}
      y={vertical ? linear : band}
      margin={m}
      height={height ?? autoHeight}
    >
      {grid && showValueAxis ? (
        vertical ? (
          <Grid ticks={valueAxis} />
        ) : (
          <VerticalGrid ticks={valueAxis} />
        )
      ) : null}
      {targetSpec ? (
        <Target
          {...(vertical ? { y: targetSpec.value } : { x: targetSpec.value })}
          label={targetSpec.label}
        />
      ) : null}
      <GroupedLayers<D>
        series={series}
        getters={getters}
        id={id}
        rowFill={fill}
        gap={gap}
        vertical={vertical}
      />
      {showValueAxis ? (
        <Axis side={vertical ? 'left' : 'bottom'} ticks={valueAxis} format={valueFmt} />
      ) : null}
      {axis === 'none' ? null : (
        <Axis side={vertical ? 'bottom' : 'left'} ticks={axis} format={axisFormat} />
      )}
      {children}
    </Chart>
  )
}

/** Vertical rules at the value ticks of a horizontal chart; `Grid` only rules a linear y. */
function VerticalGrid({ ticks }: { ticks: TickSpec }) {
  const ctx = useChartContext('GroupedBarChart')
  if (ctx.x.kind !== 'linear') return null
  const lines = linearTicks(ctx.x.scale, ticks, String)
  return (
    <g data-ch-part="grid">
      {lines.map((tick) => (
        <line
          key={tick.value}
          data-ch-part="grid-line"
          x1={tick.position}
          x2={tick.position}
          y1={0}
          y2={ctx.innerHeight}
        />
      ))}
    </g>
  )
}

interface GroupedLayersProps<D> {
  series: readonly BarSeries<D>[]
  getters: readonly ((d: D, i: number) => number)[]
  id: Accessor<D, Id> | undefined
  rowFill: PerItem<D, Fill | undefined> | undefined
  gap: number
  vertical: boolean
}

// Inside <Chart>: the slots need the band width, which only exists once the scale does.
function GroupedLayers<D>({ series, getters, id, rowFill, gap, vertical }: GroupedLayersProps<D>) {
  const ctx = useChartContext('GroupedBarChart')
  const data = ctx.data as readonly D[]
  const band = vertical ? ctx.x : ctx.y
  const bandwidth = band.kind === 'band' ? band.scale.bandwidth() : 0
  const slots = groupSlots(bandwidth, series.length, gap)
  const rowIds = useMemo(() => resolveIds(data, id, ctx.warn), [data, id, ctx.warn])
  const rowFillOf = useMemo(() => resolvePerItem(rowFill ?? undefined), [rowFill])
  return (
    <>
      {series.map((s, i) => {
        const getter = getters[i] as (d: D, i: number) => number
        const bars = {
          id: (_: D, j: number) => `${rowIds[j]}:${s.id}`,
          tone: s.tone ?? DEFAULT_TONES[i % DEFAULT_TONES.length],
          fill: (d: D, j: number, all: readonly D[]) =>
            (rowFillOf(d, j, all) as Fill | undefined) ?? s.fill ?? 'solid',
          size: slots.size,
          align: 'start' as const,
          offset: slots.offsets[i],
          interactive: false,
        }
        return (
          <Bars<D>
            // biome-ignore lint/suspicious/noArrayIndexKey: series ids may repeat (warned about), the position keeps keys unique
            key={`${i}:${s.id}`}
            data={data}
            {...(vertical ? { y: getter } : { x: getter })}
            {...bars}
          />
        )
      })}
    </>
  )
}
