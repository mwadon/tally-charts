import { useMemo } from 'react'
import { resolveAccessor } from '../../core/accessor'
import type { FormatSpec } from '../../core/format'
import { inferLinearDomain } from '../../core/scale'
import type { Accessor, Id, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { Chart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import type { Margin } from '../context'
import type { DataTableSpec } from '../DataTable'
import { Bars } from '../marks/Bars'
import { RowDividers, RowLabels } from '../marks/RowLabels'
import { Tooltip } from '../overlays/Tooltip'
import type { TooltipSegment } from '../types'
import {
  type ChartPassThroughProps,
  type ChartTooltip,
  headerOf,
  toNumber,
  tooltipContent,
  userCallbacks,
} from './shared'

type ComparisonStatus = 'over' | 'under' | 'on-plan' | 'unknown'

export interface ComparisonBarsProps<D> extends Omit<ChartPassThroughProps<D>, 'aspectRatio'> {
  data: readonly D[]
  /** Row name. */
  label: Accessor<D, string>
  /** Optional muted second line under the name. */
  sublabel?: Accessor<D, string>
  /** Planned or estimated value: the hatched bar. */
  plan: Accessor<D, number>
  /** Actual value: the solid bar. */
  actual: Accessor<D, number>
  /** Row id passed to onSelect and onActiveChange. Default: the data index. */
  id?: Accessor<D, Id>
  /** Default 'number'. */
  format?: FormatSpec
  /** Value domain. Default: zero to the largest plan or actual. */
  domain?: readonly [number, number]
  /** A difference at or below this counts as on plan. Default 0. */
  tolerance?: number
  /** Text for rows on plan. Default "On plan". */
  onPlanLabel?: string
  /**
   * Which direction of actual against plan is good news: 'down' (under plan, for costs and
   * hours) or 'up' (over plan, for revenue-like rows). Default 'down'.
   */
  good?: 'up' | 'down'
  /** Default 56. */
  rowHeight?: number
  /** Thickness of each of the two bars in px. Default 8. */
  barSize?: number
  /** Width of the label column in px. Default 240. */
  labelWidth?: number
  /** Width of the value columns (change and delta) in px. Default 220. */
  valueWidth?: number
  /** Width of the delta column inside `valueWidth`, in px. Default 80. */
  deltaWidth?: number
  /** Show the "$640 → $1,060  +$420" columns. Default true. */
  showValues?: boolean
  /** Thin rules between rows. Default true. */
  dividers?: boolean
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
  /**
   * Tooltip on hover and focus: `true` for the default pill, or a function that renders the
   * content for a point (`point.datum` is your row). Default true.
   */
  tooltip?: ChartTooltip<D>
}

interface ComparisonRow<D> {
  key: string
  rowId: Id
  datum: D
  index: number
  label: string
  sublabel: string
  plan: number
  actual: number
  /** Length of the solid bar: capped at the plan when over, so the overrun draws separately. */
  kept: number
  status: ComparisonStatus
  /** "$640 → $1,060", or empty when a value is missing. */
  change: string
  /** "+$420", "On plan", or empty when a value is missing. */
  delta: string
  deltaTone: Tone | undefined
}

const GAP = 3

function statusOf(plan: number, actual: number, tolerance: number): ComparisonStatus {
  if (!Number.isFinite(plan) || !Number.isFinite(actual)) return 'unknown'
  const diff = actual - plan
  if (Math.abs(diff) <= tolerance) return 'on-plan'
  return diff > 0 ? 'over' : 'under'
}

export function ComparisonBars<D>({
  data,
  label,
  sublabel,
  plan,
  actual,
  id,
  format,
  domain,
  tolerance = 0,
  onPlanLabel = 'On plan',
  good = 'down',
  rowHeight = 56,
  barSize = 8,
  labelWidth = 240,
  valueWidth = 220,
  deltaWidth = 80,
  showValues = true,
  dividers = true,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: ComparisonBarsProps<D>) {
  const { create } = useFormat()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])
  const signed = useMemo(() => create(format, { signed: true }), [create, format])
  const overTone: Tone = good === 'up' ? 'gain' : 'loss'
  const underTone: Tone = good === 'up' ? 'loss' : 'gain'

  const rows = useMemo(() => {
    const getLabel = resolveAccessor(label)
    const getSub = sublabel ? resolveAccessor(sublabel) : undefined
    const getPlan = resolveAccessor(plan)
    const getActual = resolveAccessor(actual)
    const getId = id ? resolveAccessor(id) : undefined
    return data.map((d, i): ComparisonRow<D> => {
      const p = toNumber(getPlan(d, i))
      const a = toNumber(getActual(d, i))
      const status = statusOf(p, a, tolerance)
      const known = status !== 'unknown'
      return {
        key: String(i),
        rowId: getId ? getId(d, i) : i,
        datum: d,
        index: i,
        label: String(getLabel(d, i) ?? ''),
        sublabel: getSub ? String(getSub(d, i) ?? '') : '',
        plan: p,
        actual: a,
        kept: status === 'over' ? p : a,
        status,
        change: known ? `${fmt(p)} → ${fmt(a)}` : '',
        delta: !known ? '' : status === 'on-plan' ? onPlanLabel : signed(a - p),
        deltaTone:
          status === 'on-plan'
            ? 'neutral'
            : status === 'over'
              ? overTone
              : status === 'under'
                ? underTone
                : undefined,
      }
    })
  }, [
    data,
    label,
    sublabel,
    plan,
    actual,
    id,
    tolerance,
    fmt,
    signed,
    onPlanLabel,
    overTone,
    underTone,
  ])

  const missing = rows.find((r) => r.status === 'unknown')
  if (DEV && missing) {
    warn(
      'comparison-value',
      `ComparisonBars skipped a missing or non-numeric plan or actual value at index ${missing.index}.`,
    )
  }

  // Each layer only gets rows it can draw, so a missing value never reaches <Bars> as NaN and
  // the chart warns once, above, instead of once per layer.
  const planRows = useMemo(() => rows.filter((r) => Number.isFinite(r.plan)), [rows])
  const keptRows = useMemo(() => rows.filter((r) => Number.isFinite(r.kept)), [rows])
  const overRows = useMemo(() => rows.filter((r) => r.status === 'over'), [rows])
  const resolvedDomain = domain ?? inferLinearDomain(rows.flatMap((r) => [r.plan, r.actual]))
  const m: Margin = {
    top: 0,
    bottom: 0,
    left: labelWidth,
    right: showValues ? valueWidth : 0,
    ...margin,
  }
  const shift = barSize / 2 + GAP / 2
  const radius = barSize / 2

  const ariaOf = (r: ComparisonRow<D>) =>
    r.status === 'unknown'
      ? r.label
      : `${r.label}, plan ${fmt(r.plan)}, actual ${fmt(r.actual)}, ${r.delta}`
  const segmentsOf = (r: ComparisonRow<D>): TooltipSegment[] => [
    { value: r.label },
    { value: r.change },
    { value: r.delta, tone: r.deltaTone },
  ]

  const table: DataTableSpec<ComparisonRow<D>> | undefined = dataTable
    ? {
        columns: [
          { header: headerOf(label, 'Item'), value: (r) => r.label },
          { header: headerOf(plan, 'Plan'), value: (r) => fmt(r.plan) },
          { header: headerOf(actual, 'Actual'), value: (r) => fmt(r.actual) },
          { header: 'Difference', value: (r) => r.delta },
        ],
      }
    : undefined

  return (
    <Chart<ComparisonRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={{ field: 'actual', domain: resolvedDomain }}
      y={{ type: 'band', field: 'key', padding: 0 }}
      margin={m}
      height={height ?? Math.max(1, rows.length) * rowHeight + m.top + m.bottom}
      dataTable={table}
    >
      {dividers ? <RowDividers /> : null}
      <Bars<ComparisonRow<D>>
        data={planRows}
        x="plan"
        id="rowId"
        tone="accent-soft"
        fill="hatch"
        size={barSize}
        offset={-shift}
        radius={radius}
        interactive={false}
      />
      <Bars<ComparisonRow<D>>
        data={keptRows}
        x="kept"
        id="rowId"
        label="label"
        tone="accent"
        size={barSize}
        offset={shift}
        radius={radius}
        format={format}
        ariaLabel={ariaOf}
        segments={segmentsOf}
      />
      <Bars<ComparisonRow<D>>
        data={overRows}
        x="actual"
        from="plan"
        id="rowId"
        tone={overTone}
        fill="hatch"
        size={barSize}
        offset={shift}
        radius={radius}
        interactive={false}
      />
      <RowLabels<ComparisonRow<D>>
        text="label"
        subtext={sublabel ? 'sublabel' : undefined}
        maxWidth={labelWidth - 16}
      />
      {showValues ? (
        <>
          <RowLabels<ComparisonRow<D>> side="right" text="change" inset={deltaWidth} />
          <RowLabels<ComparisonRow<D>> side="right" text="delta" tone={(r) => r.deltaTone} />
        </>
      ) : null}
      {tooltip ? <Tooltip content={tooltipContent(tooltip)} /> : null}
      {children}
    </Chart>
  )
}
