import { useMemo } from 'react'
import { resolveAccessor } from '../../core/accessor'
import type { FormatSpec } from '../../core/format'
import { inferLinearDomain } from '../../core/scale'
import { CHAR_WIDTH } from '../../core/text'
import type { Accessor, Id, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { FittedChart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import { type Margin, useChartContext } from '../context'
import type { DataTableSpec } from '../DataTable'
import { Bars } from '../marks/Bars'
import { RowDividers, RowLabels } from '../marks/RowLabels'
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
  /**
   * 'columns': label, bars and values side by side. 'stacked': the label and the values in a block
   * of up to two lines above bars that span the full width. 'auto' stacks when the bars would get less than
   * 120px between the columns. Default 'auto'.
   */
  layout?: 'auto' | 'columns' | 'stacked'
  /** Row height in the columns layout; stacked rows add room for the text line. Default 56. */
  rowHeight?: number
  /** Thickness of each of the two bars in px. Default 8. */
  barSize?: number
  /** Width of the label column in px, in the columns layout. Default 240. */
  labelWidth?: number
  /** Width of the value columns (change and delta) in px. Default 220. */
  valueWidth?: number
  /** Width of the delta column inside `valueWidth`, in px. Default 80. */
  deltaWidth?: number
  /** Show the "$640 → $1,060  +$420" columns. Default true. */
  showValues?: boolean
  /** Thin rules between rows. Default true. */
  dividers?: boolean
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
/** Narrowest plot, in px, before 'auto' stacks the rows. */
const MIN_PLOT = 120
/** Stacked rows: room above the bars for the first text line, and for the second, in px. */
const STACK_TEXT = 26
const STACK_SUBTEXT = 18
/** Stacked rows: space between text columns, in px. */
const TEXT_GAP = 12

/** The layout for a chart width: 'auto' stacks when the plot between the columns is too narrow. */
function resolveLayout(
  layout: 'auto' | 'columns' | 'stacked',
  width: number,
  columns: Margin,
): 'columns' | 'stacked' {
  if (layout !== 'auto') return layout
  return width - columns.left - columns.right < MIN_PLOT ? 'stacked' : 'columns'
}

/** Rough widths of 15px label text and 13px second-line text, in px, on the safe side. */
const lineWidth = (text: string) => text.length * (CHAR_WIDTH + 1)
const subWidth = (text: string) => text.length * CHAR_WIDTH

function statusOf(plan: number, actual: number, tolerance: number): ComparisonStatus {
  if (!Number.isFinite(plan) || !Number.isFinite(actual)) return 'unknown'
  const diff = actual - plan
  if (Math.abs(diff) <= tolerance) return 'on-plan'
  return diff > 0 ? 'over' : 'under'
}

/** The bars and text of every row, in the layout the chart's width calls for. */
function ComparisonRows<D>(props: {
  rows: readonly ComparisonRow<D>[]
  planRows: readonly ComparisonRow<D>[]
  keptRows: readonly ComparisonRow<D>[]
  overRows: readonly ComparisonRow<D>[]
  stacked: (width: number) => boolean
  textSpace: number
  barSize: number
  labelWidth: number
  deltaWidth: number
  showValues: boolean
  hasSublabel: boolean
  overTone: Tone
  format: FormatSpec | undefined
  ariaOf: (r: ComparisonRow<D>) => string
  segmentsOf: (r: ComparisonRow<D>) => TooltipSegment[]
}) {
  const ctx = useChartContext('ComparisonBars')
  const stacked = props.stacked(ctx.width)
  const { barSize } = props
  // Stacked: the bars sit under the text line, centred in the rest of the row.
  const down = stacked ? props.textSpace / 2 : 0
  const shift = barSize / 2 + GAP / 2
  const radius = barSize / 2
  // Stacked: the values take what they need at the right; the label and sublabel get the rest.
  const widest = (measure: (text: string) => number, pick: (r: ComparisonRow<D>) => string) =>
    Math.max(0, ...props.rows.map((r) => measure(pick(r))))
  const valueSpace = props.showValues
    ? Math.max(
        widest(lineWidth, (r) => r.delta),
        widest(subWidth, (r) => r.change),
      ) + TEXT_GAP
    : 0
  const labelMax = stacked ? ctx.width - valueSpace : props.labelWidth - 16
  const position = stacked ? 'above' : 'middle'
  return (
    <>
      <Bars<ComparisonRow<D>>
        data={props.planRows}
        x="plan"
        id="rowId"
        tone="accent-soft"
        fill="hatch"
        size={barSize}
        offset={down - shift}
        radius={radius}
        interactive={false}
      />
      <Bars<ComparisonRow<D>>
        data={props.keptRows}
        x="kept"
        id="rowId"
        label="label"
        tone="accent"
        size={barSize}
        offset={down + shift}
        radius={radius}
        format={props.format}
        ariaLabel={props.ariaOf}
        segments={props.segmentsOf}
      />
      <Bars<ComparisonRow<D>>
        data={props.overRows}
        x="actual"
        from="plan"
        id="rowId"
        tone={props.overTone}
        fill="hatch"
        size={barSize}
        offset={down + shift}
        radius={radius}
        interactive={false}
      />
      <g
        data-ch-part="row-text"
        transform={stacked ? `translate(0 ${STACK_TEXT / 2 - 4})` : undefined}
      >
        <RowLabels<ComparisonRow<D>>
          text="label"
          subtext={props.hasSublabel ? 'sublabel' : undefined}
          position={position}
          maxWidth={labelMax}
        />
        {props.showValues && stacked ? (
          // The change goes under the delta, on the sublabel's line.
          <RowLabels<ComparisonRow<D>>
            side="right"
            text={() => ''}
            subtext="change"
            position="above"
          />
        ) : props.showValues ? (
          <RowLabels<ComparisonRow<D>> side="right" text="change" inset={props.deltaWidth} />
        ) : null}
        {props.showValues ? (
          <RowLabels<ComparisonRow<D>>
            side="right"
            text="delta"
            position={position}
            tone={(r) => r.deltaTone}
          />
        ) : null}
      </g>
    </>
  )
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
  layout = 'auto',
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
  const columns: Margin = {
    top: 0,
    bottom: 0,
    left: labelWidth,
    right: showValues ? valueWidth : 0,
    ...margin,
  }
  const stackedMargin: Margin = { top: 0, bottom: 0, left: 0, right: 0, ...margin }
  // Stacked text: the label and the delta on the first line, the sublabel and the change under it.
  const textSpace = STACK_TEXT + (sublabel || showValues ? STACK_SUBTEXT : 0)
  // The chart measures its width first; then the rows lay out as columns or stacked.
  const layoutFor = (width: number) => {
    const stacked = resolveLayout(layout, width, columns) === 'stacked'
    const m = stacked ? stackedMargin : columns
    const rowH = stacked ? rowHeight + textSpace : rowHeight
    return { margin: m, height: height ?? Math.max(1, rows.length) * rowH + m.top + m.bottom }
  }

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
    <FittedChart<ComparisonRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={{ field: 'actual', domain: resolvedDomain }}
      y={{ type: 'band', field: 'key', padding: 0 }}
      layoutFor={layoutFor}
      dataTable={withTableOptions(table, dataTable)}
    >
      {dividers ? <RowDividers /> : null}
      <ComparisonRows<D>
        rows={rows}
        planRows={planRows}
        keptRows={keptRows}
        overRows={overRows}
        stacked={(width) => resolveLayout(layout, width, columns) === 'stacked'}
        textSpace={textSpace}
        barSize={barSize}
        labelWidth={labelWidth}
        deltaWidth={deltaWidth}
        showValues={showValues}
        hasSublabel={sublabel !== undefined}
        overTone={overTone}
        format={format}
        ariaOf={ariaOf}
        segmentsOf={segmentsOf}
      />
      {tooltip ? <Tooltip content={tooltipContent(tooltip)} /> : null}
      {children}
    </FittedChart>
  )
}
