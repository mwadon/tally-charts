import { type CSSProperties, Fragment, useMemo } from 'react'
import { stackRow } from '../../core/bars'
import type { FormatSpec } from '../../core/format'
import { bandPath, linePath } from '../../core/line'
import { clampToRange, niceDomain } from '../../core/linear'
import { round2 } from '../../core/path'
import { inferLinearDomain, type TimeScaleSpec } from '../../core/scale'
import { estimateWidth, type Tick, type TickSpec } from '../../core/ticks'
import { type TimeInput, toTime } from '../../core/time'
import type { Accessor, Fill, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { paintFor } from '../../theme/patterns'
import { Chart, type ChartName } from '../Chart'
import { useFormat, useMessages } from '../ChartsProvider'
import { type Margin, useChartContext } from '../context'
import type { DataTableColumn, DataTableSpec } from '../DataTable'
import { Axis, type AxisFormat } from '../marks/Axis'
import { Grid } from '../marks/Grid'
import { Tooltip } from '../overlays/Tooltip'
import { seriesTones, warnSeries } from './bar-series'
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
  timeSpecOf,
  useXLabels,
  withBreaks,
  type XRow,
  xColumn,
  xScaleOf,
} from './x-rows'

export interface AreaSeries<D> {
  /** Stable key of the series; unique within the chart. */
  id: string
  /** Name for the end label, the tooltip, announcements and the data table header. */
  label: string
  value: Accessor<D, number>
  /** Default: the next tone of the default order: accent, accent-soft, warn, neutral, gain. */
  tone?: Tone
}

export type StackedAreaChartProps<D> = ChartName &
  Omit<ChartPassThroughProps<D>, 'aspectRatio'> & {
    data: readonly D[]
    /**
     * As `LineChart`: an accessor puts categories on a point scale, a time scale spec with a
     * `field` puts dates on a time axis (rows sorted by date).
     */
    x: Accessor<D, string | number> | (TimeScaleSpec<D> & { field: Accessor<D, TimeInput> })
    /**
     * One layer per series; the first series sits on the baseline. A negative value counts as
     * zero; a missing or non-numeric value breaks every layer at that x.
     */
    series: readonly AreaSeries<D>[]
    /**
     * The first forecast x (a category, or a date on a time axis). From the x before it to the
     * end the layers are hatched, and a dashed rule marks that x.
     */
    forecastFrom?: TimeInput
    /** Text above the rule, e.g. "today". */
    forecastLabel?: string
    /** Value domain. Default: zero to the largest total, rounded to nice ticks. */
    domain?: readonly [number, number]
    /** Series name and last value at the right edge of each layer. Default true. */
    endLabels?: boolean
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
    /** As `LineChart`. Default true. */
    interactive?: boolean
  }

const MARGIN: Margin = { top: 24, right: 16, bottom: 32, left: 44 }
const NO_ROWS: readonly never[] = []
/** The forecast label's baseline sits this far above the plot. */
const LABEL_OFFSET = 6

/** A complete row stacked: per series its [from, to] value extent, and the total. */
interface Stack {
  extents: [number, number][]
  total: number
}

/**
 * The stack of a row whose `n` values are all finite, negatives counted as zero; undefined for
 * an incomplete row, which breaks every layer. `stackRow` skips zero values, so a zero layer gets
 * `from === to` at the top of the layers below it and stays part of its path.
 */
function stackOf(values: readonly number[], n: number): Stack | undefined {
  const clamped = values.slice(0, n).map((v) => Math.max(0, v))
  if (clamped.length < n || !clamped.every(Number.isFinite)) return undefined
  const row = stackRow(clamped)
  let top = 0
  const extents = clamped.map((_, k): [number, number] => {
    const seg = row.segments.find((s) => s.series === k)
    if (seg) top = seg.to
    return seg ? [seg.from, seg.to] : [top, top]
  })
  return { extents, total: row.positive }
}

