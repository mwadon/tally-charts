import { type ReactNode, useMemo } from 'react'
import { resolveAccessor } from '../../core/accessor'
import { createDateFormatter, isDateFormat } from '../../core/date'
import type { FormatSpec, Formatter } from '../../core/format'
import { clampToRange, niceDomain } from '../../core/linear'
import {
  categoryCenter,
  categoryStep,
  inferLinearDomain,
  type TimeScaleSpec,
} from '../../core/scale'
import type { TickSpec } from '../../core/ticks'
import { DAY, type TimeInput, toTime } from '../../core/time'
import type { Accessor, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { Chart, type ChartName } from '../Chart'
import { useFormat, useLocale, useMessages } from '../ChartsProvider'
import { type Margin, useChartContext } from '../context'
import type { DataTableColumn, DataTableSpec } from '../DataTable'
import { Axis, type AxisFormat } from '../marks/Axis'
import { Band } from '../marks/Band'
import { Grid } from '../marks/Grid'
import { Line } from '../marks/Line'
import { NearestPointer } from '../marks/NearestPointer'
import { Region } from '../marks/Region'
import { timeX } from '../marks/series'
import { Target } from '../marks/Target'
import { Tooltip } from '../overlays/Tooltip'
import type { ChartPoint, TooltipSegment } from '../types'
import { useRegisterPoints } from '../useRegisterPoints'
import {
  type ChartPassThroughProps,
  type ChartTooltip,
  type DataTableOptions,
  headerOf,
  toNumber,
  tooltipContent,
  userCallbacks,
  withTableOptions,
} from './shared'

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

export interface LineBand<D> {
  low: Accessor<D, number>
  high: Accessor<D, number>
  /** Data-table header. Default "Range". */
  label?: string
  /** Default 'accent'. */
  tone?: Tone
}

export type LineChartProps<D> = ChartName &
  Omit<ChartPassThroughProps<D>, 'aspectRatio'> & {
    data: readonly D[]
    /**
     * The x of each row. An accessor puts categories on a point scale: each value appears once,
     * repeats are skipped, and point ids are the values as strings, so `1` and `'1'` are the same
     * x. A time scale spec with a `field` puts dates on a time axis instead: rows are sorted by
     * date, rows with the same epoch ms are repeats, and point ids are ISO strings. A row whose x
     * is not a date (or missing) is skipped and breaks every line and the band after the row
     * before it in data order. On a time axis that row is the one before it in the data, not in
     * date order: with unsorted data the break can fall between two other dates.
     */
    x: Accessor<D, string | number> | (TimeScaleSpec<D> & { field: Accessor<D, TimeInput> })
    series: readonly LineSeries<D>[]
    /** A soft band between two values, e.g. the likely range of a forecast. */
    band?: LineBand<D>
    /**
     * Shade from here to the end, e.g. the first forecast month: a category, or a date on a time
     * axis. The shading starts halfway between it and the x before it.
     */
    forecastFrom?: TimeInput
    target?: number | { value: number; label?: string }
    /**
     * Value domain. Default: every series, the band and the target, rounded to nice ticks; zero
     * isn't forced.
     */
    domain?: readonly [number, number]
    /** Default 'number'. */
    format?: FormatSpec
    /** Value axis ticks, or 'none'. The grid follows them. Default 'all' (about 5). */
    yAxis?: TickSpec | 'none'
    /** Value axis labels. Default: `format`. */
    yAxisFormat?: AxisFormat
    /** x axis ticks, or 'none'. Default 'all'. */
    xAxis?: TickSpec | 'none'
    /**
     * x axis labels; tooltip headers, announcements and the data table's x cells use the same
     * format. Default: the category itself, or 'auto' dates on a time axis.
     */
    xAxisFormat?: AxisFormat
    /** Horizontal grid lines at the value ticks ('all' when `yAxis` is 'none'). Default true. */
    grid?: boolean
    /** Dot radius in px. Default 4. */
    radius?: number
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
    /**
     * Marks drawn under the series, above the grid, e.g. an `<Area>` on a time axis. `children`
     * stay above the series.
     */
    underlay?: ReactNode
  }

interface LineRow<D> {
  /** Point id: the category as a string, or the date as an ISO string. */
  key: string
  /** Epoch ms on a time axis; NaN on a category axis. */
  time: number
  /** The x as people read it: the formatted category or date. */
  label: string
  datum: D
  index: number
  /** One value per series, NaN when missing. */
  values: number[]
  low: number
  high: number
  /** A skipped row followed this one in data order: the lines and the band break after it. */
  gapAfter?: boolean
}

const MARGIN: Margin = { top: 24, right: 16, bottom: 32, left: 44 }

function styleOf<D>(s: LineSeries<D>): LineSeriesStyle {
  return s.style ?? 'actual'
}

function toneOf<D>(s: LineSeries<D>): Tone {
  return s.tone ?? (styleOf(s) === 'scenario' ? 'gain' : 'accent')
}

/** The smallest distance between neighbouring sorted values; Infinity for fewer than two. */
function minGap(values: readonly number[]): number {
  return values.reduce(
    (gap, v, i) => (i ? Math.min(gap, v - (values[i - 1] as number)) : gap),
    Number.POSITIVE_INFINITY,
  )
}

/** One point per x, carrying every series with a value there; snaps the pointer along x. */
function LinePoints<D>(props: {
  rows: readonly LineRow<D>[]
  series: readonly LineSeries<D>[]
  fmt: Formatter
  radius: number
}) {
  const ctx = useChartContext('LineChart')
  const linear = ctx.y.kind === 'linear' ? ctx.y.scale : undefined
  const xScale = ctx.x
  const points: ChartPoint[] = linear
    ? props.rows.flatMap((row, index): ChartPoint[] => {
        // Off-domain dates are neither drawn nor registered, so pointer and keys can't reach them.
        const x =
          xScale.kind === 'time'
            ? timeX(ctx, xScale.scale, row.time, 'LineChart')
            : categoryCenter(xScale, row.key)
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
          { value: row.label },
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
            label: [row.label, ...shown.map((s) => `${s.text} ${s.label}`)].join(', '),
            segments,
          },
        ]
      })
    : []
  useRegisterPoints(points)
  // Half the smallest gap between neighbouring x values: categories are a step apart, dates
  // can be anything.
  const gap = xScale.kind === 'time' ? minGap(points.map((p) => p.x)) : categoryStep(xScale)
  return <NearestPointer axis="x" radius={Math.max(12, Number.isFinite(gap) ? gap / 2 : 0)} />
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
  yAxis = 'all',
  yAxisFormat,
  xAxis = 'all',
  xAxisFormat,
  grid = true,
  underlay,
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
  const messages = useMessages()
  const { locale } = useLocale()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])
  const timeX = typeof x === 'object' ? x : undefined
  const zone = timeX?.zone ?? 'utc'

  const rows = useMemo(() => {
    const getX = resolveAccessor(timeX ? timeX.field : (x as Accessor<D, string | number>))
    const getters = series.map((s) => resolveAccessor(s.value))
    const getLow = band ? resolveAccessor(band.low) : undefined
    const getHigh = band ? resolveAccessor(band.high) : undefined
    const seen = new Set<string>()
    let previous: LineRow<D> | undefined
    const all = data.flatMap((d, i): LineRow<D>[] => {
      const raw = getX(d, i)
      const time = timeX ? toTime(raw) : Number.NaN
      const key =
        time === undefined
          ? ''
          : timeX
            ? new Date(time).toISOString()
            : raw === null || raw === undefined
              ? ''
              : String(raw)
      if (key === '') {
        if (DEV) {
          warn(
            'line-x-missing',
            timeX
              ? `LineChart skipped an x value that is not a date at index ${i}.`
              : `LineChart skipped a missing x value at index ${i}.`,
          )
        }
        if (previous) previous.gapAfter = true
        return []
      }
      if (seen.has(key)) {
        if (DEV) {
          warn('line-x-repeated', `LineChart skipped a repeated x value "${key}" at index ${i}.`)
        }
        return []
      }
      seen.add(key)
      const row: LineRow<D> = {
        key,
        time: time ?? Number.NaN,
        label: key,
        datum: d,
        index: i,
        values: getters.map((get) => toNumber(get(d, i))),
        low: getLow ? toNumber(getLow(d, i)) : Number.NaN,
        high: getHigh ? toNumber(getHigh(d, i)) : Number.NaN,
      }
      previous = row
      return [row]
    })
    // Dates draw and step left to right, whatever order the data has. Sort is stable.
    return timeX ? all.sort((a, b) => a.time - b.time) : all
  }, [data, x, timeX, series, band, warn])

  // The x as people read it, shared by the axis, the tooltip, announcements and the table.
  const xLabel = useMemo((): ((row: LineRow<D>) => string) => {
    if (typeof xAxisFormat === 'function') {
      return (row) => xAxisFormat(timeX ? new Date(row.time) : row.key)
    }
    if (!timeX) return (row) => row.key
    const step = minGap(rows.map((r) => r.time))
    const spec = isDateFormat(xAxisFormat) ? xAxisFormat : 'auto'
    const date = createDateFormatter(spec, {
      locale,
      zone,
      step: Number.isFinite(step) ? step : DAY,
    })
    return (row) => date(row.time)
  }, [xAxisFormat, timeX, rows, locale, zone])
  const labelled = useMemo(() => rows.map((r) => ({ ...r, label: xLabel(r) })), [rows, xLabel])
  // What the lines and the band draw: `labelled`, with a row of NaN values after each row that a
  // skipped one followed. It has a valid x, so the marks don't warn, and its NaN breaks the path.
  const drawn = labelled.flatMap((row) =>
    row.gapAfter ? [row, { ...row, values: [], low: Number.NaN }] : [row],
  )

  const targetSpec = typeof target === 'number' ? { value: target } : target
  // The target counts toward the inferred domain, so a goal above or below the data is drawn. The
  // domain is rounded with the axis's own tick count, so its ends land on labelled ticks.
  const resolvedDomain =
    domain ??
    niceDomain(
      inferLinearDomain(
        [...rows.flatMap((r) => [...r.values, r.low, r.high]), targetSpec?.value ?? Number.NaN],
        false,
      ),
      typeof yAxis === 'number' ? yAxis : undefined,
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
  const valueFormat: AxisFormat | undefined = yAxisFormat ?? format
  const m: Margin = { ...MARGIN, ...margin }

  // On a time axis the shading starts halfway between the forecast's first date and the date
  // before it, as it does between categories.
  let regionFrom = forecastFrom
  const fromTime = timeX && forecastFrom !== undefined ? toTime(forecastFrom) : undefined
  if (fromTime !== undefined) {
    const before = rows.filter((r) => r.time < fromTime).at(-1)
    regionFrom = before ? (before.time + fromTime) / 2 : fromTime
  }

  let table: DataTableSpec<LineRow<D>> | undefined
  if (dataTable) {
    const columns: DataTableColumn<LineRow<D>>[] = [
      {
        header: timeX
          ? headerOf(timeX.field, messages.headerDate)
          : headerOf(x, messages.headerCategory),
        value: (r) => r.label,
      },
      ...series.map(
        (s, i): DataTableColumn<LineRow<D>> => ({
          header: s.label,
          value: (r) => fmt(r.values[i] ?? Number.NaN),
        }),
      ),
    ]
    if (band) {
      columns.push({
        header: band.label ?? messages.headerRange,
        value: (r) =>
          Number.isFinite(r.low) && Number.isFinite(r.high) ? `${fmt(r.low)}–${fmt(r.high)}` : '',
      })
    }
    table = { columns }
  }
  const xField = timeX ? 'time' : 'key'

  return (
    <Chart<LineRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={labelled}
      x={
        timeX
          ? { type: 'time', field: 'time', domain: timeX.domain, nice: timeX.nice, zone }
          : { type: 'point', field: 'key' }
      }
      y={{ domain: resolvedDomain }}
      margin={m}
      height={height ?? 280}
      dataTable={withTableOptions(table, dataTable)}
    >
      {regionFrom !== undefined ? <Region from={regionFrom} /> : null}
      {grid ? <Grid ticks={yAxis === 'none' ? 'all' : yAxis} /> : null}
      {underlay}
      {targetSpec ? (
        <Target y={targetSpec.value} label={targetSpec.label} labelPosition="start" />
      ) : null}
      {band ? (
        <Band<LineRow<D>> data={drawn} x={xField} low="low" high="high" tone={band.tone} />
      ) : null}
      {ordered.map(({ s, i }) => (
        <Line<LineRow<D>>
          // Index first: repeated series ids still get distinct keys.
          key={`${i}:${s.id}`}
          data={drawn}
          x={xField}
          y={(r) => r.values[i] ?? Number.NaN}
          tone={toneOf(s)}
          dashed={styleOf(s) !== 'actual'}
          dots={styleOf(s) === 'forecast' ? 'hollow' : 'filled'}
          radius={radius}
        />
      ))}
      <LinePoints rows={labelled} series={series} fmt={fmt} radius={radius} />
      {yAxis === 'none' ? null : <Axis side="left" ticks={yAxis} format={valueFormat} />}
      {xAxis === 'none' ? null : <Axis side="bottom" ticks={xAxis} format={xAxisFormat} />}
      {tooltip ? <Tooltip content={tooltipContent(tooltip)} /> : null}
      {children}
    </Chart>
  )
}
