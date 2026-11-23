import { type CSSProperties, type PointerEvent, useMemo, useRef } from 'react'
import { resolveAccessor, resolveIds } from '../../core/accessor'
import type { FormatSpec } from '../../core/format'
import { round2 } from '../../core/path'
import { CHAR_WIDTH, truncateLabel } from '../../core/text'
import type { Accessor, Id, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { type ChartName, FittedChart } from '../Chart'
import { useFormat, useMessages } from '../ChartsProvider'
import { type Margin, useChartContext } from '../context'
import type { DataTableSpec } from '../DataTable'
import { samePoints } from '../interaction'
import { HEADER_PART, HEADER_SHARE, HEADER_VALUE, OF_TOTAL, OTHER } from '../messages'
import { Tooltip, type TooltipProps } from '../overlays/Tooltip'
import type { ChartPoint } from '../types'
import { largestRemainder, percentText } from '../ui/share'
import { TooltipPill } from '../ui/TooltipPill'
import { useRegisterPoints } from '../useRegisterPoints'
import { donutGeometry } from './donut-geometry'
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

/** One data row: a part when `valid` and its value is above 0. The datum of its point. */
interface DonutRow<D> {
  datum: D
  index: number
  rowId: Id
  name: string
  value: number
  /** The value is a finite number ≥ 0. */
  valid: boolean
}

/** Same rows, so inline accessors keep the rows (and the points that hold them) they built. */
function sameRows<D>(a: readonly DonutRow<D>[], b: readonly DonutRow<D>[]): boolean {
  return (
    a.length === b.length &&
    a.every((r, i) => {
      const t = b[i]
      return (
        t !== undefined &&
        r.datum === t.datum &&
        r.index === t.index &&
        r.rowId === t.rowId &&
        r.name === t.name &&
        Object.is(r.value, t.value) &&
        r.valid === t.valid
      )
    })
  )
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
/** The id of the slice that sums the smallest parts. */
const OTHER_ID = 'other'
/** What a pointer can move to and stay on a slice: another slice or list row. */
const HIT_PARTS: readonly (string | null)[] = ['donut-slice', 'donut-hit']
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
  const messages = useMessages()
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
  // Under the total, or centred alone when the total does not fit.
  const labelY = totalSize > 0 ? LABEL_LINE : round2(LABEL_SIZE * CENTRE_SHIFT)

  // One point per slice, in ring order, at the slice centroid. "Other" has no row: its datum is
  // undefined and it cannot be selected.
  const ofTotal = messages.ofTotal ?? OF_TOTAL
  const { cx, cy } = layout
  const built = useMemo(
    (): ChartPoint[] =>
      slices.map((slice, i) => {
        const [dx, dy] = arcs[i]?.centroid ?? [0, 0]
        const share = `${slice.percentText} ${ofTotal}`
        return {
          id: slice.id,
          index: slice.row ? slice.row.index : -1,
          datum: slice.row ?? undefined,
          x: round2(cx + dx),
          y: round2(cy + dy),
          label: [slice.name, slice.valueText, share].join(', '),
          segments: [{ value: slice.name }, { value: slice.valueText }, { value: share }],
          ...(slice.row ? {} : { selectable: false }),
        }
      }),
    [slices, arcs, cx, cy, ofTotal],
  )
  // The format is often an inline function, so `built` is a new array on every render even when
  // nothing it holds changed; keep the previous array while the content is the same.
  const stable = useRef<ChartPoint[]>([])
  if (!samePoints(stable.current, built)) stable.current = built
  const points = stable.current
  useRegisterPoints(points)

  const active = ctx.activeId === null ? -1 : slices.findIndex((s) => s.id === ctx.activeId)
  const dimmed = (i: number) =>
    ctx.dimInactive && active >= 0 && i !== active ? 'true' : undefined
  const selectable = (slice: DonutSlice<D>) => (ctx.selectable && slice.row ? 'true' : undefined)
  // The slice of a slice or of its list row under the pointer.
  const pointer = (slice: DonutSlice<D>, i: number) => ({
    onPointerEnter: () => ctx.setActive(slice.id, 'pointer'),
    // Into the hole, a gap or past the list: the hover ends, as when the pointer leaves the
    // chart. Into another slice or row, its own enter takes over. A touch tap keeps its slice.
    onPointerLeave: (event: PointerEvent<SVGElement>) => {
      if (event.pointerType === 'touch') return
      const to = event.relatedTarget
      const svg = event.currentTarget.ownerSVGElement
      if (
        to instanceof Element &&
        HIT_PARTS.includes(to.getAttribute('data-ch-part')) &&
        svg?.contains(to)
      )
        return
      ctx.leave()
    },
    onClick: () => {
      const point = points[i]
      if (point) ctx.select(point)
    },
  })

  // List columns: as wide as their widest text.
  const showValue = legendValue !== 'percent'
  const showPercent = legendValue !== 'value'
  const widest = (pick: (s: DonutSlice<D>) => string) =>
    Math.max(0, ...slices.map((s) => textWidth(pick(s), LIST_SIZE)))
  const percentWidth = showPercent ? widest((s) => s.percentText) : 0
  const valueWidth = showValue ? widest((s) => s.valueText) : 0
  const columns =
    showValue && showPercent ? valueWidth + COLUMN_GAP + percentWidth : valueWidth + percentWidth
  // The columns end at the list's right edge, but never start before the name column: in a list
  // too narrow for them (a forced position) the values run past the right edge instead.
  const rowEnd = Math.max(layout.listWidth, NAME_X + columns)
  const percentX = rowEnd
  const valueX = showPercent ? percentX - percentWidth - COLUMN_GAP : percentX
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
            data-ch-dimmed={dimmed(i)}
            data-ch-selectable={selectable(slice)}
            d={arcs[i]?.path ?? ''}
            {...pointer(slice, i)}
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
          <text data-ch-part="donut-center-label" x={0} y={labelY} textAnchor="middle">
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
                data-ch-active={i === active ? 'true' : undefined}
                transform={`translate(${round2(layout.listX)},${round2(layout.listY + i * ROW)})`}
              >
                <rect
                  data-ch-part="donut-swatch"
                  data-ch-level={slice.level}
                  data-ch-dimmed={dimmed(i)}
                  x={0}
                  y={SWATCH_Y}
                  width={SWATCH}
                  height={SWATCH}
                  rx={2}
                />
                <text data-ch-part="donut-name" x={NAME_X} y={ROW_BASELINE}>
                  {name !== slice.name ? <title>{slice.name}</title> : null}
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
                    x2={round2(layout.listWidth)}
                    y1={ROW}
                    y2={ROW}
                  />
                ) : null}
                {/* The whole row, over the swatch and the rule. */}
                <rect
                  data-ch-part="donut-hit"
                  data-ch-selectable={selectable(slice)}
                  fill="transparent"
                  x={0}
                  y={0}
                  width={round2(rowEnd)}
                  height={ROW}
                  {...pointer(slice, i)}
                />
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
  dataTable = true,
  tooltip = true,
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

  const built = useMemo((): DonutRow<D>[] => {
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
  // Inline accessors rebuild the rows on every render; keep the previous ones while they match.
  const stableRows = useRef(built)
  if (!sameRows(stableRows.current, built)) stableRows.current = built
  const rows = stableRows.current

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
        key: row ? String(row.index) : OTHER_ID,
        id: row ? row.rowId : OTHER_ID,
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

  if (
    DEV &&
    slices.some((s) => s.row === null) &&
    slices.some((s) => s.row !== null && s.id === OTHER_ID)
  ) {
    warn(
      'donut-other-id',
      'DonutChart row id "other" repeats the id of the "Other" slice; give the row another id.',
    )
  }

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
        // A forced 'right' in a narrow chart leaves no room: never a negative width.
        listWidth: Math.max(0, w - box - LIST_GAP),
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

  // One table row per data row, in data order; skipped rows keep their name with empty cells.
  // Shares are of all valid rows, by the largest remainder, so they add up to 100.
  let table: DataTableSpec<DonutRow<D>> | undefined
  if (dataTable) {
    const valid = rows.filter((r) => r.valid)
    const percents = largestRemainder(valid.map((r) => (total > 0 ? (r.value / total) * 100 : 0)))
    const shareAt = new Map(
      valid.map((r, i) => [r.index, percentText(percents[i] ?? 0, r.value)] as const),
    )
    table = {
      columns: [
        { header: headerOf(x, messages.headerPart ?? HEADER_PART), value: (r) => r.name },
        {
          header: messages.headerValue ?? HEADER_VALUE,
          value: (r) => (r.valid ? fmt(r.value) : ''),
        },
        {
          header: messages.headerShare ?? HEADER_SHARE,
          value: (r) => shareAt.get(r.index) ?? '',
        },
      ],
    }
  }

  // A function tooltip is for the user's rows: "Other" has none and shows the default pill.
  const userTooltip = tooltipContent(tooltip)
  const content: TooltipProps['content'] = userTooltip
    ? (point) =>
        point.id === OTHER_ID && point.index === -1 ? (
          <TooltipPill segments={point.segments} />
        ) : (
          userTooltip(point)
        )
    : undefined

  return (
    <FittedChart<DonutRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={slices.length > 0 ? rows : []}
      dataTable={withTableOptions(table, dataTable)}
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
      {tooltip ? <Tooltip content={content} /> : null}
      {children}
    </FittedChart>
  )
}