export function StackedAreaChart<D>({
  data,
  x,
  series,
  forecastFrom,
  forecastLabel,
  domain,
  // End labels are not drawn yet; kept out of the props passed to <Chart>.
  endLabels: _endLabels = true,
  format,
  yAxis = 'all',
  yAxisFormat,
  xAxis = 'all',
  xAxisFormat,
  grid = true,
  dataTable = true,
  tooltip = true,
  interactive = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: StackedAreaChartProps<D>) {
  const { create } = useFormat()
  const messages = useMessages()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])
  const time = timeSpecOf(x)
  const n = series.length
  if (DEV) {
    warnSeries(series, warn, 'StackedAreaChart', 'stacked-area')
    if (n > 5) {
      warn('stacked-area-series-count', `StackedAreaChart has ${n} series; tones repeat from 6.`)
    }
  }
  const tones = useMemo(() => seriesTones(series), [series])

  const built = useMemo(
    () =>
      buildXRows(
        data,
        x,
        series.map((s) => s.value),
        warn,
        'StackedAreaChart',
        'stacked-area',
      ),
    [data, x, series, warn],
  )
  const rows = useXLabels(built, x, xAxisFormat)
  const drawn = useMemo(() => withBreaks(rows), [rows])
  const stacks = useMemo(() => drawn.map((r) => stackOf(r.values, n)), [drawn, n])
  if (DEV) {
    for (const row of rows) {
      const k = row.values.findIndex((v) => v < 0)
      if (k >= 0) {
        warn(
          'stacked-area-negative',
          `StackedAreaChart counts a negative value as zero: series "${series[k]?.id}" at index ${row.index}.`,
        )
        break
      }
    }
  }

  const yTicks = typeof yAxis === 'number' ? yAxis : undefined
  const resolvedDomain = useMemo(
    () =>
      domain ??
      niceDomain(
        inferLinearDomain(
          stacks.map((s) => s?.total ?? Number.NaN),
          true,
        ),
        yTicks,
      ),
    [domain, stacks, yTicks],
  )

  // The forecast part starts at the x before `forecastFrom`; at the first x nothing is hatched.
  let splitKey: string | undefined
  if (forecastFrom !== undefined) {
    const t = time ? toTime(forecastFrom) : undefined
    const at = rows.findIndex((r) => (time ? r.time === t : r.key === String(forecastFrom)))
    if (at > 0) splitKey = rows[at - 1]?.key
    if (DEV && at < 0) {
      warn(
        'stacked-area-forecast',
        `StackedAreaChart has no x "${String(forecastFrom)}" for \`forecastFrom\`; nothing is hatched.`,
      )
    }
  }

  let table: DataTableSpec<XRow<D>> | undefined
  if (dataTable) {
    const columns: DataTableColumn<XRow<D>>[] = [
      xColumn(x, messages),
      ...series.map(
        (s, i): DataTableColumn<XRow<D>> => ({
          header: s.label,
          value: (r) => {
            const value = r.values[i] ?? Number.NaN
            return Number.isFinite(value) ? fmt(value) : ''
          },
        }),
      ),
    ]
    table = { columns }
  }
  const valueFormat: AxisFormat | undefined = yAxisFormat ?? format
  const m: Margin = { ...MARGIN, ...margin }

  return (
    <Chart<XRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={n === 0 ? NO_ROWS : rows}
      x={xScaleOf(x)}
      y={{ domain: resolvedDomain }}
      margin={m}
      height={height ?? 280}
      dataTable={withTableOptions(table, dataTable)}
    >
      {grid ? <Grid ticks={yAxis === 'none' ? 'all' : yAxis} /> : null}
      <AreaLayers
        rows={drawn}
        stacks={stacks}
        tones={tones}
        splitKey={splitKey}
        forecastLabel={forecastLabel}
      />
      {yAxis === 'none' ? null : <Axis side="left" ticks={yAxis} format={valueFormat} />}
      {xAxis === 'none' ? null : <Axis side="bottom" ticks={xAxis} format={xAxisFormat} />}
      {interactive && tooltip ? <Tooltip content={tooltipContent(tooltip)} /> : null}
      {children}
    </Chart>
  )
}

/** A drawable row: its plot x and its stack. */
interface Column {
  x: number
  stack: Stack
}

/**
 * Inside <Chart>: per series the layer paths (solid, then hatched from the split x), the surface
 * separators between neighbouring layers in the solid part, the upper edges of the hatched
 * layers, and the forecast rule with its label.
 */
