import { type CSSProperties, Fragment, useMemo } from 'react'
import { stackRow } from '../../core/bars'
import type { FormatSpec, Formatter } from '../../core/format'
import { bandPath, linePath } from '../../core/line'
import { clampToRange, type LinearScale, linearScale, niceDomain } from '../../core/linear'
import { round2 } from '../../core/path'
import { inferLinearDomain, type TimeScaleSpec } from '../../core/scale'
import { estimateWidth, type Tick, type TickSpec } from '../../core/ticks'
import { inferTimeDomain, niceTimeDomain, type TimeInput, toTime } from '../../core/time'
import type { Accessor, Fill, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { paintFor } from '../../theme/patterns'
import { Chart, type ChartName } from '../Chart'
import { useFormat, useMessages } from '../ChartsProvider'
import { type InternalChartContext, type Margin, useChartContext } from '../context'
import type { DataTableColumn, DataTableSpec } from '../DataTable'
import { Axis, type AxisFormat } from '../marks/Axis'
import { Grid } from '../marks/Grid'
import { NearestPointer } from '../marks/NearestPointer'
import { HEADER_TOTAL, TOTAL } from '../messages'
import { Tooltip } from '../overlays/Tooltip'
import type { ChartPoint, TooltipSegment } from '../types'
import { useRegisterPoints } from '../useRegisterPoints'
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
  snapRadius,
  timeSpecOf,
  useXLabels,
  withBreaks,
  type XProp,
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
     * The first forecast x: a category, or any date on a time axis. The layers are hatched from
     * the last x before it to the end, and a dashed rule sits at that last x before it (with
     * `forecastFrom="W10"`, at W9). Nothing is hatched when no x comes before it.
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
    /**
     * Default true. With false the chart is static: no points are registered, so it has no tab
     * stop, no keyboard hint, no pointer response and no tooltip (`tooltip` is ignored), and
     * `onSelect` and `onActiveChange` never fire. The title and the data table stay.
     */
    interactive?: boolean
  }

const MARGIN: Margin = { top: 24, right: 16, bottom: 32, left: 44 }
const NO_ROWS: readonly never[] = []
/** The forecast label's baseline sits this far above the plot. */
const LABEL_OFFSET = 6
/** End labels start this far right of the plot. */
const END_GAP = 10
/** Space kept right of the widest end label. */
const END_PAD = 8
/** The name's baseline sits this far above the layer's midpoint. */
const END_LABEL_RISE = 4
/** The value's baseline sits this far below the layer's midpoint (18 px under the name's). */
const END_VALUE_DROP = 14
/** Neighbouring end labels (a pair is about 33 px tall) need centres this far apart, or none is drawn. */
const END_SPACING = 36
/** Width per character of the value line (13 px, weight 500), as `StackedBarChart`'s value labels. */
const END_VALUE_CHAR = 8
/** Radius of the cursor's dots in px. */
const CURSOR_DOT = 4

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

/** An end label: a series with a non-zero layer at the last x. */
interface EndLabel {
  label: string
  /** The formatted last value. */
  value: string
  /** The layer's value extent at the last x. */
  from: number
  to: number
}

/** A value's plot y, clamped to the plot. */
function plotY(scale: LinearScale, value: number) {
  return clampToRange(scale, scale(value))
}

/**
 * The x domain <Chart> will lay out a time axis with when `x` sets a valid `domain` (rounded when
 * `nice` is true, as `createScale` does); undefined when the domain comes from the rows, which it
 * then holds.
 */
function explicitTimeDomain<D>(x: XProp<D>): [number, number] | undefined {
  const time = timeSpecOf(x)
  if (!time?.domain) return undefined
  const explicit = time.domain.map(toTime)
  if (!explicit.every((t) => t !== undefined)) return undefined
  const domain = inferTimeDomain(explicit as number[])
  return time.nice ? niceTimeDomain(domain, time.zone ?? 'utc') : domain
}

/**
 * The end labels, or undefined when none is drawn: the last row is incomplete, no area reaches
 * it (the row before it is incomplete or outside the x domain), it is outside the x domain, every
 * layer is zero there, or two neighbouring labels would sit closer than END_SPACING. `scale` is
 * the value scale the chart will lay out with; it is known before <Chart> renders because it
 * depends only on the height, the top and bottom margins and the domain, and the right margin
 * depends on this. `xDomain` is the explicit time domain, if any.
 */
