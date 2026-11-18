import { type ReactNode, useMemo } from 'react'
import type { FormatSpec, Formatter } from '../../core/format'
import { clampToRange, niceDomain } from '../../core/linear'
import { inferLinearDomain, type TimeScaleSpec } from '../../core/scale'
import type { TickSpec } from '../../core/ticks'
import { type TimeInput, toTime } from '../../core/time'
import type { Accessor, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { Chart, type ChartName } from '../Chart'
import { useFormat, useMessages } from '../ChartsProvider'
import { type Margin, useChartContext } from '../context'
import type { DataTableColumn, DataTableSpec } from '../DataTable'
import { Axis, type AxisFormat } from '../marks/Axis'
import { Band } from '../marks/Band'
import { Grid } from '../marks/Grid'
import { Line } from '../marks/Line'
import { NearestPointer } from '../marks/NearestPointer'
import { Region } from '../marks/Region'
import { Target } from '../marks/Target'
import { HEADER_RANGE } from '../messages'
import { Tooltip } from '../overlays/Tooltip'
import type { ChartPoint, TooltipSegment } from '../types'
import { useRegisterPoints } from '../useRegisterPoints'
import {
  type ChartPassThroughProps,
  type ChartTooltip,
  type DataTableOptions,
  tooltipContent,
  userCallbacks,
  withTableOptions,
} from './shared'
import {
  buildXRows,
  rowX,
  snapRadius,
  timeSpecOf,
  useXLabels,
  withBreaks,
  type XRow,
  xColumn,
  xScaleOf,
} from './x-rows'

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
     * isn't forced. The order may be reversed: `[10, 1]` puts 1 at the top, for positions where 1
     * is best.
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
     * Default true. With false the chart is static: no points are registered, so it has no tab
     * stop, no keyboard hint, no pointer response and no tooltip (`tooltip` is ignored), and
     * `onSelect` and `onActiveChange` never fire. The title and the data table stay.
     */
    interactive?: boolean
    /**
     * Marks drawn under the series, above the grid, e.g. an `<Area>` on a time axis. `children`
     * stay above the series.
     */
    underlay?: ReactNode
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
  rows: readonly XRow<D>[]
  series: readonly LineSeries<D>[]
  fmt: Formatter
  radius: number
}) {
  const ctx = useChartContext('LineChart')
  const linear = ctx.y.kind === 'linear' ? ctx.y.scale : undefined
  const points: ChartPoint[] = linear
    ? props.rows.flatMap((row, index): ChartPoint[] => {
        const x = rowX(ctx, row, 'LineChart')
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
        // The band's values follow the series' ones and don't lift the point.
        const top = Math.min(
          ...row.values
            .slice(0, props.series.length)
            .filter(Number.isFinite)
            .map((v) => clampToRange(linear, linear(v))),
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
  return (
    <NearestPointer
      axis="x"
      radius={snapRadius(
        ctx,
        points.map((p) => p.x),
      )}
    />
  )
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
  interactive = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: LineChartProps<D>) {
  const { create } = useFormat()
  const messages = useMessages()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])
  const timeX = timeSpecOf(x)
  // The band's low and high ride after the series' values.
  const n = series.length
  const built = useMemo(() => {
    const getters = [...series.map((s) => s.value), ...(band ? [band.low, band.high] : [])]
    return buildXRows(data, x, getters, warn, 'LineChart', 'line')
  }, [data, x, series, band, warn])
  const rows = useXLabels(built, x, xAxisFormat)
  const drawn = withBreaks(rows)
  const low = (r: XRow<D>) => r.values[n] ?? Number.NaN
  const high = (r: XRow<D>) => r.values[n + 1] ?? Number.NaN

  const targetSpec = typeof target === 'number' ? { value: target } : target
  // The target counts toward the inferred domain, so a goal above or below the data is drawn. The
  // domain is rounded with the axis's own tick count, so its ends land on labelled ticks.
  const resolvedDomain =
    domain ??
    niceDomain(
      inferLinearDomain([...rows.flatMap((r) => r.values), targetSpec?.value ?? Number.NaN], false),
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

  let table: DataTableSpec<XRow<D>> | undefined
  if (dataTable) {
    const columns: DataTableColumn<XRow<D>>[] = [
      xColumn(x, messages),
      ...series.map(
        (s, i): DataTableColumn<XRow<D>> => ({
          header: s.label,
          value: (r) => fmt(r.values[i] ?? Number.NaN),
        }),
      ),
    ]
    if (band) {
      columns.push({
        header: band.label ?? messages.headerRange ?? HEADER_RANGE,
        value: (r) =>
          Number.isFinite(low(r)) && Number.isFinite(high(r))
            ? `${fmt(low(r))}–${fmt(high(r))}`
            : '',
      })
    }
    table = { columns }
  }
  const xScale = xScaleOf(x)

  return (
    <Chart<XRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={xScale}
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
        <Band<XRow<D>> data={drawn} x={xScale.field} low={low} high={high} tone={band.tone} />
      ) : null}
      {ordered.map(({ s, i }) => (
        <Line<XRow<D>>
          // Index first: repeated series ids still get distinct keys.
          key={`${i}:${s.id}`}
          data={drawn}
          x={xScale.field}
          y={(r) => r.values[i] ?? Number.NaN}
          tone={toneOf(s)}
          dashed={styleOf(s) !== 'actual'}
          dots={styleOf(s) === 'forecast' ? 'hollow' : 'filled'}
          radius={radius}
        />
      ))}
      {interactive ? <LinePoints rows={rows} series={series} fmt={fmt} radius={radius} /> : null}
      {yAxis === 'none' ? null : <Axis side="left" ticks={yAxis} format={valueFormat} />}
      {xAxis === 'none' ? null : <Axis side="bottom" ticks={xAxis} format={xAxisFormat} />}
      {interactive && tooltip ? <Tooltip content={tooltipContent(tooltip)} /> : null}
      {children}
    </Chart>
  )
}
