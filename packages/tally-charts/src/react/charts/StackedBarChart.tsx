import { Fragment, type ReactElement, useMemo } from 'react'
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
  const missing = stacked.missing
  if (DEV && missing) {
    warn(
      'stacked-value',
      `StackedBarChart skipped a missing or non-numeric value for series "${series[missing.series]?.id}" at index ${missing.index}.`,
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
          // A row with every value missing has no total either, like its missing chart label.
          value: (d: D, i: number) =>
            getters.some((getter) => Number.isFinite(toNumber(getter(d, i))))
              ? formatValue(stacked.rows[i]?.total ?? 0)
              : '',
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
      <StackedMarks<D>
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
        totals={valueLabel === 'total'}
        totalFormat={valueFormat ?? format}
      />
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

/** The pieces of a segment: split in two at the target when it crosses it, else the whole. */
function piecesOf(seg: StackSegment, target: number | undefined) {
  if (target !== undefined && seg.value > 0 && seg.from < target && seg.to > target) {
    return [
      { from: seg.from, to: target, over: false },
      { from: target, to: seg.to, over: true },
    ]
  }
  const isOver = target !== undefined && seg.value > 0 && seg.from >= target
  return [{ from: seg.from, to: seg.to, over: isOver }]
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

/** A segment's place: its row, its band, and where its hit area ends on the value axis. */
interface SegmentSpot {
  row: number
  seg: StackSegment
  id: string
  /** The category, as the band scale reads it. */
  name: string
  bandStart: number
  /** The point: the band centre at the segment's far end. */
  x: number
  y: number
  /**
   * The value where the hit area meets the previous segment on its side, or zero when it is the
   * first on its side and the other side has segments; `undefined` for the opposite chart edge.
   */
  start: number | undefined
  /** The value where the hit area meets the next segment outwards; `undefined` for the outermost. */
  end: number | undefined
}

interface StackedMarksProps<D> {
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
  /** Draw the total labels. */
  totals: boolean
  totalFormat: FormatSpec | undefined
}

const LABEL_OFFSET = 6
/** Width of a character of a value label (13 px, weight 500), as in `GroupedBarChart`. */
const LABEL_CHAR_WIDTH = 8

/**
 * Inside <Chart>, where the scales exist: the segment layers, one point and one hit area per
 * segment, and the total labels. Each row is split into pieces and shrunk by the gap once; the
 * layers draw the pieces and the hit areas meet in the middle of the drawn gaps.
 *
 * Points and hit areas run row by row, in series order inside. A segment's hit area spans its band
 * and, on the value axis, runs from its neighbour inwards to its neighbour outwards; the outermost
 * segment of each side reaches into the margin, so the hit areas of a stack cover the whole chart.
 */
function StackedMarks<D>({
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
  totals,
  totalFormat,
}: StackedMarksProps<D>) {
  const ctx = useChartContext('StackedBarChart')
  const data = ctx.data as readonly D[]
  const bandScale = vertical ? ctx.x : ctx.y
  const valueScale = vertical ? ctx.y : ctx.x
  const rowIds = useMemo(() => resolveIds(data, id, ctx.warn), [data, id, ctx.warn])
  const rowFillOf = useMemo(() => resolvePerItem(rowFill ?? undefined), [rowFill])
  const tones = useMemo(() => seriesTones(series), [series])
  const fmt = useMemo(() => ctx.format(format), [ctx.format, format])
  const totalFmt = useMemo(() => ctx.format(totalFormat), [ctx.format, totalFormat])
  const messages = useMessages()
  const totalLabel = messages.total ?? TOTAL
  const category = bandScale.field

  // Per series its base and over pieces, and per segment its spot, row by row.
  const layout = useMemo(() => {
    const layers = series.map(() => ({ base: [] as Piece[], over: [] as Piece[] }))
    const spots: SegmentSpot[] = []
    if (bandScale.kind !== 'band' || valueScale.kind !== 'linear' || !category) {
      return { layers, spots }
    }
    const scale = valueScale.scale
    const [d0, d1] = scale.domain()
    const [r0, r1] = scale.range()
    const across = bandScale.scale.bandwidth() / 2
    const pxPerUnit = Math.abs(r1 - r0) / Math.abs(d1 - d0)
    data.forEach((d, i) => {
      const stack = stacks[i]
      const name = String(category(d, i))
      const bandStart = bandScale.scale(name)
      if (!stack || bandStart === undefined) return
      let lastUp = -1
      let lastDown = -1
      stack.segments.forEach((seg, k) => {
        if (seg.value > 0) lastUp = k
        else lastDown = k
      })
      const rowFillValue = rowFillOf(d, i, data) as Fill | undefined
      let upStart = lastDown >= 0 ? 0 : undefined
      let downStart = lastUp >= 0 ? 0 : undefined
      stack.segments.forEach((seg, k) => {
        const s = series[seg.series] as BarSeries<D>
        const layer = layers[seg.series] as (typeof layers)[number]
        const segId = `${rowIds[i]}:${s.id}`
        const outermost = k === lastUp || k === lastDown
        const pieces = piecesOf(seg, target)
        let drawn = seg.to
        pieces.forEach((p, j) => {
          // Only the far piece of the outermost segment keeps its whole length.
          drawn = shrink(p.from, p.to, gap, outermost && j === pieces.length - 1, pxPerUnit)
          ;(p.over ? layer.over : layer.base).push({
            category: name,
            from: p.from,
            to: drawn,
            id: segId,
            fill: p.over ? 'solid' : (rowFillValue ?? s.fill ?? 'solid'),
          })
        })
        const along = clampToRange(scale, scale(seg.to))
        const up = seg.value > 0
        const end = outermost ? undefined : (drawn + seg.to) / 2
        spots.push({
          row: i,
          seg,
          id: segId,
          name,
          bandStart,
          x: vertical ? bandStart + across : along,
          y: vertical ? along : bandStart + across,
          start: up ? upStart : downStart,
          end,
        })
        if (up) upStart = end
        else downStart = end
      })
    })
    return { layers, spots }
  }, [
    series,
    stacks,
    data,
    bandScale,
    valueScale,
    category,
    vertical,
    rowIds,
    rowFillOf,
    gap,
    target,
  ])
  const { layers, spots } = layout

  const points: ChartPoint[] = useMemo(() => {
    const getLabel = label ? resolveAccessor(label) : undefined
    return spots.map(({ row, seg, id, name: categoryName, x, y }) => {
      const s = series[seg.series] as BarSeries<D>
      const datum = data[row] as D
      const name = getLabel ? getLabel(datum, row) : categoryName
      const value = fmt(seg.value)
      return {
        id,
        index: row,
        datum,
        x,
        y,
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
  }, [spots, series, data, label, fmt, tones, totalLabel, stacks])
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

  // One total label per stack, just beyond the end of its positive part.
  const labels: ReactElement[] = []
  let labelsFit = true
  if (totals && category) {
    data.forEach((d, i) => {
      const stack = stacks[i]
      const start = bandScale.scale(String(category(d, i)))
      if (!stack || stack.segments.length === 0 || start === undefined) return
      const end = clampToRange(scale, scale(stack.positive))
      const along = vertical ? end - LABEL_OFFSET : end + LABEL_OFFSET
      const across = start + bandwidth / 2
      const text = totalFmt(stack.total)
      const tone = target !== undefined && stack.positive > target ? over : undefined
      // Labels wider than a column would run into their neighbours: draw none rather than some.
      if (vertical && text.length * LABEL_CHAR_WIDTH > bandwidth) labelsFit = false
      labels.push(
        <text
          // biome-ignore lint/suspicious/noArrayIndexKey: row ids may repeat (warned about), the row index keeps keys unique
          key={i}
          data-ch-part="value-label"
          data-ch-tone={tone}
          data-ch-tone-text={tone ? 'true' : undefined}
          style={tone ? toneVar(tone) : undefined}
          x={vertical ? across : along}
          y={vertical ? along : across}
          textAnchor={vertical ? 'middle' : 'start'}
          dominantBaseline={vertical ? undefined : 'middle'}
        >
          {text}
        </text>,
      )
    })
  }

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
      <g>
        {spots.map((spot, k) => {
          const point = points[k] as ChartPoint
          const up = spot.seg.value > 0
          const start = spot.start === undefined ? (up ? downEdge : upEdge) : px(spot.start)
          const end = spot.end === undefined ? (up ? upEdge : downEdge) : px(spot.end)
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
      {totals && labelsFit ? <g data-ch-part="value-labels">{labels}</g> : null}
    </>
  )
}
