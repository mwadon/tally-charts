import { Fragment, useMemo } from 'react'
import { resolveAccessor, resolveIds, resolvePerItem } from '../../core/accessor'
import { type StackRow, type StackSegment, stackRow } from '../../core/bars'
import type { FormatSpec } from '../../core/format'
import { clampToRange, niceDomain } from '../../core/linear'
import { type BandScaleSpec, inferLinearDomain, type LinearScaleSpec } from '../../core/scale'
import type { TickSpec } from '../../core/ticks'
import type { Accessor, Fill, Id, PerItem, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { Chart, type ChartName } from '../Chart'
import { useFormat, useMessages } from '../ChartsProvider'
import { type Margin, useChartContext } from '../context'
import type { DataTableSpec } from '../DataTable'
import { Axis, type AxisFormat } from '../marks/Axis'
import { Bars } from '../marks/Bars'
import { Grid } from '../marks/Grid'
import { Target } from '../marks/Target'
import { HEADER_CATEGORY, HEADER_TOTAL, TOTAL } from '../messages'
import { Tooltip } from '../overlays/Tooltip'
import type { ChartPoint } from '../types'
import { toneVar } from '../ui/util'
import { useRegisterPoints } from '../useRegisterPoints'
import { type BarSeries, seriesTones, VerticalGrid, warnSeries } from './bar-series'
import {
  type ChartPassThroughProps,
  type ChartTooltip,
  type DataTableOptions,
  headerOf,
  toNumber,
  tooltipContent,
  withTableOptions,
} from './shared'

export type StackedBarChartProps<D> = ChartName &
  ChartPassThroughProps<D> & {
    data: readonly D[]
    /** Category field: the band axis in both orientations. One row is one stack. */
    x: Accessor<D, string | number>
    /** One segment per series in every stack; the first series sits on the baseline. */
    series: readonly BarSeries<D>[]
    /** Row id. A segment's id is `${rowId}:${series.id}`. Default: the data index. */
    id?: Accessor<D, Id>
    /** Category label for tooltips, announcements and the data table. Defaults to `x`. */
    label?: Accessor<D, string>
    /** Default 'vertical'. */
    orientation?: 'vertical' | 'horizontal'
    /** Value domain. Default: every stack total and the target, including zero, nice ticks. */
    domain?: readonly [number, number]
    /**
     * A target value, optionally with a label. `over` paints the part of each stack beyond the
     * target in that tone (usually 'loss') and gives the total label the same tone.
     */
    target?: number | { value: number; label?: string; over?: Tone }
    /** Fill for every segment of a row; `undefined` keeps each series' own fill. */
    fill?: PerItem<D, Fill | undefined>
    /** 'total' labels each stack with its total. Default 'total'. */
    valueLabel?: 'total' | 'none'
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
    /** Padding between stacks, 0–1 of the step. Default 0.3. */
    padding?: number
    /** Gap between the segments of a stack in px. Default 2. */
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

/** Row height of a horizontal chart: one bar and the space between rows. */
const BAR_THICKNESS = 20
const ROW_PADDING = 20
const NO_ROWS: readonly never[] = []

export function StackedBarChart<D>({
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
  gap = 2,
  margin,
  height,
  children,
  label,
  valueLabel = 'total',
  valueFormat,
  dataTable = true,
  tooltip = true,
  ...chart
}: StackedBarChartProps<D>) {
  const warn = useMemo(() => createWarner(), [])
  const { create } = useFormat()
  const messages = useMessages()
  const vertical = orientation === 'vertical'
  const segmentGap = Number.isFinite(gap) && gap > 0 ? gap : 0
  const targetSpec = typeof target === 'number' ? { value: target } : target
  const targetValue = targetSpec?.value
  const overTone = targetSpec && 'over' in targetSpec ? targetSpec.over : undefined
  // `over` only means something above a positive target.
  const over = overTone && targetValue !== undefined && targetValue > 0 ? overTone : undefined
  if (DEV) {
    warnSeries(series, warn, 'StackedBarChart', 'stacked')
    if (series.length > 5) {
      warn(
        'stacked-series-count',
        `StackedBarChart has ${series.length} series; tones repeat from 6.`,
      )
    }
    if (overTone && !over) {
      warn(
        'stacked-target-over',
        'StackedBarChart ignores `target.over` unless the target is above zero.',
      )
    }
  }

  const getters = useMemo(() => series.map((s) => resolveAccessor(s.value)), [series])
  // Every row stacked once; the domain, the layers and the labels all read these.
  const stacked = useMemo(() => {
    let missing: { index: number; series: number } | undefined
    const rows = data.map((d, i) =>
      stackRow(
        getters.map((getter, k) => {
          const value = toNumber(getter(d, i))
          if (!Number.isFinite(value) && !missing) missing = { index: i, series: k }
          return value
        }),
      ),
    )
    return { rows, missing }
  }, [data, getters])
  if (DEV && stacked.missing) {
    const { index, series: k } = stacked.missing
    const value = series[k]?.value
    const field = typeof value === 'string' ? value : (series[k]?.id ?? '')
    warn(
      'stacked-value',
      `StackedBarChart skipped a missing or non-numeric value for field "${field}" at index ${index}.`,
    )
  }

  const valueTicks = typeof valueAxis === 'number' ? valueAxis : undefined
  const valueDomain = useMemo((): readonly [number, number] => {
    if (domain) return domain
    const values: number[] = []
    for (const row of stacked.rows) values.push(row.positive, row.negative)
    if (targetValue !== undefined) values.push(targetValue)
    return niceDomain(inferLinearDomain(values, true), valueTicks)
  }, [domain, stacked, targetValue, valueTicks])

  // Stable scale specs, so the chart keeps its scales (and the marks their layout) across renders.
  const band = useMemo((): BandScaleSpec<D> => ({ type: 'band', field: x, padding }), [x, padding])
  const linear = useMemo((): LinearScaleSpec<D> => ({ domain: valueDomain }), [valueDomain])
  const showValueAxis = valueAxis !== 'none'
  const m: Margin = {
    ...(vertical
      ? { top: 24, right: 0, bottom: 28, left: showValueAxis ? 40 : 0 }
      : { top: 8, right: 48, bottom: showValueAxis ? 28 : 8, left: 96 }),
    ...margin,
  }
  const rows = Math.max(1, data.length)
  const autoHeight =
    !vertical && chart.aspectRatio === undefined
      ? rows * (BAR_THICKNESS + ROW_PADDING) + m.top + m.bottom
      : undefined
  const valueFmt: AxisFormat | undefined = valueAxisFormat ?? format

  let table: DataTableSpec<D> | undefined
  if (dataTable) {
    const getCategory = resolveAccessor(x)
    const getLabel = label ? resolveAccessor(label) : undefined
    const formatValue = create(format)
    table = {
      columns: [
        {
          header: headerOf(x, messages.headerCategory ?? HEADER_CATEGORY),
          value: (d, i) => String((getLabel ? getLabel(d, i) : getCategory(d, i)) ?? ''),
        },
        ...series.map((s, k) => ({
          header: s.label,
          value: (d: D, i: number) => {
            const value = toNumber((getters[k] as (d: D, i: number) => unknown)(d, i))
            return Number.isFinite(value) ? formatValue(value) : ''
          },
        })),
        {
          header: messages.headerTotal ?? HEADER_TOTAL,
          value: (_: D, i: number) => formatValue(stacked.rows[i]?.total ?? 0),
        },
      ],
    }
  }

  return (
    <Chart<D>
      {...chart}
      data={series.length === 0 ? NO_ROWS : data}
      dataTable={withTableOptions(table, dataTable)}
      x={vertical ? band : linear}
      y={vertical ? linear : band}
      margin={m}
      height={height ?? autoHeight}
    >
      {/* The grid does not follow the value axis: without one it rules the default ticks. */}
      {grid ? (
        vertical ? (
          <Grid ticks={showValueAxis ? valueAxis : 'all'} />
        ) : (
          <VerticalGrid ticks={showValueAxis ? valueAxis : 'all'} chart="StackedBarChart" />
        )
      ) : null}
      {targetSpec ? (
        <Target
          {...(vertical ? { y: targetSpec.value } : { x: targetSpec.value })}
          label={targetSpec.label}
        />
      ) : null}
      <StackedLayers<D>
        series={series}
        stacks={stacked.rows}
        id={id}
        rowFill={fill}
        gap={segmentGap}
        vertical={vertical}
        target={over ? targetValue : undefined}
        over={over}
        label={label}
        format={format}
      />
      {valueLabel === 'total' ? (
        <StackedTotals<D>
          stacks={stacked.rows}
          vertical={vertical}
          target={over ? targetValue : undefined}
          over={over}
          format={valueFormat ?? format}
        />
      ) : null}
      {showValueAxis ? (
        <Axis side={vertical ? 'left' : 'bottom'} ticks={valueAxis} format={valueFmt} />
      ) : null}
      {axis === 'none' ? null : (
        <Axis side={vertical ? 'bottom' : 'left'} ticks={axis} format={axisFormat} />
      )}
      {tooltip ? <Tooltip content={tooltipContent(tooltip, false)} /> : null}
      {children}
    </Chart>
  )
}

/** One drawn piece of a segment: the whole segment, or one side of it split at the target. */
interface Piece {
  category: string
  from: number
  to: number
  id: string
  fill: Fill
}

// Module-level accessors, so every layer passes `Bars` the same functions on every render.
const pieceCategory = (p: Piece) => p.category
const pieceTo = (p: Piece) => p.to
const pieceFrom = (p: Piece) => p.from
const pieceId = (p: Piece) => p.id
const pieceFill = (p: Piece) => p.fill

interface StackedLayersProps<D> {
  series: readonly BarSeries<D>[]
  stacks: readonly StackRow[]
  id: Accessor<D, Id> | undefined
  rowFill: PerItem<D, Fill | undefined> | undefined
  gap: number
  vertical: boolean
  /** The target, only when `over` is set (and the target is above zero). */
  target: number | undefined
  over: Tone | undefined
  label: Accessor<D, string> | undefined
  format: FormatSpec | undefined
}

/** The pieces of a segment: split in two at the target when it crosses it, else the whole. */
function piecesOf(seg: StackSegment, target: number | undefined) {
  if (target !== undefined && seg.value > 0 && seg.from < target && seg.to > target) {
    return [
      { series: seg.series, from: seg.from, to: target, over: false },
      { series: seg.series, from: target, to: seg.to, over: true },
    ]
  }
  const isOver = target !== undefined && seg.value > 0 && seg.from >= target
  return [{ series: seg.series, from: seg.from, to: seg.to, over: isOver }]
}

/** Px per value unit of a linear scale; NaN for a degenerate one. */
function pxPerUnitOf(scale: { domain(): number[]; range(): number[] }) {
  const [d0 = 0, d1 = 0] = scale.domain()
  const [r0 = 0, r1 = 0] = scale.range()
  return Math.abs(r1 - r0) / Math.abs(d1 - d0)
}

/**
 * Gives up `gap` px at the far end of a piece that is not the outermost of its direction; a piece
 * not longer than gap + 1 px keeps 1 px, and so does a shorter outermost piece.
 */
function shrink(from: number, to: number, gap: number, outermost: boolean, pxPerUnit: number) {
  if (!(pxPerUnit > 0) || !Number.isFinite(pxPerUnit)) return to
  const length = Math.abs(to - from) * pxPerUnit
  const kept = outermost ? Math.max(1, length) : length <= gap + 1 ? 1 : length - gap
  if (kept === length) return to
  return from + (Math.sign(to - from) * kept) / pxPerUnit
}

// Inside <Chart>: the gap is in px, so it needs the value scale to become value units.
function StackedLayers<D>({
  series,
  stacks,
  id,
  rowFill,
  gap,
  vertical,
  target,
  over,
  label,
  format,
}: StackedLayersProps<D>) {
  const ctx = useChartContext('StackedBarChart')
  const data = ctx.data as readonly D[]
  const bandScale = vertical ? ctx.x : ctx.y
  const valueScale = vertical ? ctx.y : ctx.x
  const rowIds = useMemo(() => resolveIds(data, id, ctx.warn), [data, id, ctx.warn])
  const rowFillOf = useMemo(() => resolvePerItem(rowFill ?? undefined), [rowFill])
  const tones = useMemo(() => seriesTones(series), [series])

  // Per series, its base pieces and its over pieces, row by row.
  const layers = useMemo(() => {
    const out = series.map(() => ({ base: [] as Piece[], over: [] as Piece[] }))
    const category = bandScale.field
    if (valueScale.kind !== 'linear' || !category) return out
    const pxPerUnit = pxPerUnitOf(valueScale.scale)
    data.forEach((d, i) => {
      const stack = stacks[i]
      if (!stack) return
      const pieces = stack.segments.flatMap((seg) => piecesOf(seg, target))
      let lastUp = -1
      let lastDown = -1
      pieces.forEach((p, k) => {
        if (p.to > p.from) lastUp = k
        else lastDown = k
      })
      const name = String(category(d, i))
      const rowFillValue = rowFillOf(d, i, data) as Fill | undefined
      pieces.forEach((p, k) => {
        const s = series[p.series] as BarSeries<D>
        const layer = out[p.series] as (typeof out)[number]
        const piece: Piece = {
          category: name,
          from: p.from,
          to: shrink(p.from, p.to, gap, k === lastUp || k === lastDown, pxPerUnit),
          id: `${rowIds[i]}:${s.id}`,
          fill: p.over ? 'solid' : (rowFillValue ?? s.fill ?? 'solid'),
        }
        ;(p.over ? layer.over : layer.base).push(piece)
      })
    })
    return out
  }, [series, stacks, data, bandScale, valueScale, rowIds, rowFillOf, gap, target])

  const valueProps = vertical ? { x: pieceCategory, y: pieceTo } : { x: pieceTo, y: pieceCategory }
  return (
    <>
      {layers.map((layer, k) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: series ids may repeat (warned about), the position keeps keys unique
        <Fragment key={k}>
          <Bars<Piece>
            data={layer.base}
            {...valueProps}
            from={pieceFrom}
            id={pieceId}
            tone={tones[k] as Tone}
            fill={pieceFill}
            interactive={false}
          />
          {over ? (
            <Bars<Piece>
              data={layer.over}
              {...valueProps}
              from={pieceFrom}
              id={pieceId}
              tone={over}
              fill="solid"
              interactive={false}
            />
          ) : null}
        </Fragment>
      ))}
      <StackedPoints<D>
        series={series}
        stacks={stacks}
        rowIds={rowIds}
        tones={tones}
        gap={gap}
        vertical={vertical}
        target={target}
        label={label}
        format={format}
      />
    </>
  )
}

interface StackedPointsProps<D> {
  series: readonly BarSeries<D>[]
  stacks: readonly StackRow[]
  rowIds: readonly Id[]
  tones: readonly Tone[]
  gap: number
  vertical: boolean
  target: number | undefined
  label: Accessor<D, string> | undefined
  format: FormatSpec | undefined
}

/** A segment's place: its row, its band, and where its hit area ends on the value axis. */
interface SegmentSpot {
  row: number
  seg: StackSegment
  id: string
  bandStart: number
  /** The value where the hit area meets the next segment outwards; `undefined` for the outermost. */
  end: number | undefined
  /** Whether the row has a segment on the other side of zero. */
  opposite: boolean
}

/**
 * One point and one hit area per segment, row by row and in series order inside. A segment's hit
 * area spans its band and, on the value axis, runs from its neighbour inwards to its neighbour
 * outwards, meeting each in the middle of the gap; the outermost segment of each side reaches into
 * the margin, so the hit areas of a stack cover the whole chart.
 */
function StackedPoints<D>({
  series,
  stacks,
  rowIds,
  tones,
  gap,
  vertical,
  target,
  label,
  format,
}: StackedPointsProps<D>) {
  const ctx = useChartContext('StackedBarChart')
  const data = ctx.data as readonly D[]
  const bandScale = vertical ? ctx.x : ctx.y
  const valueScale = vertical ? ctx.y : ctx.x
  const fmt = useMemo(() => ctx.format(format), [ctx.format, format])
  const messages = useMessages()
  const totalLabel = messages.total ?? TOTAL

  const spots = useMemo(() => {
    const out: SegmentSpot[] = []
    const category = bandScale.field
    if (bandScale.kind !== 'band' || valueScale.kind !== 'linear' || !category) return out
    const pxPerUnit = pxPerUnitOf(valueScale.scale)
    data.forEach((d, i) => {
      const stack = stacks[i]
      if (!stack || stack.segments.length === 0) return
      const bandStart = bandScale.scale(String(category(d, i)))
      if (bandStart === undefined) return
      let lastUp = -1
      let lastDown = -1
      stack.segments.forEach((seg, k) => {
        if (seg.value > 0) lastUp = k
        else lastDown = k
      })
      stack.segments.forEach((seg, k) => {
        const outermost = k === lastUp || k === lastDown
        // The drawn end of the segment's far piece, as `StackedLayers` shrinks it.
        const far = piecesOf(seg, target).at(-1) as { from: number; to: number }
        const drawn = shrink(far.from, far.to, gap, outermost, pxPerUnit)
        out.push({
          row: i,
          seg,
          id: `${rowIds[i]}:${(series[seg.series] as BarSeries<D>).id}`,
          bandStart,
          end: outermost ? undefined : (drawn + seg.to) / 2,
          opposite: seg.value > 0 ? lastDown >= 0 : lastUp >= 0,
        })
      })
    })
    return out
  }, [series, stacks, data, bandScale, valueScale, rowIds, gap, target])

  const points: ChartPoint[] = useMemo(() => {
    const category = bandScale.field
    const getLabel = label ? resolveAccessor(label) : undefined
    return spots.map(({ row, seg, id, bandStart }) => {
      const s = series[seg.series] as BarSeries<D>
      const datum = data[row] as D
      const name = getLabel ? getLabel(datum, row) : String(category ? category(datum, row) : '')
      const value = fmt(seg.value)
      const bandwidth = bandScale.kind === 'band' ? bandScale.scale.bandwidth() : 0
      const along =
        valueScale.kind === 'linear' ? clampToRange(valueScale.scale, valueScale.scale(seg.to)) : 0
      const across = bandStart + bandwidth / 2
      return {
        id,
        index: row,
        datum,
        x: vertical ? across : along,
        y: vertical ? along : across,
        series: s.label,
        seriesId: s.id,
        label: `${name}, ${value}`,
        segments: [
          { value: name },
          { label: s.label, value, tone: tones[seg.series] },
          { label: totalLabel, value: fmt((stacks[row] as StackRow).total) },
        ],
      }
    })
  }, [spots, series, data, label, fmt, bandScale, valueScale, vertical, tones, totalLabel, stacks])
  useRegisterPoints(points)

  if (bandScale.kind !== 'band' || valueScale.kind !== 'linear') return null
  const bandwidth = bandScale.scale.bandwidth()
  const scale = valueScale.scale
  // The value axis reaches into the margins: up (positive) and down (negative) edges in px.
  const upEdge = vertical ? -ctx.margin.top : ctx.innerWidth + ctx.margin.right
  const downEdge = vertical ? ctx.innerHeight + ctx.margin.bottom : -ctx.margin.left
  const lo = Math.min(upEdge, downEdge)
  const hi = Math.max(upEdge, downEdge)
  const px = (value: number) => Math.min(hi, Math.max(lo, scale(value)))
  // The inner end of each segment's hit area: the outer end of the previous one on its side.
  const inner = new Map<string, number>()

  return (
    <g>
      {spots.map((spot, k) => {
        const point = points[k] as ChartPoint
        const up = spot.seg.value > 0
        const side = `${spot.row}:${up ? 'up' : 'down'}`
        const start = inner.get(side) ?? (spot.opposite ? px(0) : up ? downEdge : upEdge)
        const end = spot.end === undefined ? (up ? upEdge : downEdge) : px(spot.end)
        inner.set(side, end)
        const a = Math.min(start, end)
        const size = Math.abs(end - start)
        const hit = vertical
          ? { x: spot.bandStart, y: a, width: bandwidth, height: size }
          : { x: a, y: spot.bandStart, width: size, height: bandwidth }
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: pointer-only hit area; keyboard selection lives on the focusable figure
          <rect
            key={`${spot.row}:${spot.seg.series}`}
            data-ch-part="bar-hit"
            data-ch-selectable={ctx.selectable ? 'true' : undefined}
            fill="transparent"
            {...hit}
            onPointerEnter={() => ctx.setActive(spot.id, 'pointer')}
            onClick={() => ctx.select(point)}
          />
        )
      })}
    </g>
  )
}

