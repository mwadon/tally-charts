import { type CSSProperties, useMemo } from 'react'
import { resolveAccessor, resolveIds } from '../../core/accessor'
import type { FormatSpec } from '../../core/format'
import { round2 } from '../../core/path'
import { CHAR_WIDTH, truncateLabel } from '../../core/text'
import type { Accessor, Id, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { type ChartName, FittedChart } from '../Chart'
import { useFormat, useMessages } from '../ChartsProvider'
import { type Margin, useChartContext } from '../context'
import { OTHER } from '../messages'
import { largestRemainder, percentText } from '../ui/share'
import { donutGeometry } from './donut-geometry'
import {
  type ChartPassThroughProps,
  type ChartTooltip,
  type DataTableOptions,
  toNumber,
  userCallbacks,
} from './shared'

export type DonutChartProps<D> = ChartName &
  Omit<ChartPassThroughProps<D>, 'aspectRatio' | 'height' | 'margin'> & {
    /** One row per part. */
    data: readonly D[]
    /** Part name. */
    x: Accessor<D, string>
    /** Part value. */
    y: Accessor<D, number>
    /** Part id. Default: the data index. */
    id?: Accessor<D, Id>
    /** Default 'accent'. The base tone of the slices; the last slice is neutral. */
    tone?: Tone
    /** Default 'number'. Formats part values and the total. */
    format?: FormatSpec
    /** Default 'value': largest part first. 'none' keeps the data order. */
    sort?: 'value' | 'none'
    /**
     * Default 5, from 2 to 5. With more parts than this, the smallest are summed into one
     * "Other" slice.
     */
    maxSlices?: number
    /** Outer diameter of the ring in px. Default 232. The ring shrinks in a narrower chart. */
    diameter?: number
    /** Text under the total in the centre, e.g. "total revenue". */
    centerLabel?: string
    /** The total in the centre. Default true. */
    showTotal?: boolean
    /** The list of parts. Default true. */
    legend?: boolean
    /** What each list row shows on the right. Default 'both' (value and percent). */
    legendValue?: 'both' | 'value' | 'percent'
    /** Default 'auto': the list right of the ring, under it when the chart is too narrow. */
    legendPosition?: 'auto' | 'right' | 'bottom'
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

/** One data row: a part when `valid` and its value is above 0. */
interface DonutRow<D> {
  datum: D
  index: number
  rowId: Id
  name: string
  value: number
  /** The value is a finite number ≥ 0. */
  valid: boolean
}

type Level = 5 | 4 | 3 | 2 | 'neutral'

/** A drawn slice, in ring order: a part, or the "Other" sum of the smallest parts. */
interface DonutSlice<D> {
  /** React key: the data index, or 'other'. */
  key: string
  id: Id
  name: string
  value: number
  percent: number
  percentText: string
  valueText: string
  level: Level
  /** The row of a part; null for "Other". */
  row: DonutRow<D> | null
}

type Position = 'right' | 'bottom' | 'none'

interface DonutLayout {
  position: Position
  height: number
  /** Ring box: min(diameter, width). */
  box: number
  /** Ring centre. */
  cx: number
  cy: number
  /** List block: left edge, top edge and width. */
  listX: number
  listY: number
  listWidth: number
}

const MARGIN: Margin = { top: 0, right: 0, bottom: 0, left: 0 }
const UNIT_SCALE = { domain: [0, 1] } as const
const STEPS: readonly Level[] = [5, 4, 3, 2]
/** Room the ring keeps around its outer edge, in px. */
const RING_PAD = 16
const INNER_RATIO = 0.64
const GAP = 2
const MIN_ARC = 2
/** Gap between the ring and the list on the right, and the narrowest list that goes there. */
const LIST_GAP = 32
const LIST_MIN = 220
/** Gap between the ring and the list under it. */
const BOTTOM_GAP = 8
const ROW = 40
const SWATCH = 10
const NAME_X = 20
const COLUMN_GAP = 12
/** Text baseline in a row, and the swatch's top edge. */
const ROW_BASELINE = 24
const SWATCH_Y = 15
/** The hole keeps this much room around the centre text, in px. */
const HOLE_PAD = 16
/** Font sizes in px. `CHAR_WIDTH` is a glyph of 13–15px text, taken at 13px and scaled. */
const CHAR_SIZE = 13
const LIST_SIZE = 13
const TOTAL_SIZE = 28
const TOTAL_SMALL = 20
const LABEL_SIZE = 12
/** Baselines from the centre: the total and the label under it. */
const TOTAL_LINE = 2
const LABEL_LINE = 22
/** Alone, the total's baseline sits this share of its size below the centre (digits centred). */
const CENTRE_SHIFT = 0.35

/** Estimated glyph width of `size` px text. */
const charWidth = (size: number) => (CHAR_WIDTH * size) / CHAR_SIZE
const textWidth = (text: string, size: number) => text.length * charWidth(size)

/** maxSlices floored and clamped to 2–5; anything else falls back to 5. */
const clampSlices = (n: number) =>
  Number.isFinite(n) ? Math.min(5, Math.max(2, Math.floor(n))) : 5

function DonutMarks<D>(props: {
  slices: readonly DonutSlice<D>[]
  layoutAt: (width: number) => DonutLayout
  tone: Tone
  totalText: string
  centerLabel: string | undefined
  showTotal: boolean
  legendValue: 'both' | 'value' | 'percent'
}) {
  const ctx = useChartContext('DonutChart')
  const { slices, tone, totalText, centerLabel, showTotal, legendValue } = props
  const layout = props.layoutAt(ctx.width)
  const outer = Math.max(0, layout.box / 2 - RING_PAD)
  const inner = outer * INNER_RATIO
  const arcs = useMemo(
    () =>
      donutGeometry({
        values: slices.map((s) => s.value),
        outer,
        inner,
        gap: GAP,
        minArc: MIN_ARC,
      }),
    [slices, outer, inner],
  )

  // The centre: the total at 28 px, 20 px when that is too wide for the hole, else nothing.
  const hole = 2 * inner - HOLE_PAD
  const totalSize = !showTotal
    ? 0
    : textWidth(totalText, TOTAL_SIZE) <= hole
      ? TOTAL_SIZE
      : textWidth(totalText, TOTAL_SMALL) <= hole
        ? TOTAL_SMALL
        : 0
  const label =
    showTotal && centerLabel ? truncateLabel(centerLabel, hole, charWidth(LABEL_SIZE)) : ''
  const totalY = label ? TOTAL_LINE : round2(totalSize * CENTRE_SHIFT)

  // List columns: as wide as their widest text.
  const showValue = legendValue !== 'percent'
  const showPercent = legendValue !== 'value'
  const widest = (pick: (s: DonutSlice<D>) => string) =>
    Math.max(0, ...slices.map((s) => textWidth(pick(s), LIST_SIZE)))
  const percentWidth = showPercent ? widest((s) => s.percentText) : 0
  const valueWidth = showValue ? widest((s) => s.valueText) : 0
  const percentX = layout.listWidth
  const valueX = showPercent ? percentX - percentWidth - COLUMN_GAP : percentX
  const columns =
    showValue && showPercent ? valueWidth + COLUMN_GAP + percentWidth : valueWidth + percentWidth
  const nameMax = layout.listWidth - NAME_X - columns - COLUMN_GAP

  return (
    <g
      data-ch-part="donut"
      data-ch-seq-tone={tone}
      data-ch-layout={layout.position}
      // The tone's own paint, for forced colors, where the ramp gives way to system colours.
      style={{ '--_ch-tone-paint': `var(--ch-${tone})` } as CSSProperties}
    >
      <g
        data-ch-part="donut-ring"
        transform={`translate(${round2(layout.cx)},${round2(layout.cy)})`}
      >
        {slices.map((slice, i) => (
          <path
            key={slice.key}
            data-ch-part="donut-slice"
            data-ch-level={slice.level}
            d={arcs[i]?.path ?? ''}
          />
        ))}
        {totalSize > 0 ? (
          <text
            data-ch-part="donut-total"
            data-ch-size={totalSize === TOTAL_SMALL ? 'small' : undefined}
            x={0}
            y={totalY}
            textAnchor="middle"
          >
            {totalText}
          </text>
        ) : null}
        {label ? (
          <text data-ch-part="donut-center-label" x={0} y={LABEL_LINE} textAnchor="middle">
            {label !== centerLabel ? <title>{centerLabel}</title> : null}
            {label}
          </text>
        ) : null}
      </g>
      {layout.position === 'none' ? null : (
        <g data-ch-part="donut-list">
          {slices.map((slice, i) => {
            const name = truncateLabel(slice.name, nameMax, charWidth(LIST_SIZE))
            return (
              <g
                key={slice.key}
                data-ch-part="donut-row"
                transform={`translate(${round2(layout.listX)},${round2(layout.listY + i * ROW)})`}
              >
                {name !== slice.name ? <title>{slice.name}</title> : null}
                <rect
                  data-ch-part="donut-swatch"
                  data-ch-level={slice.level}
                  x={0}
                  y={SWATCH_Y}
                  width={SWATCH}
                  height={SWATCH}
                  rx={2}
                />
                <text data-ch-part="donut-name" x={NAME_X} y={ROW_BASELINE}>
                  {name}
                </text>
                {showValue ? (
                  <text
                    data-ch-part="donut-value"
                    x={round2(valueX)}
                    y={ROW_BASELINE}
                    textAnchor="end"
                  >
                    {slice.valueText}
                  </text>
                ) : null}
                {showPercent ? (
                  <text
                    data-ch-part="donut-percent"
                    x={round2(percentX)}
                    y={ROW_BASELINE}
                    textAnchor="end"
                  >
                    {slice.percentText}
                  </text>
                ) : null}
                {i < slices.length - 1 ? (
                  <line
                    data-ch-part="donut-rule"
                    x1={0}
                    x2={round2(Math.max(0, layout.listWidth))}
                    y1={ROW}
                    y2={ROW}
                  />
                ) : null}
              </g>
            )
          })}
        </g>
      )}
    </g>
  )
}

export function DonutChart<D>({
  data,
  x,
  y,
  id,
  tone = 'accent',
  format,
  sort = 'value',
  maxSlices = 5,
  diameter = 232,
  centerLabel,
  showTotal = true,
  legend = true,
  legendValue = 'both',
  legendPosition = 'auto',
  // Points, the data table and the tooltip come with interaction.
  dataTable: _dataTable = true,
  tooltip: _tooltip = true,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: DonutChartProps<D>) {
  const { create } = useFormat()
  const messages = useMessages()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])
  const limit = clampSlices(maxSlices)
  if (DEV && limit !== maxSlices) {
    warn(
      'donut-max-slices',
      'DonutChart maxSlices must be a whole number from 2 to 5; it was clamped.',
    )
  }

  const rows = useMemo((): DonutRow<D>[] => {
    const getName = resolveAccessor(x)
    const getValue = resolveAccessor(y)
    const ids = resolveIds(data, id, warn)
    return data.map((d, i) => {
      const value = toNumber(getValue(d, i))
      return {
        datum: d,
        index: i,
        rowId: ids[i] ?? i,
        name: String(getName(d, i) ?? ''),
        value,
        valid: Number.isFinite(value) && value >= 0,
      }
    })
  }, [x, y, data, id, warn])

  if (DEV && rows.some((r) => !r.valid)) {
    warn('donut-value', 'DonutChart skipped a row with a missing, non-numeric or negative value.')
  }

  const otherName = messages.other ?? OTHER
  const { slices, total } = useMemo(() => {
    const total = rows.reduce((sum, r) => (r.valid ? sum + r.value : sum), 0)
    const partsOf = rows.filter((r) => r.valid && r.value > 0)
    // Largest first; ties keep the data order (the sort is stable).
    const ranked = [...partsOf].sort((a, b) => b.value - a.value)
    const grouped = ranked.length > limit
    const keptRows = grouped ? ranked.slice(0, limit - 1) : ranked
    const kept = sort === 'none' ? partsOf.filter((r) => keptRows.includes(r)) : keptRows
    const otherValue = grouped ? ranked.slice(limit - 1).reduce((sum, r) => sum + r.value, 0) : 0
    const values = [...kept.map((r) => r.value), ...(grouped ? [otherValue] : [])]
    const percents = largestRemainder(values.map((v) => (total > 0 ? (v / total) * 100 : 0)))
    const slices: DonutSlice<D>[] = values.map((value, i) => {
      const row = kept[i] ?? null
      const percent = percents[i] ?? 0
      return {
        key: row ? String(row.index) : 'other',
        id: row ? row.rowId : 'other',
        name: row ? row.name : otherName,
        value,
        percent,
        percentText: percentText(percent, value),
        valueText: fmt(value),
        level: row && i < STEPS.length ? (STEPS[i] as Level) : 'neutral',
        row,
      }
    })
    return { slices, total }
  }, [rows, limit, sort, fmt, otherName])

  const layoutAt = (width: number): DonutLayout => {
    const w = Math.max(0, width)
    const box = Math.max(0, Math.min(diameter, w))
    const position: Position = !legend
      ? 'none'
      : legendPosition === 'auto'
        ? w >= diameter + LIST_GAP + LIST_MIN
          ? 'right'
          : 'bottom'
        : legendPosition
    const list = slices.length * ROW
    if (position === 'right') {
      const height = Math.max(box, list)
      return {
        position,
        height,
        box,
        cx: box / 2,
        cy: height / 2,
        listX: box + LIST_GAP,
        listY: (height - list) / 2,
        listWidth: w - box - LIST_GAP,
      }
    }
    const below = position === 'bottom'
    return {
      position,
      height: below ? box + BOTTOM_GAP + list : box,
      box,
      cx: w / 2,
      cy: box / 2,
      listX: 0,
      listY: box + BOTTOM_GAP,
      listWidth: w,
    }
  }
  const layoutFor = (width: number) => ({ margin: MARGIN, height: layoutAt(width).height })

  return (
    <FittedChart<DonutRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={slices.length > 0 ? rows : []}
      // The ring lays itself out from the chart width; fixed domains keep the scales quiet.
      x={UNIT_SCALE}
      y={UNIT_SCALE}
      layoutFor={layoutFor}
    >
      <DonutMarks<D>
        slices={slices}
        layoutAt={layoutAt}
        tone={tone}
        totalText={fmt(total)}
        centerLabel={centerLabel}
        showTotal={showTotal}
        legendValue={legendValue}
      />
      {children}
    </FittedChart>
  )
}
