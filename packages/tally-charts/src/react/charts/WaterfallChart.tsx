import { useMemo } from 'react'
import type { FormatSpec } from '../../core/format'
import { niceDomain } from '../../core/linear'
import { inferLinearDomain } from '../../core/scale'
import { runningTotals } from '../../core/steps'
import type { TickSpec } from '../../core/ticks'
import type { Fill, Id, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { Chart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import { type Margin, useChart } from '../context'
import type { DataTableSpec } from '../DataTable'
import { Axis, type AxisFormat } from '../marks/Axis'
import { Bars, type BarsProps } from '../marks/Bars'
import { Connector, type ConnectorLink } from '../marks/Connector'
import { RowLabels } from '../marks/RowLabels'
import { Tooltip } from '../overlays/Tooltip'
import type { TooltipSegment } from '../types'
import { type ChartPassThroughProps, userCallbacks } from './shared'

export interface WaterfallStart {
  label: string
  value: number
}

export interface WaterfallStep {
  label: string
  /** The change, e.g. -1.6. */
  value: number
  /** Passed to onSelect and onActiveChange. Default: the index in `steps`. */
  id?: Id
  /** Any extra number for `stepLabel`, e.g. the money behind the change. */
  meta?: number
}

export interface WaterfallEnd {
  label: string
}

export type WaterfallKind = 'start' | 'step' | 'end'

export interface WaterfallChartProps<S extends WaterfallStep = WaterfallStep>
  extends Omit<ChartPassThroughProps<unknown>, 'aspectRatio'> {
  start: WaterfallStart
  steps: readonly S[]
  /**
   * The calculated end row. Default label "Total". In `onSelect` and `onActiveChange` its
   * `point.datum` is a synthetic `{ label, value }` created on every render, so recognise it by
   * `id === 'end'`, not by object identity.
   */
  end?: WaterfallEnd
  /** Format of the start, end, totals and axis. Default 'number'. */
  format?: FormatSpec
  /** Text on the right of a step row. Default: the signed step value in `format`. */
  stepLabel?: (step: S) => string
  /** Default 'neutral' (hatched). */
  startTone?: Tone
  /** Default 'accent' (solid). */
  endTone?: Tone
  /**
   * Value domain. Default: the totals' range without forcing zero, rounded to nice ticks. When it
   * leaves out zero, the scale runs a little past its lower end (upper end for negative values), so
   * the start and end bars stay visible even when a total equals the domain's end; the axis still
   * labels the domain itself.
   */
  domain?: readonly [number, number]
  /** Default 64. */
  rowHeight?: number
  /** Bar thickness in px. Default 18. */
  barSize?: number
  /** Value axis ticks, or 'none'. Default 5. */
  axis?: TickSpec | 'none'
  /** Axis label format. Default: `format`. */
  axisFormat?: AxisFormat
  /** Dotted lines from each bar to the next. Default true. */
  connectors?: boolean
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
  /** Default true. */
  tooltip?: boolean
}

interface WaterfallRow<S> {
  key: string
  rowId: Id
  kind: WaterfallKind
  /** Index in `steps`; -1 for the start and end rows. */
  index: number
  datum: WaterfallStart | S | { label: string; value: number }
  label: string
  /** Start of a step's floating bar; NaN for start and end (they run from the baseline). */
  from: number
  /** Running total after the row: where its bar ends. */
  to: number
  text: string
  tone: Tone
  fill: Fill
  valid: boolean
}

const AXIS_SPACE = 28
/** Room for the row label above each bar, in px: the bar sits right under its own label. */
const LABEL_SPACE = 26
/** Extra scale range past a domain end that leaves out zero, as a share of the domain's span. */
const BASE_PAD = 0.12

/** Where a row's bar starts inside its band: under the label, but never past the band's end. */
const barTop = (band: number, barSize: number) => Math.max(0, Math.min(LABEL_SPACE, band - barSize))

/**
 * Pads the end of the domain the start and end bars grow from (the clamped zero baseline), so a
 * total on that end still draws a bar. Domains that include zero need no padding.
 */
function padDomain([d0, d1]: readonly [number, number]): [number, number] {
  const lo = Math.min(d0, d1)
  const hi = Math.max(d0, d1)
  const pad = (hi - lo) * BASE_PAD
  if (lo > 0) return [lo - pad, hi]
  if (hi < 0) return [lo, hi + pad]
  return [lo, hi]
}

/** Connectors run from the bottom of one bar to the top of the next. */
function StepConnectors({ links, barSize }: { links: ConnectorLink[]; barSize: number }) {
  const ctx = useChart('WaterfallChart')
  const band = ctx.y.kind === 'band' ? ctx.y.scale.bandwidth() : 0
  const top = barTop(band, barSize)
  return <Connector links={links} fromInset={Math.max(0, band - top - barSize)} toInset={top} />
}

function StepBars<S>(props: BarsProps<WaterfallRow<S>> & { size: number }) {
  const ctx = useChart('WaterfallChart')
  const band = ctx.y.kind === 'band' ? ctx.y.scale.bandwidth() : 0
  return <Bars<WaterfallRow<S>> {...props} align="start" offset={barTop(band, props.size)} />
}

export function WaterfallChart<S extends WaterfallStep = WaterfallStep>({
  start,
  steps,
  end,
  format,
  stepLabel,
  startTone = 'neutral',
  endTone = 'accent',
  domain,
  rowHeight = 64,
  barSize = 18,
  axis = 5,
  axisFormat,
  connectors = true,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: WaterfallChartProps<S>) {
  const { create } = useFormat()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])
  const signed = useMemo(() => create(format, { signed: true }), [create, format])
  const startValid = Number.isFinite(start.value)
  const endLabel = end?.label ?? 'Total'

  const rows = useMemo((): WaterfallRow<S>[] => {
    if (!startValid) return []
    const totals = runningTotals(
      start.value,
      steps.map((s) => s.value),
    )
    const endValue = totals.at(-1)?.after ?? start.value
    const stepRows = totals.map((t): WaterfallRow<S> => {
      const s = steps[t.index] as S
      return {
        key: `s${t.index}`,
        rowId: s.id ?? t.index,
        kind: 'step',
        index: t.index,
        datum: s,
        label: s.label,
        from: t.before,
        to: t.after,
        text: t.valid ? (stepLabel ? stepLabel(s) : signed(t.value)) : '',
        tone: t.tone,
        fill: 'hatch',
        valid: t.valid,
      }
    })
    return [
      {
        key: 'start',
        rowId: 'start',
        kind: 'start',
        index: -1,
        datum: start,
        label: start.label,
        from: Number.NaN,
        to: start.value,
        text: fmt(start.value),
        tone: startTone,
        fill: 'hatch',
        valid: true,
      },
      ...stepRows,
      {
        key: 'end',
        rowId: 'end',
        kind: 'end',
        index: -1,
        datum: { label: endLabel, value: endValue },
        label: endLabel,
        from: Number.NaN,
        to: endValue,
        text: fmt(endValue),
        tone: endTone,
        fill: 'solid',
        valid: true,
      },
    ]
  }, [startValid, start, steps, stepLabel, fmt, signed, startTone, endTone, endLabel])

  if (DEV && !startValid) {
    warn('waterfall-start', 'WaterfallChart needs a numeric start value; showing the empty state.')
  }
  const missing = rows.find((r) => !r.valid)
  if (DEV && missing) {
    warn(
      'waterfall-step',
      `WaterfallChart skipped a missing or non-numeric step value at index ${missing.index}.`,
    )
  }

  const drawn = useMemo(() => rows.filter((r) => r.valid), [rows])
  const valueDomain =
    domain ??
    niceDomain(
      inferLinearDomain(
        drawn.map((r) => r.to),
        false,
      ),
    )
  const resolvedDomain = padDomain(valueDomain)
  const links: ConnectorLink[] = drawn.slice(1).flatMap((b, i) => {
    const a = drawn[i]
    return a ? [{ at: a.to, from: a.key, to: b.key }] : []
  })
  const m: Margin = {
    top: 0,
    right: 0,
    left: 0,
    bottom: axis === 'none' ? 0 : AXIS_SPACE,
    ...margin,
  }
  const toneOfText = (r: WaterfallRow<S>): Tone | undefined =>
    r.kind === 'step' && r.tone !== 'neutral' ? r.tone : undefined
  const ariaOf = (r: WaterfallRow<S>) =>
    r.kind === 'step'
      ? `${r.label}, ${r.text}, running total ${fmt(r.to)}`
      : `${r.label}, ${r.text}`
  const segmentsOf = (r: WaterfallRow<S>): TooltipSegment[] =>
    r.kind === 'step'
      ? [
          { value: r.label },
          { value: r.text, tone: toneOfText(r) },
          { value: fmt(r.to), label: 'total' },
        ]
      : [{ value: r.label }, { value: r.text }]
  const axisFmt: AxisFormat | undefined =
    axisFormat ??
    (typeof format === 'function' ? (v: string | number) => format(Number(v)) : format)

  const table: DataTableSpec<WaterfallRow<S>> | undefined = dataTable
    ? {
        columns: [
          { header: 'Item', value: (r) => r.label },
          { header: 'Change', value: (r) => (r.kind === 'step' ? r.text : '') },
          { header: 'Total', value: (r) => (r.valid ? fmt(r.to) : '') },
        ],
      }
    : undefined

  return (
    <Chart<WaterfallRow<S>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={{ field: 'to', domain: resolvedDomain }}
      y={{ type: 'band', field: 'key', padding: 0 }}
      margin={m}
      height={height ?? Math.max(1, rows.length) * rowHeight + m.top + m.bottom}
      dataTable={table}
    >
      {connectors ? <StepConnectors links={links} barSize={barSize} /> : null}
      <StepBars<S>
        data={drawn}
        x="to"
        from={(r) => r.from}
        id="rowId"
        label="label"
        tone={(r) => r.tone}
        fill={(r) => r.fill}
        size={barSize}
        format={format}
        ariaLabel={ariaOf}
        tooltip={segmentsOf}
      />
      <RowLabels<WaterfallRow<S>> text="label" position="above" />
      <RowLabels<WaterfallRow<S>> side="right" text="text" position="above" tone={toneOfText} />
      {axis === 'none' ? null : (
        <Axis side="bottom" ticks={axis} format={axisFmt} extent={valueDomain} />
      )}
      {tooltip ? <Tooltip /> : null}
      {children}
    </Chart>
  )
}
