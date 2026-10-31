import { useMemo } from 'react'
import { resolveAccessor, resolveIds } from '../../core/accessor'
import { medianOf, stackStrip } from '../../core/dots'
import type { FormatSpec, Formatter } from '../../core/format'
import { niceDomain } from '../../core/linear'
import { inferLinearDomain } from '../../core/scale'
import type { TickSpec } from '../../core/ticks'
import type { Accessor, Id, Tone } from '../../core/types'
import { createWarner, DEV, type Warn } from '../../core/warn'
import { Chart, type ChartName } from '../Chart'
import { useFormat, useMessages } from '../ChartsProvider'
import { type Margin, useChartContext } from '../context'
import type { DataTableSpec } from '../DataTable'
import { Axis, type AxisFormat } from '../marks/Axis'
import { type DotItem, Dots } from '../marks/Dots'
import { NearestPointer } from '../marks/NearestPointer'
import { RowLabels } from '../marks/RowLabels'
import { HEADER_ITEM } from '../messages'
import { Tooltip } from '../overlays/Tooltip'
import { toneVar } from '../ui/util'
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

export interface StripSeries<D> {
  /** Unique key; also part of each point id (`<id>:<row id>`). */
  id: string
  /** Row label, e.g. "Estimated". */
  label: string
  value: Accessor<D, number>
  tone?: Tone
}

