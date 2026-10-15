import { tickStep } from 'd3-array'
import { useMemo } from 'react'
import { resolveAccessor, resolveIds } from '../../core/accessor'
import type { FormatSpec, Formatter } from '../../core/format'
import type { Accessor, Id, Tone } from '../../core/types'
import { packWaffle } from '../../core/waffle'
import { createWarner, DEV, type Warn } from '../../core/warn'
import { Chart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import { type Margin, useChartContext } from '../context'
import type { DataTableColumn, DataTableSpec } from '../DataTable'
import { type DotItem, Dots } from '../marks/Dots'
import { NearestPointer } from '../marks/NearestPointer'
import { Callout } from '../overlays/Callout'
import { Tooltip } from '../overlays/Tooltip'
import type { ChartPoint, TooltipSegment } from '../types'
import { useRegisterPoints } from '../useRegisterPoints'
import { type ChartPassThroughProps, headerOf, toNumber, userCallbacks } from './shared'

export interface WaffleColumnsProps<D> extends Omit<ChartPassThroughProps<unknown>, 'aspectRatio'> {
  data: readonly D[]
  /** Period label, e.g. "Sep 7". */
  x: Accessor<D, string | number>
  /** Value per period. */
  y: Accessor<D, number>
  /** Passed to onSelect and onActiveChange. Default: the data index. */
  id?: Accessor<D, Id>
  /** Group of periods, e.g. the month; labelled under its columns. */
  group?: Accessor<D, string>
  /** Tone per group. Default: the last group 'loss', the others 'neutral'. */
  groupTone?: (group: string, index: number, groups: readonly string[]) => Tone
  /** Value of one dot. Default: a nice step that gives the tallest column about 12 dots. */
  unit?: number
  /** Dots across each column. Default 2. */
  wide?: number
  /** The largest column solid, the others soft. Default true. */
  peak?: boolean
  /** Pinned pill over the peak column: true for "Peak | <period> | <value>", or custom segments. Default true. */
  callout?: boolean | ((d: D) => TooltipSegment[])
  /** Default 'number'. */
  format?: FormatSpec
  /** Inner band padding, 0–1. Default 0.3. */
  padding?: number
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
  /** Default true. */
  tooltip?: boolean
}

interface WaffleRow<D> {
  key: string
  rowId: Id
  datum: D
  index: number
  label: string
  value: number
  group: string
  tone: Tone
  soft: boolean
}

const MARGIN: Margin = { top: 8, right: 0, bottom: 28, left: 0 }
/** Space between dots, in px. */
const GAP = 3
/** Smallest dot radius, in px; columns are capped at the dots that fit at this size. */
const MIN_RADIUS = 1.5

function WaffleBody<D>(props: {
  rows: readonly WaffleRow<D>[]
  unit: number
  wide: number
  fmt: Formatter
  warn: Warn
}) {
  const ctx = useChartContext('WaffleColumns')
  const band = ctx.x.kind === 'band' ? ctx.x.scale : undefined
  const counts = props.rows.map((r) => r.value / props.unit)
  const rowsFit = Math.floor(Math.max(0, ctx.innerHeight) / (2 * MIN_RADIUS + GAP))
  const cap = Math.max(props.wide, rowsFit * props.wide)
  if (DEV && counts.some((n) => Math.round(n) > cap)) {
    props.warn(
      'waffle-capped',
      `WaffleColumns has more dots than fit; columns are capped at ${cap} dots. Raise \`unit\`.`,
    )
  }
  const { cells, maxRows } = packWaffle(counts, props.wide, cap)
  const size = band ? band.bandwidth() : 0
  const cell = Math.max(0, Math.min(size / props.wide, ctx.innerHeight / Math.max(1, maxRows)))
  const radius = cells.length > 0 ? Math.max(MIN_RADIUS, cell / 2 - GAP / 2) : 0
  const columnRows = new Map<number, number>()
  const dots = band
    ? cells.flatMap((c): DotItem[] => {
        const row = props.rows[c.column]
        const start = row ? band(row.key) : undefined
        if (!row || start === undefined) return []
        columnRows.set(c.column, Math.max(columnRows.get(c.column) ?? 0, c.row + 1))
        const left = start + (size - props.wide * cell) / 2
        return [
          {
            key: `${row.key}:${c.dot}`,
            id: row.rowId,
            datum: row,
            cx: left + (c.col + 0.5) * cell,
            cy: ctx.innerHeight - (c.row + 0.5) * cell,
            tone: row.tone,
            soft: row.soft,
            label: row.label,
          },
        ]
      })
    : []
  const points: ChartPoint[] = band
    ? props.rows.flatMap((row, index) => {
        const start = band(row.key)
        if (start === undefined || !Number.isFinite(row.value)) return []
        const text = props.fmt(row.value)
        return [
          {
            id: row.rowId,
            index,
            datum: row,
            x: start + size / 2,
            y: ctx.innerHeight - (columnRows.get(index) ?? 0) * cell,
            label: `${row.label}, ${text}`,
            segments: [{ value: row.label }, { value: text, tone: row.tone }],
          },
        ]
      })
    : []
  useRegisterPoints(points)
  if (!band) return null
  return (
    <>
      <Dots dots={dots} radius={radius} interactive={false} />
      <NearestPointer axis="x" radius={band.step() / 2} />
    </>
  )
}

function GroupLabels<D>({ rows }: { rows: readonly WaffleRow<D>[] }) {
  const ctx = useChartContext('WaffleColumns')
  if (ctx.x.kind !== 'band') return null
  const band = ctx.x.scale
  const spans = new Map<string, { from: number; to: number; tone: Tone }>()
  for (const row of rows) {
    if (!row.group) continue
    const start = band(row.key)
    if (start === undefined) continue
    const span = spans.get(row.group)
    const end = start + band.bandwidth()
    spans.set(row.group, span ? { ...span, to: end } : { from: start, to: end, tone: row.tone })
  }
  return (
    <g data-ch-part="group-labels">
      {[...spans].map(([group, span]) => (
        <text
          key={group}
          data-ch-part="group-label"
          data-ch-tone={span.tone === 'neutral' ? undefined : span.tone}
          x={(span.from + span.to) / 2}
          y={ctx.innerHeight + 10}
          textAnchor="middle"
          dominantBaseline="hanging"
          style={span.tone === 'neutral' ? undefined : { fill: `var(--ch-${span.tone})` }}
        >
          {group}
        </text>
      ))}
    </g>
  )
}

export function WaffleColumns<D>({
  data,
  x,
  y,
  id,
  group,
  groupTone,
  unit,
  wide = 2,
  peak = true,
  callout = true,
  format,
  padding = 0.3,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: WaffleColumnsProps<D>) {
  const { create } = useFormat()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])

  const rows = useMemo(() => {
    const getX = resolveAccessor(x)
    const getY = resolveAccessor(y)
    const ids = resolveIds(data, id, warn)
    const getGroup = group ? resolveAccessor(group) : undefined
    const base = data.map((d, i) => ({
      d,
      i,
      label: String(getX(d, i) ?? ''),
      value: toNumber(getY(d, i)),
      group: getGroup ? String(getGroup(d, i) ?? '') : '',
      rowId: ids[i] ?? i,
    }))
    const groups = [...new Set(base.map((b) => b.group).filter(Boolean))]
    const toneOf = (g: string): Tone => {
      if (!g) return 'loss'
      const gi = groups.indexOf(g)
      return groupTone ? groupTone(g, gi, groups) : gi === groups.length - 1 ? 'loss' : 'neutral'
    }
    let peakIndex = -1
    base.forEach((b, i) => {
      const best = base[peakIndex]
      if (Number.isFinite(b.value) && (!best || b.value > best.value)) peakIndex = i
    })
    return base.map(
      (b, i): WaffleRow<D> => ({
        key: String(i),
        rowId: b.rowId,
        datum: b.d,
        index: b.i,
        label: b.label,
        value: b.value,
        group: b.group,
        tone: toneOf(b.group),
        soft: peak && i !== peakIndex,
      }),
    )
  }, [data, x, y, id, group, groupTone, peak, warn])

  const missing = rows.find((r) => !Number.isFinite(r.value))
  if (DEV && missing) {
    warn(
      'waffle-value',
      `WaffleColumns skipped a missing or non-numeric value at index ${missing.index}.`,
    )
  }

  const max = Math.max(0, ...rows.map((r) => (Number.isFinite(r.value) ? r.value : 0)))
  const dotValue = unit !== undefined && unit > 0 ? unit : max > 0 ? tickStep(0, max, 12) : 1
  const peakRow = peak
    ? rows.reduce<WaffleRow<D> | undefined>(
        (best, r) => (Number.isFinite(r.value) && (!best || r.value > best.value) ? r : best),
        undefined,
      )
    : undefined
  const calloutSegments: TooltipSegment[] | undefined =
    peakRow && callout
      ? typeof callout === 'function'
        ? callout(peakRow.datum)
        : [{ value: 'Peak' }, { value: peakRow.label }, { value: fmt(peakRow.value) }]
      : undefined
  const across = Number.isFinite(wide) && wide >= 1 ? Math.floor(wide) : 2
  const m: Margin = { ...MARGIN, ...margin }

  let table: DataTableSpec<WaffleRow<D>> | undefined
  if (dataTable) {
    const columns: DataTableColumn<WaffleRow<D>>[] = [
      { header: headerOf(x, 'Period'), value: (r) => r.label },
      { header: headerOf(y, 'Value'), value: (r) => fmt(r.value) },
    ]
    if (group) columns.push({ header: headerOf(group, 'Group'), value: (r) => r.group })
    table = { columns }
  }

  return (
    <Chart<WaffleRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={{ type: 'band', field: 'key', padding }}
      y={{ domain: [0, 1] }}
      margin={m}
      height={height ?? 200}
      dataTable={table}
    >
      <WaffleBody rows={rows} unit={dotValue} wide={across} fmt={fmt} warn={warn} />
      {group ? <GroupLabels rows={rows} /> : null}
      {peakRow && calloutSegments ? (
        <Callout id={peakRow.rowId} segments={calloutSegments} placement="top" />
      ) : null}
      {tooltip ? <Tooltip /> : null}
      {children}
    </Chart>
  )
}