const LABEL_OFFSET = 6
/** Width of a character of a value label (13 px, weight 500), as in `GroupedBarChart`. */
const LABEL_CHAR_WIDTH = 8

interface StackedTotalsProps {
  stacks: readonly StackRow[]
  vertical: boolean
  target: number | undefined
  over: Tone | undefined
  format: FormatSpec | undefined
}

/** One total label per stack, just beyond the end of its positive part. */
function StackedTotals<D>({ stacks, vertical, target, over, format }: StackedTotalsProps) {
  const ctx = useChartContext('StackedBarChart')
  const data = ctx.data as readonly D[]
  const bandScale = vertical ? ctx.x : ctx.y
  const valueScale = vertical ? ctx.y : ctx.x
  const fmt = useMemo(() => ctx.format(format), [ctx.format, format])
  const category = bandScale.field
  if (bandScale.kind !== 'band' || valueScale.kind !== 'linear' || !category) return null
  const bandwidth = bandScale.scale.bandwidth()

  const labels: { key: number; text: string; along: number; across: number; tone?: Tone }[] = []
  data.forEach((d, i) => {
    const stack = stacks[i]
    if (!stack || stack.segments.length === 0) return
    const start = bandScale.scale(String(category(d, i)))
    if (start === undefined) return
    const end = clampToRange(valueScale.scale, valueScale.scale(stack.positive))
    const overTarget = over !== undefined && target !== undefined && stack.positive > target
    labels.push({
      key: i,
      text: fmt(stack.total),
      along: vertical ? end - LABEL_OFFSET : end + LABEL_OFFSET,
      across: start + bandwidth / 2,
      tone: overTarget ? over : undefined,
    })
  })
  // Labels wider than a column would run into their neighbours: draw none rather than some.
  if (vertical && labels.some((l) => l.text.length * LABEL_CHAR_WIDTH > bandwidth)) return null

  return (
    <g data-ch-part="value-labels">
      {labels.map((l) => (
        <text
          key={l.key}
          data-ch-part="value-label"
          data-ch-tone={l.tone}
          data-ch-tone-text={l.tone ? 'true' : undefined}
          style={l.tone ? toneVar(l.tone) : undefined}
          x={vertical ? l.across : l.along}
          y={vertical ? l.along : l.across}
          textAnchor={vertical ? 'middle' : 'start'}
          dominantBaseline={vertical ? undefined : 'middle'}
        >
          {l.text}
        </text>
      ))}
    </g>
  )
}