function endLabelsOf<D>(
  rows: readonly XRow<D>[],
  series: readonly AreaSeries<D>[],
  fmt: Formatter,
  scale: LinearScale,
  xDomain: readonly [number, number] | undefined,
): EndLabel[] | undefined {
  const row = rows.at(-1)
  const before = rows.at(-2)
  const n = series.length
  const drawn = (r: XRow<D> | undefined) =>
    r !== undefined &&
    stackOf(r.values, n) !== undefined &&
    (xDomain === undefined || (r.time >= xDomain[0] && r.time <= xDomain[1]))
  // The area reaches the last row only from a drawn row before it with no break in between.
  if (!row || !drawn(row) || !drawn(before) || before?.gapAfter) return undefined
  const stack = stackOf(row.values, n) as Stack
  const labels = series.flatMap((s, k): EndLabel[] => {
    const [from, to] = stack.extents[k] ?? [0, 0]
    return to > from ? [{ label: s.label, value: fmt(row.values[k] as number), from, to }] : []
  })
  const centres = labels.map((l) => (plotY(scale, l.from) + plotY(scale, l.to)) / 2)
  const crowded = centres.some(
    (c, i) => i > 0 && Math.abs(c - (centres[i - 1] as number)) < END_SPACING,
  )
  return labels.length === 0 || crowded ? undefined : labels
}

export function StackedAreaChart<D>({
  data,
  x,
  series,
  forecastFrom,
  forecastLabel,
  domain,
  endLabels = true,
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

  // The forecast part starts at the x before `forecastFrom`: on a category axis the category
  // before it, on a time axis the last date before it (as `LineChart`). With no x before it
  // nothing is hatched.
  let splitKey: string | undefined
  let unknownForecast = false
  if (forecastFrom !== undefined) {
    if (time) {
      const t = toTime(forecastFrom)
      if (t === undefined) unknownForecast = true
      else splitKey = rows.filter((r) => r.time < t).at(-1)?.key
    } else {
      const at = rows.findIndex((r) => r.key === String(forecastFrom))
      if (at < 0) unknownForecast = true
      else if (at > 0) splitKey = rows[at - 1]?.key
    }
  }
  if (DEV && unknownForecast && rows.length > 0) {
    warn(
      'stacked-area-forecast',
      time
        ? `StackedAreaChart got \`forecastFrom\` "${String(forecastFrom)}", which is not a date; nothing is hatched.`
        : `StackedAreaChart has no x "${String(forecastFrom)}" for \`forecastFrom\`; nothing is hatched.`,
    )
  }

  const totalOf = (r: XRow<D>) => {
    const stack = stackOf(r.values, n)
    return stack ? fmt(stack.total) : ''
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
      { header: messages.headerTotal ?? HEADER_TOTAL, value: totalOf },
    ]
    table = { columns }
  }
  const valueFormat: AxisFormat | undefined = yAxisFormat ?? format

  // The end labels decide the right margin, so they are chosen on the value scale <Chart> will
  // build from the height, the top and bottom margins and the domain.
  const h = height ?? 280
  const top = margin?.top ?? MARGIN.top
  const bottom = margin?.bottom ?? MARGIN.bottom
  const ends = useMemo(() => {
    if (!endLabels) return undefined
    const scale = linearScale(resolvedDomain, [Math.max(0, h - top - bottom), 0])
    return endLabelsOf(rows, series, fmt, scale, explicitTimeDomain(x))
  }, [endLabels, resolvedDomain, h, top, bottom, rows, series, fmt, x])
  const right = ends
    ? END_GAP +
      Math.max(
        ...ends.flatMap((e) => [
          estimateWidth({ label: e.label } as Tick),
          e.value.length * END_VALUE_CHAR,
        ]),
      ) +
      END_PAD
    : MARGIN.right
  const m: Margin = { ...MARGIN, right, ...margin }
  // Stable specs keep <Chart>'s scales, and so the layout and the points, across re-renders.
  const xSpec = useMemo(() => xScaleOf(x), [x])
  const ySpec = useMemo(() => ({ domain: resolvedDomain }), [resolvedDomain])
  const totalLabel = messages.total ?? TOTAL

  return (
    <Chart<XRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={n === 0 ? NO_ROWS : rows}
      x={xSpec}
      y={ySpec}
      margin={m}
      height={h}
      dataTable={withTableOptions(table, dataTable)}
    >
      {grid ? <Grid ticks={yAxis === 'none' ? 'all' : yAxis} /> : null}
      <AreaMarks
        drawn={drawn}
        rows={rows}
        stacks={stacks}
        series={series}
        tones={tones}
        splitKey={splitKey}
        forecastLabel={forecastLabel}
        ends={ends}
        fmt={fmt}
        totalLabel={totalLabel}
        interactive={interactive}
      />
      {yAxis === 'none' ? null : <Axis side="left" ticks={yAxis} format={valueFormat} />}
      {xAxis === 'none' ? null : <Axis side="bottom" ticks={xAxis} format={xAxisFormat} />}
      {interactive && tooltip ? <Tooltip content={tooltipContent(tooltip)} /> : null}
      {children}
    </Chart>
  )
}

