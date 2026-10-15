import { useMemo } from 'react'
import { resolveAccessor } from '../../core/accessor'
import type { FormatSpec, Formatter } from '../../core/format'
import { clampToRange, niceDomain } from '../../core/linear'
import { categoryCenter, categoryStep, inferLinearDomain } from '../../core/scale'
import type { TickSpec } from '../../core/ticks'
import type { Accessor, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { Chart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import { type Margin, useChart } from '../context'
import type { DataTableColumn, DataTableSpec } from '../DataTable'
import { Axis, type AxisFormat } from '../marks/Axis'
import { Band } from '../marks/Band'
import { Grid } from '../marks/Grid'
import { Line } from '../marks/Line'
import { NearestPointer } from '../marks/NearestPointer'
import { Region } from '../marks/Region'
import { Target } from '../marks/Target'
import { Tooltip } from '../overlays/Tooltip'
import type { ChartPoint, TooltipSegment } from '../types'
import { useRegisterPoints } from '../useRegisterPoints'
import { type ChartPassThroughProps, headerOf, toNumber, userCallbacks } from './shared'

export type LineSeriesStyle = 'actual' | 'forecast' | 'scenario'

export interface LineSeries<D> {
  /** Stable key of the series; unique within the chart. */
  id: string
  /** Legend and data-table name, e.g. "Current path". */
  label: string
  value: Accessor<D, number>
  /** Default 'gain' for a scenario, otherwise 'accent'. */
  tone?: Tone
  /**
   * 'actual': solid with filled dots. 'forecast': dashed with hollow dots. 'scenario': dashed with
   * filled dots. Default 'actual'. A forecast that continues the actuals repeats the last actual
   * value at that x, so the lines join.
   */
  style?: LineSeriesStyle
  /** Text after the value in the tooltip, e.g. "on the current path". Default: `label`. */
  tooltipLabel?: string
}

export interface LineRange<D> {
  low: Accessor<D, number>
  high: Accessor<D, number>
  /** Data-table header. Default "Range". */
  label?: string
  /** Default 'accent'. */
  tone?: Tone
}

export interface LineChartProps<D> extends Omit<ChartPassThroughProps<unknown>, 'aspectRatio'> {
  data: readonly D[]
  /**
   * Category per row, e.g. the month. Each value appears once; repeats are skipped. Point ids are
   * these values as strings, so `1` and `'1'` are the same x.
   */
  x: Accessor<D, string | number>
  series: readonly LineSeries<D>[]
  /** A soft band between two values, e.g. the likely range of a forecast. */
  band?: LineRange<D>
  /** Shade from this category to the end, e.g. the first forecast month. */
  forecastFrom?: string | number
  target?: number | { value: number; label?: string }
  /**
   * Value domain. Default: every series, the band and the target, rounded to nice ticks; zero
   * isn't forced.
   */
  domain?: readonly [number, number]
  /** Default 'number'. */
  format?: FormatSpec
  /** Value axis ticks, or 'none'. The grid follows them. Default 'all' (about 5). */
  axis?: TickSpec | 'none'
  /** Value axis labels. Default: `format`. */
  axisFormat?: AxisFormat
  /** Category axis ticks, or 'none'. Default 'all'. */
  xAxis?: TickSpec | 'none'
  /** Horizontal grid lines at the value ticks ('all' when `axis` is 'none'). Default true. */
  grid?: boolean
  /** Dot radius in px. Default 4. */
  radius?: number
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
  /** Default true. */
  tooltip?: boolean
}

interface LineRow<D> {
  key: string
  datum: D
  index: number
  /** One value per series, NaN when missing. */
  values: number[]
  low: number
  high: number
}

const MARGIN: Margin = { top: 24, right: 16, bottom: 32, left: 44 }

function styleOf<D>(s: LineSeries<D>): LineSeriesStyle {
  return s.style ?? 'actual'
}

function toneOf<D>(s: LineSeries<D>): Tone {
  return s.tone ?? (styleOf(s) === 'scenario' ? 'gain' : 'accent')
}

/** One point per x, carrying every series with a value there; snaps the pointer along x. */
function LinePoints<D>(props: {
  rows: readonly LineRow<D>[]
  series: readonly LineSeries<D>[]
  fmt: Formatter
  radius: number
}) {
  const ctx = useChart('LineChart')
  const linear = ctx.y.kind === 'linear' ? ctx.y.scale : undefined
  const points: ChartPoint[] = linear
    ? props.rows.flatMap((row, index): ChartPoint[] => {
        const x = categoryCenter(ctx.x, row.key)
        if (x === undefined) return []
        // Forecasts repeat the last actual at the join; there the actual is listed once.
        const actualHere = props.series.some(
          (s, i) => styleOf(s) === 'actual' && Number.isFinite(row.values[i] ?? Number.NaN),
        )
        const shown = props.series.flatMap((s, i) => {
          const value = row.values[i] ?? Number.NaN
          if (!Number.isFinite(value) || (actualHere && styleOf(s) !== 'actual')) return []
          return [{ text: props.fmt(value), label: s.tooltipLabel ?? s.label, tone: toneOf(s) }]
        })
        if (shown.length === 0) return []
        const top = Math.min(
          ...row.values.filter(Number.isFinite).map((v) => clampToRange(linear, linear(v))),
        )
        const segments: TooltipSegment[] = [
          { value: row.key },
          ...shown.map((s) => ({
            value: s.text,
            label: s.label,
            tone: s.tone === 'accent' ? undefined : s.tone,
          })),
        ]
        return [
          {
            id: row.key,
            index,
            datum: row,
            x,
            y: top - props.radius,
            hitX: x,
            hitY: top,
            label: [row.key, ...shown.map((s) => `${s.text} ${s.label}`)].join(', '),
            segments,
          },
        ]
      })
    : []
  useRegisterPoints(ctx, points)
  return <NearestPointer axis="x" radius={Math.max(12, categoryStep(ctx.x) / 2)} />
}

export function LineChart<D>({
  data,
  x,
  series,
  band,
  forecastFrom,
  target,
  domain,
  format,
  axis = 'all',
  axisFormat,
  xAxis = 'all',
  grid = true,
  radius = 4,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: LineChartProps<D>) {
  const { create } = useFormat()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])

  const rows = useMemo(() => {
    const getX = resolveAccessor(x)
    const getters = series.map((s) => resolveAccessor(s.value))
    const getLow = band ? resolveAccessor(band.low) : undefined
    const getHigh = band ? resolveAccessor(band.high) : undefined
    const seen = new Set<string>()
    return data.flatMap((d, i): LineRow<D>[] => {
      const raw = getX(d, i)
      const key = raw === null || raw === undefined ? '' : String(raw)
      if (key === '') {
        if (DEV) warn('line-x-missing', `LineChart skipped a missing x value at index ${i}.`)
        return []
      }
      if (seen.has(key)) {
        if (DEV) {
          warn('line-x-repeated', `LineChart skipped a repeated x value "${key}" at index ${i}.`)
        }
        return []
      }
      seen.add(key)
      return [
        {
          key,
          datum: d,
          index: i,
          values: getters.map((get) => toNumber(get(d, i))),
          low: getLow ? toNumber(getLow(d, i)) : Number.NaN,
          high: getHigh ? toNumber(getHigh(d, i)) : Number.NaN,
        },
      ]
    })
  }, [data, x, series, band, warn])

  const targetSpec = typeof target === 'number' ? { value: target } : target
  // The target counts toward the inferred domain, so a goal above or below the data is drawn.
  const resolvedDomain =
    domain ??
    niceDomain(
      inferLinearDomain(
        [...rows.flatMap((r) => [...r.values, r.low, r.high]), targetSpec?.value ?? Number.NaN],
        false,
      ),
    )
  if (DEV) {
    const ids = new Set<string>()
    for (const s of series) {
      if (ids.has(s.id)) {
        warn(
          'line-series-id',
          `LineChart has a repeated series id "${s.id}"; give each series its own id.`,
        )
      }
      ids.add(s.id)
    }
  }
  // Actual lines last, so their filled dots sit on top where the forecasts join them.
  const ordered = series
    .map((s, i) => ({ s, i }))
    .sort((a, b) => Number(styleOf(a.s) === 'actual') - Number(styleOf(b.s) === 'actual'))
  const valueFormat: AxisFormat | undefined = axisFormat ?? format
  const m: Margin = { ...MARGIN, ...margin }

  let table: DataTableSpec<LineRow<D>> | undefined
  if (dataTable) {
    const columns: DataTableColumn<LineRow<D>>[] = [
      { header: headerOf(x, 'Category'), value: (r) => r.key },
      ...series.map(
        (s, i): DataTableColumn<LineRow<D>> => ({
          header: s.label,
          value: (r) => fmt(r.values[i] ?? Number.NaN),
        }),
      ),
    ]
    if (band) {
      columns.push({
        header: band.label ?? 'Range',
        value: (r) =>
          Number.isFinite(r.low) && Number.isFinite(r.high) ? `${fmt(r.low)}–${fmt(r.high)}` : '',
      })
    }
    table = { columns }
  }

  return (
    <Chart<LineRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={{ type: 'point', field: 'key' }}
      y={{ domain: resolvedDomain }}
      margin={m}
      height={height ?? 280}
      dataTable={table}
    >
      {forecastFrom !== undefined ? <Region from={forecastFrom} /> : null}
      {grid ? <Grid ticks={axis === 'none' ? 'all' : axis} /> : null}
      {targetSpec ? (
        <Target y={targetSpec.value} label={targetSpec.label} labelPosition="start" />
      ) : null}
      {band ? <Band<LineRow<D>> x="key" low="low" high="high" tone={band.tone} /> : null}
      {ordered.map(({ s, i }) => (
        <Line<LineRow<D>>
          // Index first: repeated series ids still get distinct keys.
          key={`${i}:${s.id}`}
          x="key"
          y={(r) => r.values[i] ?? Number.NaN}
          tone={toneOf(s)}
          dashed={styleOf(s) !== 'actual'}
          dots={styleOf(s) === 'forecast' ? 'hollow' : 'filled'}
          radius={radius}
        />
      ))}
      <LinePoints rows={rows} series={series} fmt={fmt} radius={radius} />
      {axis === 'none' ? null : <Axis side="left" ticks={axis} format={valueFormat} />}
      {xAxis === 'none' ? null : <Axis side="bottom" ticks={xAxis} />}
      {tooltip ? <Tooltip /> : null}
      {children}
    </Chart>
  )
}