function AreaLayers<D>({
  rows,
  stacks,
  tones,
  splitKey,
  forecastLabel,
}: {
  rows: readonly XRow<D>[]
  stacks: readonly (Stack | undefined)[]
  tones: readonly Tone[]
  splitKey: string | undefined
  forecastLabel: string | undefined
}) {
  const ctx = useChartContext('StackedAreaChart')
  if (ctx.y.kind !== 'linear') return null
  const linear = ctx.y.scale
  const yOf = (value: number) => clampToRange(linear, linear(value))

  // The first row with the split key is the real one; a break row after it repeats the key.
  const splitAt = splitKey === undefined ? -1 : rows.findIndex((r) => r.key === splitKey)
  const splitRow = rows[splitAt]
  const splitX = splitRow ? rowX(ctx, splitRow, 'StackedAreaChart') : undefined
  const split = splitX === undefined ? -1 : splitAt

  // Runs of consecutive drawable rows, each cut at the split into a solid and a hatched part
  // that share the split x. A part of one row draws nothing.
  const solid: Column[][] = []
  const hatched: Column[][] = []
  let run: { at: number; column: Column }[] = []
  const flush = () => {
    const before = split < 0 ? run : run.filter((c) => c.at <= split)
    const after = split < 0 ? [] : run.filter((c) => c.at >= split)
    if (before.length > 1) solid.push(before.map((c) => c.column))
    if (after.length > 1) hatched.push(after.map((c) => c.column))
    run = []
  }
  rows.forEach((row, at) => {
    const stack = stacks[at]
    const px = stack ? rowX(ctx, row, 'StackedAreaChart') : undefined
    if (stack && px !== undefined) run.push({ at, column: { x: px, stack } })
    else flush()
  })
  flush()

  const extent = (c: Column, k: number) => c.stack.extents[k] ?? [0, 0]
  const layer = (part: Column[], k: number) =>
    bandPath(part.map((c) => ({ x: c.x, low: yOf(extent(c, k)[0]), high: yOf(extent(c, k)[1]) })))
  const upper = (parts: Column[][], k: number) =>
    parts.map((part) => linePath(part.map((c) => ({ x: c.x, y: yOf(extent(c, k)[1]) })))).join('')

  const paint = (tone: Tone, fill: Fill) =>
    ({
      fill: paintFor(ctx.chartId, tone, fill).fill,
      '--_ch-swatch-color': `var(--ch-${tone})`,
    }) as CSSProperties
  const half = forecastLabel ? estimateWidth({ label: forecastLabel } as Tick) / 2 : 0

  return (
    <g data-ch-part="area-layers">
      {tones.map((tone, k) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: series ids may repeat (warned about), the position keeps keys unique
        <Fragment key={k}>
          {solid.map((part, r) => (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: parts have no id of their own
              key={`s${r}`}
              data-ch-part="area-layer"
              data-ch-tone={tone}
              data-ch-fill="solid"
              d={layer(part, k)}
              style={paint(tone, 'solid')}
            />
          ))}
          {hatched.map((part, r) => (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: parts have no id of their own
              key={`h${r}`}
              data-ch-part="area-layer"
              data-ch-tone={tone}
              data-ch-fill="hatch"
              d={layer(part, k)}
              style={paint(tone, 'hatch')}
            />
          ))}
        </Fragment>
      ))}
      {/* Between neighbouring layers only: none on the top edge, none along the baseline. */}
      {solid.length > 0
        ? tones.slice(0, -1).map((_, k) => (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: one separator per boundary, in order
              key={k}
              data-ch-part="area-separator"
              d={upper(solid, k)}
            />
          ))
        : null}
      {hatched.length > 0
        ? tones.map((tone, k) => (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: series ids may repeat, the position keeps keys unique
              key={k}
              data-ch-part="area-edge"
              data-ch-tone={tone}
              d={upper(hatched, k)}
              style={{ '--_ch-swatch-color': `var(--ch-${tone})` } as CSSProperties}
            />
          ))
        : null}
      {splitX === undefined ? null : (
        <>
          <line
            data-ch-part="forecast-rule"
            x1={round2(splitX)}
            x2={round2(splitX)}
            y1={0}
            y2={ctx.innerHeight}
          />
          {forecastLabel ? (
            <text
              data-ch-part="forecast-label"
              // Centred on the rule, but kept inside the svg.
              x={round2(
                Math.max(
                  half - ctx.margin.left,
                  Math.min(ctx.innerWidth + ctx.margin.right - half, splitX),
                ),
              )}
              y={-LABEL_OFFSET}
              textAnchor="middle"
            >
              {forecastLabel}
            </text>
          ) : null}
        </>
      )}
    </g>
  )
}