/** A drawable row: a complete row with a plot x. */
interface AreaColumn<D> {
  /** Position in the drawn rows (break rows included). */
  at: number
  row: XRow<D>
  /** Plot x in px. */
  x: number
  stack: Stack
  /** Per series its [from, to] in plot y px, clamped to the plot. */
  ys: [number, number][]
}

interface AreaPath {
  tone: Tone
  d: string
}

/** Everything the layers draw, in px; points and end labels can read the same columns. */
interface AreaLayout<D> {
  /** Drawable rows in axis order. */
  columns: AreaColumn<D>[]
  /** Per series (in order) its layer paths: solid parts, then hatched parts. */
  layers: { tone: Tone; solid: string[]; hatched: string[] }[]
  /** One path per boundary between neighbouring layers, over the solid parts. */
  separators: string[]
  /** Upper edges: every layer over the hatched parts, and an `accent-soft` top layer over the solid parts. */
  edges: AreaPath[]
  /** The split x when the split row is drawn. */
  splitX: number | undefined
}

/**
 * The layer geometry. Columns are cut into runs at incomplete rows, and each run into a solid
 * part (up to the split row) and a hatched part (from it); both parts share the split x, and a
 * part of one column draws nothing. A split row outside the time domain still divides the
 * columns, so all drawn columns after it are hatched, but has no x for the rule.
 */
function layoutAreas<D>(
  ctx: InternalChartContext,
  rows: readonly XRow<D>[],
  stacks: readonly (Stack | undefined)[],
  tones: readonly Tone[],
  splitKey: string | undefined,
): AreaLayout<D> {
  const layout: AreaLayout<D> = {
    columns: [],
    layers: tones.map((tone) => ({ tone, solid: [], hatched: [] })),
    separators: [],
    edges: [],
    splitX: undefined,
  }
  if (ctx.y.kind !== 'linear') return layout
  const linear = ctx.y.scale
  const yOf = (value: number) => clampToRange(linear, linear(value))

  // The first row with the split key is the real one; a break row after it repeats the key.
  const split = splitKey === undefined ? -1 : rows.findIndex((r) => r.key === splitKey)
  const splitRow = rows[split]
  layout.splitX = splitRow ? rowX(ctx, splitRow, 'StackedAreaChart') : undefined

  const solid: AreaColumn<D>[][] = []
  const hatched: AreaColumn<D>[][] = []
  let run: AreaColumn<D>[] = []
  const flush = () => {
    const before = split < 0 ? run : run.filter((c) => c.at <= split)
    const after = split < 0 ? [] : run.filter((c) => c.at >= split)
    if (before.length > 1) solid.push(before)
    if (after.length > 1) hatched.push(after)
    run = []
  }
  rows.forEach((row, at) => {
    const stack = stacks[at]
    const x = stack ? rowX(ctx, row, 'StackedAreaChart') : undefined
    if (!stack || x === undefined) {
      flush()
      return
    }
    const column: AreaColumn<D> = {
      at,
      row,
      x,
      stack,
      ys: stack.extents.map(([from, to]): [number, number] => [yOf(from), yOf(to)]),
    }
    layout.columns.push(column)
    run.push(column)
  })
  flush()

  const ys = (c: AreaColumn<D>, k: number) => c.ys[k] ?? [0, 0]
  const band = (part: AreaColumn<D>[], k: number) =>
    bandPath(part.map((c) => ({ x: c.x, low: ys(c, k)[0], high: ys(c, k)[1] })))
  const upper = (parts: AreaColumn<D>[][], k: number) =>
    parts.map((part) => linePath(part.map((c) => ({ x: c.x, y: ys(c, k)[1] })))).join('')

  layout.layers.forEach((layer, k) => {
    layer.solid = solid.map((part) => band(part, k))
    layer.hatched = hatched.map((part) => band(part, k))
  })
  if (solid.length > 0) {
    layout.separators = tones.slice(0, -1).map((_, k) => upper(solid, k))
  }
  if (hatched.length > 0) {
    layout.edges = tones.map((tone, k) => ({ tone, d: upper(hatched, k) }))
  }
  // A solid accent-soft keeps no 3:1 edge on the surface by itself: rule the top layer, as
  // theme.css outlines solid accent-soft bars. Lower layers end at a separator.
  const top = tones.length - 1
  if (solid.length > 0 && tones[top] === 'accent-soft') {
    layout.edges.push({ tone: 'accent-soft', d: upper(solid, top) })
  }
  return layout
}

