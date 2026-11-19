import { type CSSProperties, useMemo } from 'react'
import { resolveAccessor, resolveIds } from '../../core/accessor'
import type { FormatSpec } from '../../core/format'
import { round2 } from '../../core/path'
import { CHAR_WIDTH, truncateLabel } from '../../core/text'
import type { Accessor, Id, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { paintFor } from '../../theme/patterns'
import { type ChartName, FittedChart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import { type Margin, useChartContext } from '../context'
import { percentText } from '../ui/share'
import { toneVar } from '../ui/util'
import { seriesTones, warnSeries } from './bar-series'
import { funnelGeometry } from './funnel-geometry'
import {
  type ChartPassThroughProps,
  type ChartTooltip,
  type DataTableOptions,
  toNumber,
  userCallbacks,
} from './shared'

export interface FunnelSeries<D> {
  /** Stable key of the series; unique within the chart. */
  id: string
  /** Name for the tooltip, announcements and the data table header. */
  label: string
  /** Value field of the series. */
  value: Accessor<D, number>
  /** Default: the next tone of the default order, as in `StackedBarChart`. */
  tone?: Tone
}

export type FunnelChartProps<D> = ChartName &
  Omit<ChartPassThroughProps<D>, 'aspectRatio'> & {
    /** One row per step, in funnel order. */
    data: readonly D[]
    /** Step name. */
    x: Accessor<D, string>
    /** Step id. Default: the data index. */
    id?: Accessor<D, Id>
    /** Default 'number'. Formats step values and series values. */
    format?: FormatSpec
    /**
     * Default 'auto': horizontal (steps left to right), vertical (steps top to bottom) when the
     * chart is too narrow for its steps.
     */
    orientation?: 'auto' | 'horizontal' | 'vertical'
    /** Default 'weakest': the lowest continue rate is drawn in the loss tone. */
    highlight?: 'weakest' | 'none'
    /** Width in px of the label column of a vertical funnel. Default 128. */
    labelWidth?: number
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
  } & (
    | {
        /** Step value. */
        y: Accessor<D, number>
        /** Default 'accent'. */
        tone?: Tone
        series?: undefined
      }
    | {
        /** One layer per series; a step's value is the sum of its series values. */
        series: readonly FunnelSeries<D>[]
        y?: undefined
        tone?: undefined
      }
  )

/** One data row: a step when `valid`. */
interface FunnelRow<D> {
  datum: D
  index: number
  rowId: Id
  name: string
  /** One value per layer: the step value, or one per series. */
  values: number[]
  total: number
  /** Every value is a finite number ≥ 0. */
  valid: boolean
}

/** A drawn step with its header text. */
interface FunnelStep<D> extends FunnelRow<D> {
  /** Value ÷ the previous drawn step's value; null for the first step and after a zero. */
  rate: number | null
  valueText: string
  rateText: string
  weakest: boolean
}

type Orientation = 'horizontal' | 'vertical'

const HORIZONTAL_MARGIN: Margin = { top: 70, right: 0, bottom: 10, left: 0 }
const HORIZONTAL_HEIGHT = 280
const UNIT_SCALE = { domain: [0, 1] } as const
const VERTICAL_PAD = 8
const VERTICAL_STEP = 64
/** 'auto' turns vertical when a step gets less than this, in px. */
const MIN_COLUMN = 96
/** Room a header keeps from the next step line, in px. */
const COLUMN_GAP = 12
/** Header text starts this far after its step line, in px. */
const HEADER_GAP = 8
/** Header baselines from the figure top: value, name, rate. */
const HEADER_LINES = [16, 33, 50] as const
/** Vertical label block: the name's baseline, and the value line's, below the step line. */
const NAME_LINE = 14
const VALUE_LINE = 32
/** Gap between the value and the rate on a vertical value line, in px. */
const RATE_GAP = 8
/** Font sizes in px. `CHAR_WIDTH` is a glyph of 13–15px text. */
const CHAR_SIZE = 13
const VALUE_SIZE = 18
const VERTICAL_VALUE_SIZE = 13
const RATE_SIZE = 12
const NAME_SIZE = 12
const VERTICAL_NAME_SIZE = 13
/**
 * Values and rates are measured on the safe side, as if `CHAR_WIDTH` were a 12px glyph: they are
 * never cut, the values are semibold, and too wide a guess only turns the funnel vertical.
 */
const SAFE_SIZE = 12

const textWidth = (text: string, size: number) => (text.length * CHAR_WIDTH * size) / SAFE_SIZE

/** The near and far edges of a layer path, which funnelGeometry writes as `M near… L far… Z`. */
function edgesOf(d: string): { near: string; far: string } {
  const at = d.indexOf(' L')
  return { near: d.slice(0, at), far: `M${d.slice(at + 2, d.length - 2)}` }
}

function FunnelMarks<D>(props: {
  steps: readonly FunnelStep<D>[]
  tones: readonly Tone[]
  seriesIds: readonly string[] | undefined
  orientationAt: (width: number) => Orientation
  labelWidth: number
}) {
  const ctx = useChartContext('FunnelChart')
  const { steps, tones, seriesIds, labelWidth } = props
  const vertical = props.orientationAt(ctx.width) === 'vertical'
  const length = vertical ? ctx.innerHeight : ctx.innerWidth
  const thickness = vertical ? ctx.innerWidth : ctx.innerHeight
  const geometry = useMemo(
    () => funnelGeometry({ values: steps.map((s) => s.values), length, thickness, vertical }),
    [steps, length, thickness, vertical],
  )
  const column = steps.length > 0 ? length / steps.length : 0
  // A guide (or a segment of one) along the funnel's cross axis at `along`, from `a` to `b`.
  const guide = (along: number, a: number, b: number) =>
    vertical
      ? { x1: round2(a), x2: round2(b), y1: round2(along), y2: round2(along) }
      : { x1: round2(along), x2: round2(along), y1: round2(a), y2: round2(b) }

  // An accent-soft layer on the outside of the ribbon gets an inked edge on that side.
  const last = tones.length - 1
  const edges: { tone: Tone; d: string }[] = []
  geometry.paths.forEach((d, k) => {
    const tone = tones[k] as Tone
    if (!d || tone !== 'accent-soft') return
    const { near, far } = edgesOf(d)
    if (k === 0) edges.push({ tone, d: near })
    if (k === last) edges.push({ tone, d: far })
  })

  const nameMax = vertical ? labelWidth - COLUMN_GAP : column - COLUMN_GAP
  const nameCharWidth = (CHAR_WIDTH * (vertical ? VERTICAL_NAME_SIZE : NAME_SIZE)) / CHAR_SIZE

  return (
    <g data-ch-part="funnel" data-ch-orientation={vertical ? 'vertical' : 'horizontal'}>
      <g data-ch-part="funnel-guides">
        {geometry.lines.slice(1).map((along, i) => (
          <line
            // biome-ignore lint/suspicious/noArrayIndexKey: one guide per step line, in order
            key={i}
            data-ch-part="funnel-guide"
            {...guide(
              along,
              vertical ? -ctx.margin.left : -ctx.margin.top,
              vertical ? ctx.innerWidth : ctx.innerHeight,
            )}
          />
        ))}
      </g>
      {geometry.paths.map((d, k) =>
        d ? (
          <path
            // biome-ignore lint/suspicious/noArrayIndexKey: one layer per series, in order; ids may repeat (warned about)
            key={k}
            data-ch-part="funnel-area"
            data-ch-tone={tones[k]}
            data-ch-series={seriesIds?.[k]}
            d={d}
            style={
              {
                ...toneVar(tones[k] as Tone),
                fill: paintFor(ctx.chartId, tones[k] as Tone, 'solid').fill,
              } as CSSProperties
            }
          />
        ) : null,
      )}
      {edges.map((edge, k) => (
        <path
          // biome-ignore lint/suspicious/noArrayIndexKey: at most one edge per side, in order
          key={k}
          data-ch-part="area-edge"
          data-ch-tone={edge.tone}
          d={edge.d}
          style={toneVar(edge.tone)}
        />
      ))}
      {geometry.lines.slice(1).map((along, i) => {
        const [a, b] = geometry.extents[i + 1] as [number, number]
        return a === b ? null : (
          // biome-ignore lint/suspicious/noArrayIndexKey: one segment per step line, in order
          <line key={i} data-ch-part="funnel-guide-inner" {...guide(along, a, b)} />
        )
      })}
      {steps.map((step, i) => {
        const line = geometry.lines[i] ?? 0
        const name = truncateLabel(step.name, nameMax, nameCharWidth)
        // Horizontal: the first header starts at the plot edge, the others after their line.
        const x = vertical ? -labelWidth : i === 0 ? 0 : line + HEADER_GAP
        const rate = step.rateText ? (
          <text
            data-ch-part="funnel-rate"
            data-ch-weakest={step.weakest ? 'true' : undefined}
            x={round2(vertical ? x + textWidth(step.valueText, VERTICAL_VALUE_SIZE) + RATE_GAP : x)}
            y={round2(vertical ? line + VALUE_LINE : HEADER_LINES[2] - ctx.margin.top)}
          >
            {step.rateText}
          </text>
        ) : null
        return (
          <g key={step.index} data-ch-part="funnel-step">
            {name !== step.name ? <title>{step.name}</title> : null}
            <text
              data-ch-part="funnel-value"
              x={round2(x)}
              y={round2(vertical ? line + VALUE_LINE : HEADER_LINES[0] - ctx.margin.top)}
            >
              {step.valueText}
            </text>
            <text
              data-ch-part="funnel-name"
              x={round2(x)}
              y={round2(vertical ? line + NAME_LINE : HEADER_LINES[1] - ctx.margin.top)}
            >
              {name}
            </text>
            {rate}
          </g>
        )
      })}
    </g>
  )
}

export function FunnelChart<D>({
  data,
  x,
  y,
  series,
  id,
  tone = 'accent',
  format,
  orientation = 'auto',
  highlight = 'weakest',
  labelWidth = 128,
  dataTable: _dataTable = true,
  tooltip: _tooltip = true,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: FunnelChartProps<D>) {
  const { create } = useFormat()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])
  // Both or neither is a mistake: nothing is drawn.
  const inputOk = (y === undefined) !== (series === undefined)
  if (DEV && !inputOk) {
    warn('funnel-input', 'FunnelChart needs either y or series, not both.')
  }
  if (DEV && series !== undefined) warnSeries(series, warn, 'FunnelChart', 'funnel')

  const rows = useMemo((): FunnelRow<D>[] => {
    if (!inputOk) return []
    const getters = series
      ? series.map((s) => resolveAccessor(s.value))
      : y
        ? [resolveAccessor(y)]
        : []
    if (getters.length === 0) return []
    const getName = resolveAccessor(x)
    const ids = resolveIds(data, id, warn)
    return data.map((d, i) => {
      const values = getters.map((get) => toNumber(get(d, i)))
      return {
        datum: d,
        index: i,
        rowId: ids[i] ?? i,
        name: String(getName(d, i) ?? ''),
        values,
        total: values.reduce((sum, v) => sum + v, 0),
        valid: values.every((v) => Number.isFinite(v) && v >= 0),
      }
    })
  }, [inputOk, series, y, x, data, id, warn])

  const skipped = rows.some((r) => !r.valid)
  if (DEV && skipped) {
    warn('funnel-value', 'FunnelChart skipped a row with a missing, non-numeric or negative value.')
  }

  const steps = useMemo((): FunnelStep<D>[] => {
    const drawn = rows.filter((r) => r.valid)
    const rates = drawn.map((r, i) => {
      const previous = drawn[i - 1]?.total
      return previous === undefined || previous === 0 ? null : r.total / previous
    })
    let weakest = -1
    if (highlight === 'weakest' && drawn.length >= 3) {
      rates.forEach((rate, i) => {
        if (rate !== null && (weakest < 0 || rate < (rates[weakest] as number))) weakest = i
      })
    }
    return drawn.map((r, i) => {
      const rate = rates[i] ?? null
      return {
        ...r,
        rate,
        valueText: fmt(r.total),
        rateText: rate === null ? '' : percentText(Math.round(rate * 100), rate),
        weakest: i === weakest,
      }
    })
  }, [rows, highlight, fmt])

  const tones = useMemo(() => (series ? seriesTones(series) : [tone]), [series, tone])

  const horizontalMargin: Margin = { ...HORIZONTAL_MARGIN, ...margin }
  const verticalMargin: Margin = {
    top: VERTICAL_PAD,
    right: 0,
    bottom: VERTICAL_PAD,
    left: labelWidth,
    ...margin,
  }
  const orientationAt = (width: number): Orientation => {
    if (orientation !== 'auto') return orientation
    if (steps.length === 0) return 'horizontal'
    const column =
      Math.max(0, width - horizontalMargin.left - horizontalMargin.right) / steps.length
    if (column < MIN_COLUMN) return 'vertical'
    const room = column - COLUMN_GAP
    const overflows = steps.some(
      (s) => textWidth(s.valueText, VALUE_SIZE) > room || textWidth(s.rateText, RATE_SIZE) > room,
    )
    return overflows ? 'vertical' : 'horizontal'
  }
  const layoutFor = (width: number) => {
    if (orientationAt(width) === 'horizontal') {
      return { margin: horizontalMargin, height: height ?? HORIZONTAL_HEIGHT }
    }
    const m = verticalMargin
    return { margin: m, height: height ?? steps.length * VERTICAL_STEP + m.top + m.bottom }
  }

  return (
    <FittedChart<FunnelRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={steps.length > 0 ? rows : []}
      // The funnel lays itself out from the plot size; fixed domains keep the scales quiet.
      x={UNIT_SCALE}
      y={UNIT_SCALE}
      layoutFor={layoutFor}
    >
      <FunnelMarks<D>
        steps={steps}
        tones={tones}
        seriesIds={series?.map((s) => s.id)}
        orientationAt={orientationAt}
        labelWidth={labelWidth}
      />
      {children}
    </FittedChart>
  )
}
