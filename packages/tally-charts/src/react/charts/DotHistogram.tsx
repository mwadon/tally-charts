import { tickStep } from 'd3-array'
import { useMemo } from 'react'
import { resolveAccessor, resolveIds } from '../../core/accessor'
import { binDots } from '../../core/dots'
import type { FormatSpec, Formatter } from '../../core/format'
import { niceDomain } from '../../core/linear'
import { inferLinearDomain } from '../../core/scale'
import type { Thresholds } from '../../core/thresholds'
import type { TickSpec } from '../../core/ticks'
import type { Accessor, Id, Tone } from '../../core/types'
import { createWarner, DEV, type Warn } from '../../core/warn'
import { Chart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import { type Margin, useChartContext } from '../context'
import type { DataTableColumn, DataTableSpec } from '../DataTable'
import { Axis, type AxisFormat } from '../marks/Axis'
import { type DotItem, Dots } from '../marks/Dots'
import { NearestPointer } from '../marks/NearestPointer'
import { Target } from '../marks/Target'
import { Callout } from '../overlays/Callout'
import { Tooltip } from '../overlays/Tooltip'
import type { TooltipSegment } from '../types'
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

export interface DotHistogramProps<D> extends Omit<ChartPassThroughProps<D>, 'aspectRatio'> {
  data: readonly D[]
  /** The binned value, e.g. margin. */
  value: Accessor<D, number>
  /** Passed to onSelect, onActiveChange and `calloutId`. Default: the data index. */
  id?: Accessor<D, Id>
  /** Item name for announcements and the default tooltip, e.g. "#5819". */
  label?: Accessor<D, string>
  /** Custom tooltip segments per item. */
  segments?: (d: D, i: number) => readonly TooltipSegment[]
  /** Tone per item: a `thresholds()` result or a function. Default 'accent'. */
  toneBy?: Thresholds | ((d: D, i: number) => Tone)
  /** Bin width in value units. Default: a nice step that gives about 50 bins. */
  binWidth?: number
  /** Value domain. Default: the data range including zero, rounded to nice ticks. */
  domain?: readonly [number, number]
  target?: number | { value: number; label?: string }
  /** Pin a callout with a stem to this item id. */
  calloutId?: Id
  /** Default 'number'. */
  format?: FormatSpec
  /** Value axis ticks, or 'none'. Default 6. */
  axis?: TickSpec | 'none'
  /** Axis label format. Default: `format`. */
  axisFormat?: AxisFormat
  /** Default 6. */
  maxRadius?: number
  /** Default 2. */
  minRadius?: number
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

interface HistogramRow<D> {
  key: string
  rowId: Id
  datum: D
  index: number
  value: number
  tone: Tone
  name: string
  aria: string
  /** The `toneBy` thresholds bin label, e.g. "Critical"; announced as the series. */
  group: string | undefined
  segments: readonly TooltipSegment[]
}

const MARGIN: Margin = { top: 28, right: 8, bottom: 28, left: 8 }
/** Space between the pinned pill and the tallest stack under it, in px. */
const CALLOUT_GAP = 6

function HistogramDots<D>(props: {
  rows: readonly HistogramRow<D>[]
  binWidth: number
  maxRadius: number
  minRadius: number
  calloutId: Id | undefined
  warn: Warn
}) {
  const ctx = useChartContext('DotHistogram')
  if (ctx.x.kind !== 'linear') return null
  const layout = binDots({
    values: props.rows.map((r) => r.value),
    x: ctx.x.scale,
    binWidth: props.binWidth,
    baseline: ctx.innerHeight,
    top: 0,
    maxRadius: props.maxRadius,
    minRadius: props.minRadius,
  })
  if (DEV && layout.crowded) {
    props.warn(
      'dot-histogram-crowded',
      'DotHistogram has more dots than fit; drawing them at the minimum size.',
    )
  }
  const items = layout.dots.flatMap((d): DotItem[] => {
    const row = props.rows[d.index]
    if (!row) return []
    return [
      {
        key: row.key,
        id: row.rowId,
        datum: row,
        cx: d.cx,
        cy: d.cy,
        tone: row.tone,
        label: row.aria,
        series: row.group,
        segments: row.segments,
        group: { key: d.bin, axis: 'vertical' },
      },
    ]
  })
  // The pinned pill rises above every stack it spans, not just its own.
  const clearance = (left: number, right: number) => {
    let limit = Number.POSITIVE_INFINITY
    for (const d of layout.dots) {
      if (d.cx + layout.radius < left || d.cx - layout.radius > right) continue
      limit = Math.min(limit, d.cy - layout.radius - CALLOUT_GAP)
    }
    return limit
  }
  return (
    <>
      <Dots dots={items} radius={layout.radius} />
      <NearestPointer radius={Math.max(12, layout.radius * 2 + 4)} />
      {props.calloutId !== undefined ? (
        <Callout id={props.calloutId} stem clearance={clearance} />
      ) : null}
    </>
  )
}

export function DotHistogram<D>({
  data,
  value,
  id,
  label,
  segments,
  toneBy,
  binWidth,
  domain,
  target,
  calloutId,
  format,
  axis = 6,
  axisFormat,
  maxRadius = 6,
  minRadius = 2,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: DotHistogramProps<D>) {
  const { create } = useFormat()
  const warn = useMemo(() => createWarner(), [])
  const fmt: Formatter = useMemo(() => create(format), [create, format])

  const rows = useMemo(() => {
    const getValue = resolveAccessor(value)
    const ids = resolveIds(data, id, warn)
    const getLabel = label ? resolveAccessor(label) : undefined
    return data.map((d, i): HistogramRow<D> => {
      const v = toNumber(getValue(d, i))
      const name = getLabel ? String(getLabel(d, i) ?? '') : ''
      const tone: Tone =
        typeof toneBy === 'function'
          ? toneBy(d, i)
          : toneBy
            ? (toneBy.toneOf(v) ?? 'neutral')
            : 'accent'
      const text = fmt(v)
      return {
        key: String(i),
        rowId: ids[i] ?? i,
        datum: d,
        index: i,
        value: v,
        tone,
        name,
        aria: name ? `${name}, ${text}` : text,
        group:
          toneBy && typeof toneBy !== 'function'
            ? toneBy.bins[toneBy.indexOf(v)]?.label
            : undefined,
        segments: segments
          ? segments(d, i)
          : name
            ? [{ value: name }, { value: text }]
            : [{ value: text }],
      }
    })
  }, [data, value, id, label, segments, toneBy, fmt, warn])

  const missing = rows.find((r) => !Number.isFinite(r.value))
  if (DEV && missing) {
    warn(
      'dot-histogram-value',
      `DotHistogram skipped a missing or non-numeric value at index ${missing.index}.`,
    )
  }

  const resolvedDomain = domain ?? niceDomain(inferLinearDomain(rows.map((r) => r.value)))
  const [d0, d1] = resolvedDomain
  const width = binWidth ?? tickStep(Math.min(d0, d1), Math.max(d0, d1), 50)
  const targetSpec = typeof target === 'number' ? { value: target } : target
  const m: Margin = { ...MARGIN, ...margin }

  let table: DataTableSpec<HistogramRow<D>> | undefined
  if (dataTable) {
    const columns: DataTableColumn<HistogramRow<D>>[] = [
      { header: headerOf(label, 'Item'), value: (r) => r.name },
      { header: headerOf(value, 'Value'), value: (r) => fmt(r.value) },
    ]
    if (toneBy && typeof toneBy !== 'function') {
      columns.push({
        header: 'Group',
        value: (r) => r.group ?? '',
      })
    }
    table = { columns }
  }

  return (
    <Chart<HistogramRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={{ field: 'value', domain: resolvedDomain }}
      y={{ domain: [0, 1] }}
      margin={m}
      height={height ?? 220}
      dataTable={withTableOptions(table, dataTable)}
    >
      {targetSpec ? <Target x={targetSpec.value} label={targetSpec.label} /> : null}
      <HistogramDots
        rows={rows}
        binWidth={width}
        maxRadius={maxRadius}
        minRadius={minRadius}
        calloutId={calloutId}
        warn={warn}
      />
      {axis === 'none' ? null : <Axis side="bottom" ticks={axis} format={axisFormat ?? format} />}
      {tooltip ? <Tooltip content={tooltipContent(tooltip)} /> : null}
      {children}
    </Chart>
  )
}