/**
 * Inside <Chart>: the layers, the end labels and, when interactive, one point per x with the
 * cursor. They share one layout.
 */
function AreaMarks<D>({
  drawn,
  rows,
  stacks,
  series,
  tones,
  splitKey,
  forecastLabel,
  ends,
  fmt,
  totalLabel,
  interactive,
}: {
  /** The rows with break rows, which the layers draw. */
  drawn: readonly XRow<D>[]
  /** The rows without break rows, one point each. */
  rows: readonly XRow<D>[]
  stacks: readonly (Stack | undefined)[]
  series: readonly AreaSeries<D>[]
  tones: readonly Tone[]
  splitKey: string | undefined
  forecastLabel: string | undefined
  ends: readonly EndLabel[] | undefined
  fmt: Formatter
  totalLabel: string
  interactive: boolean
}) {
  const ctx = useChartContext('StackedAreaChart')
  const { x: xScale, y: yScale } = ctx
  // The layout reads only the scales (and warns through the chart's warner, which is stable).
  // biome-ignore lint/correctness/useExhaustiveDependencies: ctx is a new object on every render; the scales are what the layout depends on
  const layout = useMemo(
    () => layoutAreas(ctx, drawn, stacks, tones, splitKey),
    [xScale, yScale, drawn, stacks, tones, splitKey],
  )
  return (
    <>
      <AreaLayers ctx={ctx} layout={layout} forecastLabel={forecastLabel} />
      {ends ? <EndLabels ctx={ctx} ends={ends} /> : null}
      {interactive ? (
        <AreaPoints
          ctx={ctx}
          layout={layout}
          rows={rows}
          series={series}
          tones={tones}
          fmt={fmt}
          totalLabel={totalLabel}
        />
      ) : null}
    </>
  )
}

/** Each pair at the right of the plot: the series name, and under it the last value. */
function EndLabels({ ctx, ends }: { ctx: InternalChartContext; ends: readonly EndLabel[] }) {
  if (ctx.y.kind !== 'linear') return null
  const scale = ctx.y.scale
  const x = round2(ctx.innerWidth + END_GAP)
  return (
    <>
      {ends.map((e, k) => {
        const mid = (plotY(scale, e.from) + plotY(scale, e.to)) / 2
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: series labels may repeat, the position keeps keys unique
          <Fragment key={k}>
            {/* The pair is centred on the midpoint: the name above it, the value below. */}
            <text
              data-ch-part="end-label"
              x={x}
              y={round2(mid - END_LABEL_RISE)}
              textAnchor="start"
            >
              {e.label}
            </text>
            <text
              data-ch-part="end-value"
              x={x}
              y={round2(mid + END_VALUE_DROP)}
              textAnchor="start"
            >
              {e.value}
            </text>
          </Fragment>
        )
      })}
    </>
  )
}

/**
 * One point per row with a finite value, at the top of the stack (the top of the plot for an
 * incomplete row), listing the series top layer first and then the total; the pointer snaps
 * along x. The active x gets a cursor from the baseline to the top of the stack and a dot on
 * each layer's upper edge.
 */