export type StripPlotProps<D> = ChartName &
  Omit<ChartPassThroughProps<D>, 'aspectRatio'> & {
    data: readonly D[]
    /** One row of dots per series. */
    series: readonly StripSeries<D>[]
    /** Item id. Default: the data index. */
    id?: Accessor<D, Id>
    /** Item name for announcements and tooltips. */
    label?: Accessor<D, string>
    /** Default 'number'. */
    format?: FormatSpec
    /** Value domain. Default: the range of all values without forcing zero, rounded to nice ticks. */
    domain?: readonly [number, number]
    /** Dot radius in px. Default 4. */
    radius?: number
    /** Dashed median line and label per row. Default true. */
    median?: boolean
    /** Default 72. */
    rowHeight?: number
    /** Label column width in px. Default 96. */
    labelWidth?: number
    /** Value axis ticks, or 'none'. Default 5. */
    axis?: TickSpec | 'none'
    /** Axis label format. Default: `format`. */
    axisFormat?: AxisFormat
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

interface StripRow<D> {
  key: string
  rowId: Id
  datum: D
  index: number
  name: string
  values: number[]
}

const DEFAULT_TONES: readonly Tone[] = ['accent', 'loss', 'warn', 'gain', 'neutral', 'accent-soft']
/** Space between the lowest dots and the row's bottom edge, in px. */
const ROW_PAD = 6
/** Space kept free above a row's dots for its median label, in px. */
const MEDIAN_ROOM = 18
/** Space between a row's highest dot and its median label, in px. */
const MEDIAN_RISE = 8

function StripRows<D>(props: {
  rows: readonly StripRow<D>[]
  series: readonly StripSeries<D>[]
  radius: number
  median: boolean
  fmt: Formatter
  warn: Warn
}) {
  const ctx = useChartContext('StripPlot')
  if (ctx.x.kind !== 'linear' || ctx.y.kind !== 'band') return null
  const x = ctx.x.scale
  const band = ctx.y.scale
  const size = band.bandwidth()
  const items: DotItem[] = []
  const medians: {
    key: string
    x: number
    top: number
    bottom: number
    tone: Tone
    text: string
  }[] = []
  props.series.forEach((s, si) => {
    const start = band(s.id)
    if (start === undefined) return
    const tone = s.tone ?? (DEFAULT_TONES[si % DEFAULT_TONES.length] as Tone)
    const baseline = start + size - ROW_PAD
    const values = props.rows.map((r) => r.values[si])
    const placed = stackStrip({
      values,
      x,
      baseline,
      top: start + MEDIAN_ROOM,
      radius: props.radius,
    })
    if (DEV && placed.crowded) {
      props.warn('strip-crowded', 'StripPlot has more dots than fit in a row; they overlap.')
    }
    let top = baseline
    for (const d of placed.dots) {
      const row = props.rows[d.index]
      if (!row) continue
      const text = props.fmt(d.value)
      top = Math.min(top, d.cy - props.radius)
      items.push({
        key: `${s.id}:${row.key}`,
        id: `${s.id}:${String(row.rowId)}`,
        datum: row,
        cx: d.cx,
        cy: d.cy,
        tone,
        label: row.name ? `${row.name}, ${text}` : text,
        series: s.label,
        segments: row.name
          ? [{ value: s.label }, { value: row.name }, { value: text, tone }]
          : [{ value: s.label }, { value: text, tone }],
        group: { key: s.id, axis: 'horizontal' },
      })
    }
    const m = medianOf(values)
    if (props.median && Number.isFinite(m)) {
      const [r0, r1] = x.range()
      const mx = Math.min(Math.max(r0, r1), Math.max(Math.min(r0, r1), x(m)))
      medians.push({
        key: s.id,
        x: mx,
        top: Math.max(start, top - MEDIAN_RISE),
        bottom: baseline,
        tone,
        text: props.fmt(m),
      })
    }
  })
  return (
    <>
      <Dots dots={items} radius={props.radius} />
      {/* After the dots, so the dashes stay visible through a stack of same-tone dots. */}
      <g data-ch-part="medians">
        {medians.map((m) => (
          <g key={m.key} style={toneVar(m.tone)}>
            <line
              data-ch-part="median"
              data-ch-tone={m.tone}
              x1={m.x}
              x2={m.x}
              y1={m.top}
              y2={m.bottom}
            />
            <text
              data-ch-part="median-label"
              data-ch-tone={m.tone}
              x={m.x + 4}
              y={m.top}
              dominantBaseline="middle"
            >
              {m.text}
            </text>
          </g>
        ))}
      </g>
      <NearestPointer radius={Math.max(12, props.radius * 3)} />
    </>
  )
}

export function StripPlot<D>({
  data,
  series,
  id,
  label,
  format,
  domain,
  radius = 4,
  median = true,
  rowHeight = 72,
  labelWidth = 96,
  axis = 5,
  axisFormat,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: StripPlotProps<D>) {
  const { create } = useFormat()
  const messages = useMessages()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])

  const rows = useMemo(() => {
    const ids = resolveIds(data, id, warn)
    const getLabel = label ? resolveAccessor(label) : undefined
    const getters = series.map((s) => resolveAccessor(s.value))
    return data.map(
      (d, i): StripRow<D> => ({
        key: String(i),
        rowId: ids[i] ?? i,
        datum: d,
        index: i,
        name: getLabel ? String(getLabel(d, i) ?? '') : '',
        values: getters.map((get) => toNumber(get(d, i))),
      }),
    )
  }, [data, id, label, series, warn])

  const resolvedDomain =
    domain ??
    niceDomain(
      inferLinearDomain(
        rows.flatMap((r) => r.values),
        false,
      ),
    )
  const seriesRows = series.map((s) => ({ key: s.id, label: s.label }))
  const m: Margin = {
    top: 8,
    right: 16,
    bottom: axis === 'none' ? 0 : 28,
    left: labelWidth,
    ...margin,
  }
  const axisFmt: AxisFormat | undefined = axisFormat ?? format

  const table: DataTableSpec<StripRow<D>> | undefined = dataTable
    ? {
        columns: [
          { header: headerOf(label, messages.headerItem ?? HEADER_ITEM), value: (r) => r.name },
          ...series.map((s, si) => ({
            header: s.label,
            value: (r: StripRow<D>) => fmt(r.values[si] ?? Number.NaN),
          })),
        ],
      }
    : undefined

  return (
    <Chart<StripRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={{ domain: resolvedDomain }}
      y={{ type: 'band', domain: series.map((s) => s.id), padding: 0 }}
      margin={m}
      height={height ?? Math.max(1, series.length) * rowHeight + m.top + m.bottom}
      dataTable={withTableOptions(table, dataTable)}
    >
      <StripRows
        rows={rows}
        series={series}
        radius={radius}
        median={median}
        fmt={fmt}
        warn={warn}
      />
      <RowLabels data={seriesRows} y="key" text="label" maxWidth={labelWidth - 12} />
      {axis === 'none' ? null : <Axis side="bottom" ticks={axis} format={axisFmt} />}
      {tooltip ? <Tooltip content={tooltipContent(tooltip)} /> : null}
      {children}
    </Chart>
  )
}
