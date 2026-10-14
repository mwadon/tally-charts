import { useMemo } from 'react'
import type { FormatSpec, Formatter } from '../../core/format'
import { niceDomain } from '../../core/linear'
import { inferLinearDomain } from '../../core/scale'
import { runningTotals } from '../../core/steps'
import type { Id, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { Chart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import { type Margin, useChart } from '../context'
import type { DataTableSpec } from '../DataTable'
import { Area } from '../marks/Area'
import { Axis } from '../marks/Axis'
import { Bars } from '../marks/Bars'
import { ColumnHighlight } from '../marks/ColumnHighlight'
import { Callout } from '../overlays/Callout'
import { Tooltip } from '../overlays/Tooltip'
import type { TooltipSegment } from '../types'
import { type ChartPassThroughProps, userCallbacks } from './shared'

export interface BridgeStart {
  label: string
  value: number
}

export interface BridgeStep {
  /** Column label, e.g. "After discount". */
  label: string
  /** The change, e.g. -260. */
  value: number
  /** Short word after the change, e.g. "discount" → "−$260 discount". */
  note?: string
  /** Passed to onSelect and onActiveChange. Default: the index in `steps`. */
  id?: Id
}

export interface BridgeChartProps<S extends BridgeStep = BridgeStep>
  extends Omit<ChartPassThroughProps<unknown>, 'aspectRatio'> {
  start: BridgeStart
  steps: readonly S[]
  /** Default 'number'. */
  format?: FormatSpec
  /** Text under each column total. Default: the signed change plus the note. */
  stepLabel?: (step: S) => string
  /** Solid, highlighted last column with an emphasized label. Default true. */
  highlightLast?: boolean
  /** A pill pinned above the last column, e.g. `$400 kept | 12.3% margin`. */
  callout?: TooltipSegment[]
  /** Gradient area joining the column totals. Default true. */
  area?: boolean
  /** Value domain. Default: zero to the largest total, rounded to nice ticks. */
  domain?: readonly [number, number]
  /** Inner band padding, 0–1. Default 0.45. */
  padding?: number
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
  /** Default true. */
  tooltip?: boolean
}

interface BridgeRow<S> {
  key: string
  rowId: Id
  kind: 'start' | 'step'
  /** Index in `steps`; -1 for the start column. */
  index: number
  datum: BridgeStart | S
  label: string
  /** Running total after the column. */
  total: number
  /** Top of the remaining bar: the lower of the totals before and after. */
  base: number
  /** Top of the cap: the higher of the two. */
  top: number
  capTone: Tone
  hasCap: boolean
  note: string
  valid: boolean
  last: boolean
}

const MARGIN: Margin = { top: 64, right: 0, bottom: 32, left: 0 }
/** Gap between the column top and the text above it, in px. */
const VALUE_GAP = 8
/** Height of the note line under the total, in px. */
const NOTE_GAP = 18
/** Room above the cap for the total and note before a pinned callout, in px. */
const CALLOUT_SPACE = 52

function ColumnTotals<S>({ rows, fmt }: { rows: readonly BridgeRow<S>[]; fmt: Formatter }) {
  const ctx = useChart('BridgeChart')
  if (ctx.x.kind !== 'band' || ctx.y.kind !== 'linear') return null
  const band = ctx.x.scale
  const linear = ctx.y.scale
  const half = band.bandwidth() / 2
  const [r0, r1] = linear.range()
  const clamp = (px: number) => Math.min(Math.max(r0, r1), Math.max(Math.min(r0, r1), px))
  return (
    <g data-ch-part="column-totals">
      {rows.map((r) => {
        const start = band(r.key)
        if (start === undefined) return null
        const x = start + half
        const top = clamp(linear(r.top))
        return (
          <g key={r.key}>
            <text
              data-ch-part="column-total"
              x={x}
              y={top - (r.note ? NOTE_GAP + VALUE_GAP : VALUE_GAP)}
              textAnchor="middle"
            >
              {fmt(r.total)}
            </text>
            {r.note ? (
              <text
                data-ch-part="column-note"
                data-ch-tone={r.capTone}
                x={x}
                y={top - VALUE_GAP}
                textAnchor="middle"
                style={{ fill: `var(--ch-${r.capTone})` }}
              >
                {r.note}
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}

/** Pins the callout above the last column's cap and labels, not on the bar itself. */
function LastCallout<S>({ row, segments }: { row: BridgeRow<S>; segments: TooltipSegment[] }) {
  const ctx = useChart('BridgeChart')
  if (ctx.y.kind !== 'linear') return null
  const cap = Math.abs(ctx.y.scale(row.base) - ctx.y.scale(row.top))
  return <Callout id={row.rowId} segments={segments} offset={cap + CALLOUT_SPACE} />
}

export function BridgeChart<S extends BridgeStep = BridgeStep>({
  start,
  steps,
  format,
  stepLabel,
  highlightLast = true,
  callout,
  area = true,
  domain,
  padding = 0.45,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: BridgeChartProps<S>) {
  const { create } = useFormat()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])
  const signed = useMemo(() => create(format, { signed: true }), [create, format])
  const startValid = Number.isFinite(start.value)

  const rows = useMemo((): BridgeRow<S>[] => {
    if (!startValid) return []
    const totals = runningTotals(
      start.value,
      steps.map((s) => s.value),
    )
    const all: BridgeRow<S>[] = [
      {
        key: 'start',
        rowId: 'start',
        kind: 'start',
        index: -1,
        datum: start,
        label: start.label,
        total: start.value,
        base: start.value,
        top: start.value,
        capTone: 'neutral',
        hasCap: false,
        note: '',
        valid: true,
        last: false,
      },
      ...totals.map((t): BridgeRow<S> => {
        const s = steps[t.index] as S
        return {
          key: `s${t.index}`,
          rowId: s.id ?? t.index,
          kind: 'step',
          index: t.index,
          datum: s,
          label: s.label,
          total: t.after,
          base: Math.min(t.before, t.after),
          top: Math.max(t.before, t.after),
          capTone: t.tone,
          hasCap: t.valid && t.value !== 0,
          note: t.valid
            ? stepLabel
              ? stepLabel(s)
              : `${signed(t.value)} ${s.note ?? ''}`.trim()
            : '',
          valid: t.valid,
          last: false,
        }
      }),
    ]
    const lastRow = all[all.length - 1]
    if (lastRow) lastRow.last = true
    return all
  }, [startValid, start, steps, stepLabel, signed])

  if (DEV && !startValid) {
    warn('bridge-start', 'BridgeChart needs a numeric start value; showing the empty state.')
  }
  const missing = rows.find((r) => !r.valid)
  if (DEV && missing) {
    warn(
      'bridge-step',
      `BridgeChart skipped a missing or non-numeric step value at index ${missing.index}.`,
    )
  }

  const caps = useMemo(() => rows.filter((r) => r.hasCap), [rows])
  const lastRow = rows[rows.length - 1]
  const labelOf = new Map(rows.map((r) => [r.key, r.label]))
  const resolvedDomain =
    domain ?? niceDomain(inferLinearDomain(rows.flatMap((r) => [r.base, r.top])))
  const m: Margin = { ...MARGIN, ...margin }
  const solidLast = (r: BridgeRow<S>) => r.last && highlightLast
  const ariaOf = (r: BridgeRow<S>) =>
    r.note ? `${r.label}, ${fmt(r.total)}, ${r.note}` : `${r.label}, ${fmt(r.total)}`
  const segmentsOf = (r: BridgeRow<S>): TooltipSegment[] => [
    { value: r.label },
    { value: fmt(r.total) },
    ...(r.note ? [{ value: r.note, tone: r.capTone }] : []),
  ]

  const table: DataTableSpec<BridgeRow<S>> | undefined = dataTable
    ? {
        columns: [
          { header: 'Column', value: (r) => r.label },
          { header: 'Change', value: (r) => r.note },
          { header: 'Total', value: (r) => fmt(r.total) },
        ],
      }
    : undefined

  return (
    <Chart<BridgeRow<S>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={{ type: 'band', field: 'key', padding }}
      y={{ field: 'total', domain: resolvedDomain }}
      margin={m}
      height={height ?? 360}
      dataTable={table}
    >
      {highlightLast && lastRow ? <ColumnHighlight at={lastRow.key} /> : null}
      {area ? <Area<BridgeRow<S>> data={rows} x="key" y="total" /> : null}
      <Bars<BridgeRow<S>>
        data={rows}
        x="key"
        y="base"
        id="rowId"
        label="label"
        tone="accent"
        fill={(r) => (solidLast(r) ? 'solid' : 'hatch-fade')}
        format={format}
        ariaLabel={ariaOf}
        tooltip={segmentsOf}
      />
      <Bars<BridgeRow<S>>
        data={caps}
        x="key"
        y="top"
        from="base"
        id="rowId"
        tone={(r) => r.capTone}
        fill="hatch"
        interactive={false}
      />
      <ColumnTotals rows={rows} fmt={fmt} />
      <Axis
        side="bottom"
        format={(key) => labelOf.get(String(key)) ?? ''}
        highlight={highlightLast ? lastRow?.key : undefined}
      />
      {callout && lastRow ? <LastCallout row={lastRow} segments={callout} /> : null}
      {tooltip ? <Tooltip /> : null}
      {children}
    </Chart>
  )
}