function AreaPoints<D>({
  ctx,
  layout,
  rows,
  series,
  tones,
  fmt,
  totalLabel,
}: {
  ctx: InternalChartContext
  layout: AreaLayout<D>
  rows: readonly XRow<D>[]
  series: readonly AreaSeries<D>[]
  tones: readonly Tone[]
  fmt: Formatter
  totalLabel: string
}) {
  const { x: xScale } = ctx
  const columns = useMemo(
    () => new Map(layout.columns.map((c): [XRow<D>, AreaColumn<D>] => [c.row, c])),
    [layout],
  )
  // rowX reads the x scale; the layout covers the y scale.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ctx is a new object on every render; the x scale is what rowX depends on
  const points = useMemo(
    () =>
      rows.flatMap((row, index): ChartPoint[] => {
        const shown = series
          .flatMap((s, k) => {
            const value = row.values[k] ?? Number.NaN
            return Number.isFinite(value)
              ? [{ text: fmt(value), label: s.label, tone: tones[k] as Tone }]
              : []
          })
          .reverse()
        if (shown.length === 0) return []
        const column = columns.get(row)
        const x = column ? column.x : rowX(ctx, row, 'StackedAreaChart')
        if (x === undefined) return []
        const top = column ? (column.ys.at(-1)?.[1] ?? 0) : 0
        const total = column ? fmt(column.stack.total) : undefined
        const segments: TooltipSegment[] = [
          { value: row.label },
          ...shown.map((s) => ({ value: s.text, label: s.label, tone: s.tone })),
          ...(total === undefined ? [] : [{ value: total, label: totalLabel }]),
        ]
        const parts = [
          row.label,
          ...shown.map((s) => `${s.text} ${s.label}`),
          ...(total === undefined ? [] : [`${total} ${totalLabel}`]),
        ]
        return [
          {
            id: row.key,
            index,
            datum: row,
            x,
            y: top,
            hitX: x,
            hitY: top,
            label: parts.join(', '),
            segments,
          },
        ]
      }),
    [xScale, columns, rows, series, tones, fmt, totalLabel],
  )
  useRegisterPoints(points)

  const active =
    ctx.activeId === null ? undefined : points.find((p) => p.id === String(ctx.activeId))
  const column = active ? columns.get(active.datum as XRow<D>) : undefined
  const baseline = ctx.y.kind === 'linear' ? plotY(ctx.y.scale, 0) : ctx.innerHeight
  const cx = active ? round2(active.x) : 0
  return (
    <>
      {active ? (
        <>
          <line data-ch-part="cursor" x1={cx} x2={cx} y1={round2(baseline)} y2={round2(active.y)} />
          {column?.ys.map(([, to], k) => (
            <circle
              // biome-ignore lint/suspicious/noArrayIndexKey: one dot per layer, in order
              key={k}
              data-ch-part="cursor-dot"
              data-ch-tone={tones[k]}
              cx={cx}
              cy={round2(to)}
              r={CURSOR_DOT}
              style={
                {
                  fill: `var(--ch-${tones[k]})`,
                  '--_ch-swatch-color': `var(--ch-${tones[k]})`,
                } as CSSProperties
              }
            />
          ))}
        </>
      ) : null}
      <NearestPointer
        axis="x"
        radius={snapRadius(
          ctx,
          points.map((p) => p.x),
        )}
      />
    </>
  )
}

/**
 * Per series the layer paths (solid, then hatched from the split x), the surface separators, the
 * upper edges, and the forecast rule with its label.
 */
function AreaLayers<D>({
  ctx,
  layout,
  forecastLabel,
}: {
  ctx: InternalChartContext
  layout: AreaLayout<D>
  forecastLabel: string | undefined
}) {
  const { layers, separators, edges, splitX } = layout

  const paint = (tone: Tone, fill: Fill) =>
    ({
      fill: paintFor(ctx.chartId, tone, fill).fill,
      '--_ch-swatch-color': `var(--ch-${tone})`,
    }) as CSSProperties
  const half = forecastLabel ? estimateWidth({ label: forecastLabel } as Tick) / 2 : 0

  return (
    <g data-ch-part="area-layers">
      {layers.map((layer, k) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: series ids may repeat (warned about), the position keeps keys unique
        <Fragment key={k}>
          {layer.solid.map((d, r) => (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: parts have no id of their own
              key={`s${r}`}
              data-ch-part="area-layer"
              data-ch-tone={layer.tone}
              data-ch-fill="solid"
              d={d}
              style={paint(layer.tone, 'solid')}
            />
          ))}
          {layer.hatched.map((d, r) => (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: parts have no id of their own
              key={`h${r}`}
              data-ch-part="area-layer"
              data-ch-tone={layer.tone}
              data-ch-fill="hatch"
              d={d}
              style={paint(layer.tone, 'hatch')}
            />
          ))}
        </Fragment>
      ))}
      {/* Between neighbouring layers only: none on the top edge, none along the baseline. */}
      {separators.map((d, k) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: one separator per boundary, in order
        <path key={k} data-ch-part="area-separator" d={d} />
      ))}
      {edges.map((edge, k) => (
        <path
          // biome-ignore lint/suspicious/noArrayIndexKey: tones may repeat, the position keeps keys unique
          key={k}
          data-ch-part="area-edge"
          data-ch-tone={edge.tone}
          d={edge.d}
          style={{ '--_ch-swatch-color': `var(--ch-${edge.tone})` } as CSSProperties}
        />
      ))}
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
