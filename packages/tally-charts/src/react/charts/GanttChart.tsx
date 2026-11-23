import { type CSSProperties, type PointerEvent, useMemo, useRef } from 'react'
import { resolveAccessor, resolveIds } from '../../core/accessor'
import { autoTickLabels, createDateFormatter } from '../../core/date'
import { round2 } from '../../core/path'
import { CHAR_WIDTH, truncateLabel } from '../../core/text'
import {
  estimateWidth,
  fitTimeTicks,
  type Tick,
  type TimeLabels,
  withLabels,
} from '../../core/ticks'
import {
  inferTimeDomain,
  niceTimeDomain,
  type TimeInput,
  type TimeScale,
  type TimeZone,
  timeScale,
  toTime,
} from '../../core/time'
import type { Accessor, Id, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { paintFor } from '../../theme/patterns'
import { type ChartName, FittedChart } from '../Chart'
import { useLocale, useMessages } from '../ChartsProvider'
import { type Margin, useChartContext } from '../context'
import type { DataTableSpec } from '../DataTable'
import { samePoints } from '../interaction'
import {
  BASELINE_RANGE,
  EARLY,
  formatMessage,
  HEADER_BASELINE_END,
  HEADER_BASELINE_START,
  HEADER_END,
  HEADER_GROUP,
  HEADER_NAME,
  HEADER_PROGRESS,
  HEADER_START,
  HEADER_STATUS,
  LATE,
  LEGEND_BASELINE,
  LEGEND_DONE,
  LEGEND_MILESTONE,
  LEGEND_OVERRUN,
  LEGEND_PLANNED,
  MILESTONE,
  OVER_BASELINE,
  PERCENT_DONE,
  STATUS_DONE,
  STATUS_IN_PROGRESS,
  STATUS_PLANNED,
  STATUS_REACHED,
  STATUS_UPCOMING,
  TODAY,
} from '../messages'
import { Tooltip } from '../overlays/Tooltip'
import type { ChartPoint } from '../types'
import { useRegisterPoints } from '../useRegisterPoints'
import {
  doneShare,
  type GanttEntry,
  type GanttMark,
  ganttColumns,
  ganttMark,
  ganttOverrun,
  ganttRows,
} from './gantt-geometry'
import {
  dayText,
  donePercent,
  type GanttValue,
  type GanttValueRow,
  type GanttWords,
  ganttDate,
  ganttStatus,
  ganttTexts,
  ganttValue,
} from './gantt-text'
import {
  type ChartPassThroughProps,
  type ChartTooltip,
  type DataTableOptions,
  headerOf,
  tooltipContent,
  userCallbacks,
  withTableOptions,
} from './shared'

export type GanttChartProps<D> = ChartName &
  Omit<ChartPassThroughProps<D>, 'aspectRatio' | 'height' | 'margin'> & {
    /** One row per task or milestone, drawn in data order. */
    data: readonly D[]
    /** Task name. */
    x: Accessor<D, string>
    /** When the task starts, or the date of a milestone. */
    start: Accessor<D, TimeInput>
    /** When the task ends. A row without an end, or with an end equal to its start, is a milestone. */
    end?: Accessor<D, TimeInput | null | undefined>
    /** Row id. Default: the data index. */
    id?: Accessor<D, Id>
    /** Group name. Rows of one group are drawn together under a heading. */
    group?: Accessor<D, string | null | undefined>
    /** Planned start. With `baselineEnd`, draws the baseline under the bar. */
    baselineStart?: Accessor<D, TimeInput | null | undefined>
    /** Planned end. */
    baselineEnd?: Accessor<D, TimeInput | null | undefined>
    /** Share of the task that is done, from 0 to 1. Default: derived from `now`. */
    progress?: Accessor<D, number | null | undefined>
    /** The "today" line, and what splits done from planned. Never read from the clock. */
    now?: TimeInput
    /** The time axis. Default: from the data, rounded out to whole calendar steps. */
    domain?: readonly [TimeInput, TimeInput]
    /** Default 'utc', which renders the same on the server and the client. */
    zone?: TimeZone
    /** Default 'accent'. The tone of the bars; an overrun is always 'loss'. */
    tone?: Tone
    /** Where task names go. Default 'auto': left of the bars, above them in a narrow chart. */
    labelPosition?: 'auto' | 'left' | 'top'
    /** The text after each bar (duration, percent, overrun; a milestone's date). Default true. */
    valueLabels?: boolean
    /** The key above the plot. Default true. */
    legend?: boolean
    dataTable?: boolean | DataTableOptions
    tooltip?: ChartTooltip<D>
  }

/** One data row. Drawn when `valid`; the datum of its point. */
interface GanttRow<D> {
  datum: D
  index: number
  rowId: Id
  name: string
  group: string | null
  /** Epoch ms; null when the row is not valid. */
  start: number | null
  /** Epoch ms; null for a milestone or an invalid row. */
  end: number | null
  milestone: boolean
  /** A valid baseline (end after start; a milestone reads only the start), or nulls. */
  baselineStart: number | null
  baselineEnd: number | null
  /** 0–1; for a milestone 1 when reached, else 0. */
  done: number
  valid: boolean
}

/** Same rows, so inline accessors keep the rows (and the points that hold them) they built. */
function sameRows<D>(a: readonly GanttRow<D>[], b: readonly GanttRow<D>[]): boolean {
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
        r.group === t.group &&
        r.start === t.start &&
        r.end === t.end &&
        r.milestone === t.milestone &&
        r.baselineStart === t.baselineStart &&
        r.baselineEnd === t.baselineEnd &&
        r.done === t.done &&
        r.valid === t.valid
      )
    })
  )
}

/** What a pointer can move to and stay on a row: another row's hit rect. */
const HIT_PARTS: readonly (string | null)[] = ['gantt-hit']

/** The key's kinds, in the order the key lists them. */
type GanttKind = 'done' | 'planned' | 'overrun' | 'baseline' | 'milestone'
const KINDS: readonly GanttKind[] = ['done', 'planned', 'overrun', 'baseline', 'milestone']

/** Where a row's value label goes: its x is the text's start (right) or its end (left). */
interface GanttLabelPlace {
  x: number
  side: 'right' | 'left'
}

interface GanttLayout {
  top: boolean
  plotX: number
  plotWidth: number
  /** About one tick per 100 px of plot, at least 5: the domain is niced with it and the ticks drawn with it. */
  count: number
  scale: TimeScale
  entries: GanttEntry[]
  /** One per drawn row. */
  marks: GanttMark[]
  /** One per drawn row; null when the row has no label. Empty without value labels. */
  labels: (GanttLabelPlace | null)[]
  /** Key items with their x and line; empty when the key is not drawn. */
  key: { kind: GanttKind; x: number; line: number }[]
  keyHeight: number
  /** The now line's x in the plot, or null when it is not drawn. */
  nowX: number | null
  /** Top of the first row: under the key and the tick row. */
  rowsTop: number
  /** Height of the rows and headings, under the tick row. */
  rowsHeight: number
  height: number
}

const MARGIN: Margin = { top: 0, right: 0, bottom: 0, left: 0 }
const UNIT_SCALE = { domain: [0, 1] } as const
/** The tick label row above the rows; tick text baseline and its offset right of the tick. */
const TICK_ROW = 28
const TICK_LINE = 17
const TICK_GAP = 6
/** Room between the label column and the plot. */
const NAME_GAP = 12
/** With names on top, the name takes this much above the bar row. */
const NAME_ROW = 20
/** Text baselines: a name or heading in a 32 px row, a name in the 20 px line above a bar row. */
const ROW_LINE = 20
const TOP_LINE = 14
/** Inside a 32 px bar row. */
const BAR_Y = 7
const BAR_HEIGHT = 14
const BASELINE_Y = 24
const BASELINE_HEIGHT = 3
const BASELINE_RADIUS = 2
const CENTRE = 16
const MILESTONE_SIZE = 12
const MILESTONE_BASELINE = 8
/** Value labels: 8 px after a bar's end, 14 px after a milestone's centre; text 4 px under the centre line. */
const VALUE_GAP = 8
const MILESTONE_VALUE_GAP = 14
const VALUE_DROP = 4
/** Under the rows when the now line is drawn: the line runs 6 into it, the text sits on 20. */
const NOW_ROW = 28
const NOW_RUN = 6
const NOW_LINE = 20
/** Key: 24 px lines, an 18 × 10 swatch, its text 6 px after it, 20 px between items. */
const KEY_LINE = 24
const KEY_TEXT_LINE = 16
const KEY_SWATCH = 18
const KEY_SWATCH_Y = 7
const KEY_SWATCH_HEIGHT = 10
const KEY_TEXT_GAP = 6
const KEY_ITEM_GAP = 20
const KEY_DIAMOND = 9
/** `CHAR_WIDTH` (7) is a glyph of 13 px text; value labels and the now label are 12 px: 7 * 12 / 13, written as a literal so the module stays tree-shakable. */
const SMALL_CHAR = 6.461538461538462

const textWidth = (text: string) => text.length * CHAR_WIDTH
const smallWidth = (text: string) => text.length * SMALL_CHAR
const valueWidth = (v: GanttValue) => smallWidth(v.over ? `${v.text} ${v.over}` : v.text)

/**
 * After its mark (an early milestone's: after its baseline diamond, when that lies in the label's
 * way); else, when that would cross the chart's right edge, right-aligned before the mark's start;
 * else (crossing the plot's left edge or the row's baseline marker) nowhere.
 */
function placeValue(
  mark: GanttMark,
  width: number,
  plotX: number,
  chartWidth: number,
): GanttLabelPlace | null {
  if (!mark.visible) return null
  const gap = mark.milestone ? MILESTONE_VALUE_GAP : VALUE_GAP
  const b = mark.baseline
  // A milestone's baseline diamond reaches half its diagonal either side of its centre.
  const reach = mark.milestone ? (MILESTONE_BASELINE * Math.SQRT2) / 2 : 0
  const from =
    mark.milestone && b && b.x > mark.x && b.x - reach < mark.x + gap + width ? b.x : mark.x
  const right = plotX + from + mark.width + gap
  if (right + width <= chartWidth) return { x: right, side: 'right' }
  const end = plotX + mark.x - gap
  if (end - width < plotX) return null
  if (b) {
    const b0 = plotX + b.x - reach
    const b1 = plotX + b.x + b.width + reach
    if (end - width < b1 && end > b0) return null
  }
  return { x: end, side: 'left' }
}

/**
 * A diamond: a square of side `size` centred on (cx, cy), turned 45°. The square is drawn at the
 * origin and moved by its transform, so no attribute goes negative near the plot's left edge.
 */
const diamond = (cx: number, cy: number, size: number) => ({
  x: 0,
  y: 0,
  width: size,
  height: size,
  transform: `translate(${round2(cx)},${round2(cy)}) rotate(45) translate(${-size / 2},${-size / 2})`,
})

const isMissing = (v: unknown) => v === null || v === undefined

function GanttMarks<D>(props: {
  rows: readonly GanttRow<D>[]
  layoutAt: (width: number) => GanttLayout
  zone: TimeZone
  tone: Tone
  /** One per row, or null without value labels. */
  values: readonly GanttValue[] | null
  keyWords: Readonly<Record<GanttKind, string>>
  /** "Today · Mar 27", or '' without `now`. */
  nowText: string
  /** One per row: the announcement and the tooltip lines. */
  texts: readonly { label: string; tooltip: string[] }[]
}) {
  const ctx = useChartContext('GanttChart')
  const { locale } = useLocale()
  const { rows, zone, tone, values, keyWords, nowText, texts } = props
  const layout = props.layoutAt(ctx.width)
  const { top, plotX, plotWidth, scale, entries, marks, rowsTop, rowsHeight, keyHeight, nowX } =
    layout

  const ticksAt = scale.ticks(layout.count)
  const [a, b] = ticksAt
  const step = a !== undefined && b !== undefined ? b - a : undefined
  const label: TimeLabels = (list) => autoTickLabels(list, { locale, zone, step })
  const inside = (t: Tick) => plotX + t.position + estimateWidth(t) <= ctx.width
  // Labelled and thinned as Axis does for a time axis. A label that would cross the chart's right
  // edge goes first, so the thinning keeps labels that are drawn; every tick keeps its grid line.
  const ticks = fitTimeTicks(
    withLabels(
      ticksAt.map((value) => ({
        value,
        position: scale(value) + TICK_GAP,
        label: '',
        anchor: 'start',
      })),
      label,
    ).filter(inside),
    label,
    estimateWidth,
  ).filter(inside)

  const nameMax = top ? ctx.width : plotX - NAME_GAP
  // Top of the 32 px bar row inside a row.
  const barTop = top ? NAME_ROW : 0
  const corner = (w: number, h: number) => Math.max(0, Math.min(ctx.radius, w / 2, h / 2))
  const paint = (t: Tone, fill: 'solid' | 'hatch') =>
    ({
      fill: paintFor(ctx.chartId, t, fill).fill,
      // The tone, for the outline theme.css draws on hatched parts.
      '--_ch-swatch-color': `var(--ch-${t})`,
    }) as CSSProperties

  // One point per row in drawn order, at the middle of its bar (a milestone's centre) on the bar
  // centre line; a row outside the plot sits at the nearest plot edge.
  const built: ChartPoint[] = []
  for (const entry of entries) {
    if (entry.row === null) continue
    const row = rows[entry.row] as GanttRow<D>
    const mark = marks[entry.row] as GanttMark
    const text = texts[entry.row]
    const mid = row.end === null ? (row.start as number) : ((row.start as number) + row.end) / 2
    const outside = scale(mid)
    const x = mark.visible
      ? mark.x + mark.width / 2
      : Number.isFinite(outside)
        ? Math.min(plotWidth, Math.max(0, outside))
        : 0
    built.push({
      id: row.rowId,
      index: row.index,
      datum: row,
      x: round2(plotX + x),
      y: rowsTop + entry.y + barTop + (row.milestone ? CENTRE : BAR_Y + BAR_HEIGHT / 2),
      label: text?.label ?? row.name,
      segments: (text?.tooltip ?? [row.name]).map((value) => ({ value })),
    })
  }
  // Inline accessors and layouts build a new array on every render even when nothing it holds
  // changed; keep the previous array while the content is the same.
  const stable = useRef<ChartPoint[]>([])
  if (!samePoints(stable.current, built)) stable.current = built
  const points = stable.current
  useRegisterPoints(points)

  const activeOf = (row: GanttRow<D>) => ctx.activeId !== null && row.rowId === ctx.activeId
  const anyActive = ctx.activeId !== null && rows.some(activeOf)
  const dimmed = (row: GanttRow<D>) =>
    ctx.dimInactive && anyActive && !activeOf(row) ? 'true' : undefined
  const pointAt = (row: GanttRow<D>) => points.find((p) => p.index === row.index)
  // The row under the pointer: its hit rect covers the name, the plot and the gutter.
  const pointer = (row: GanttRow<D>) => ({
    onPointerEnter: () => ctx.setActive(row.rowId, 'pointer'),
    // Into a heading or past the rows: the hover ends, as when the pointer leaves the chart. Into
    // another row, its own enter takes over. A touch tap keeps its row.
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
      const point = pointAt(row)
      if (point) ctx.select(point)
    },
  })

  // The now label is centred on the line and kept inside the plot.
  const nowHalf = smallWidth(nowText) / 2
  const nowLabelX =
    nowX === null
      ? 0
      : plotWidth <= 2 * nowHalf
        ? plotWidth / 2
        : Math.min(plotWidth - nowHalf, Math.max(nowHalf, nowX))

  const swatch = (kind: GanttKind) => {
    if (kind === 'baseline') {
      return (
        <rect
          x={0}
          y={KEY_SWATCH_Y + (KEY_SWATCH_HEIGHT - BASELINE_HEIGHT) / 2}
          width={KEY_SWATCH}
          height={BASELINE_HEIGHT}
          rx={BASELINE_RADIUS}
        />
      )
    }
    if (kind === 'milestone') {
      return (
        <rect {...diamond(KEY_SWATCH / 2, KEY_SWATCH_Y + KEY_SWATCH_HEIGHT / 2, KEY_DIAMOND)} />
      )
    }
    const fill = kind === 'planned' ? 'hatch' : 'solid'
    return (
      <rect
        data-ch-fill={fill}
        x={0}
        y={KEY_SWATCH_Y}
        width={KEY_SWATCH}
        height={KEY_SWATCH_HEIGHT}
        rx={round2(corner(KEY_SWATCH, KEY_SWATCH_HEIGHT))}
        style={paint(kind === 'overrun' ? 'loss' : tone, fill)}
      />
    )
  }

  return (
    <g data-ch-part="gantt" data-ch-labels={top ? 'top' : 'left'}>
      {layout.key.length > 0 ? (
        <g data-ch-part="gantt-key">
          {layout.key.map((item) => (
            <g
              key={item.kind}
              data-ch-part="gantt-key-item"
              data-ch-kind={item.kind}
              transform={`translate(${round2(item.x)},${item.line * KEY_LINE})`}
            >
              {swatch(item.kind)}
              <text x={KEY_SWATCH + KEY_TEXT_GAP} y={KEY_TEXT_LINE}>
                {keyWords[item.kind]}
              </text>
            </g>
          ))}
        </g>
      ) : null}
      <g data-ch-part="gantt-axis">
        {ticks.map((t) => (
          <text
            key={t.value}
            data-ch-part="gantt-tick"
            x={round2(plotX + t.position)}
            y={keyHeight + TICK_LINE}
          >
            {t.label}
          </text>
        ))}
        {ticksAt.map((value) => {
          const x = round2(plotX + scale(value))
          return (
            <line
              key={value}
              data-ch-part="gantt-grid"
              x1={x}
              x2={x}
              y1={rowsTop}
              y2={rowsTop + rowsHeight}
            />
          )
        })}
      </g>
      {nowX === null ? null : (
        <>
          {/* Over the grid, under the bars. */}
          <line
            data-ch-part="gantt-now"
            x1={round2(plotX + nowX)}
            x2={round2(plotX + nowX)}
            y1={rowsTop}
            y2={rowsTop + rowsHeight + NOW_RUN}
          />
          <text
            data-ch-part="gantt-now-label"
            x={round2(plotX + nowLabelX)}
            y={rowsTop + rowsHeight + NOW_LINE}
            textAnchor="middle"
          >
            {nowText}
          </text>
        </>
      )}
      {entries.map((entry) => {
        const y = rowsTop + entry.y
        if (entry.row === null) {
          const heading = entry.heading ?? ''
          const shown = truncateLabel(heading, nameMax)
          // With names on top, the rule starts after the heading text.
          const x1 = top ? Math.min(ctx.width, textWidth(shown) + NAME_GAP) : plotX
          return (
            <g
              key={`heading:${entry.groupIndex}`}
              data-ch-part="gantt-heading"
              transform={`translate(0,${y})`}
            >
              <text x={0} y={ROW_LINE}>
                {shown !== heading ? <title>{heading}</title> : null}
                {shown}
              </text>
              <line
                data-ch-part="gantt-heading-rule"
                x1={round2(x1)}
                x2={round2(Math.max(x1, plotX + plotWidth))}
                y1={CENTRE}
                y2={CENTRE}
              />
            </g>
          )
        }
        const row = rows[entry.row] as GanttRow<D>
        const name = truncateLabel(row.name, nameMax)
        const mark = marks[entry.row] as GanttMark
        const value = values?.[entry.row]
        const place = layout.labels[entry.row]
        const clipId = `${ctx.chartId}-gantt-clip-${row.index}`
        const dim = dimmed(row)
        return (
          <g
            key={row.index}
            data-ch-part="gantt-row"
            data-ch-kind={row.milestone ? 'milestone' : 'task'}
            data-ch-active={activeOf(row) ? 'true' : undefined}
            transform={`translate(0,${y})`}
          >
            <text data-ch-part="gantt-name" x={0} y={top ? TOP_LINE : ROW_LINE}>
              {name}
            </text>
            {mark.milestone ? (
              <>
                {mark.baseline ? (
                  <rect
                    data-ch-part="gantt-milestone-baseline"
                    data-ch-dimmed={dim}
                    {...diamond(plotX + mark.baseline.x, barTop + CENTRE, MILESTONE_BASELINE)}
                  />
                ) : null}
                {mark.visible ? (
                  <rect
                    data-ch-part="gantt-milestone"
                    data-ch-dimmed={dim}
                    data-ch-reached={row.done >= 1 ? 'true' : 'false'}
                    {...diamond(plotX + mark.x, barTop + CENTRE, MILESTONE_SIZE)}
                  />
                ) : null}
              </>
            ) : (
              <>
                {mark.visible ? (
                  <g data-ch-part="gantt-bar" data-ch-dimmed={dim} clipPath={`url(#${clipId})`}>
                    {/* The bar's corners round its outer ends; the joints between parts stay square. */}
                    <clipPath id={clipId}>
                      <rect
                        x={round2(plotX + mark.x)}
                        y={barTop + BAR_Y}
                        width={mark.width}
                        height={BAR_HEIGHT}
                        rx={round2(corner(mark.width, BAR_HEIGHT))}
                      />
                    </clipPath>
                    {mark.segments.map((s, i) => {
                      const segmentTone: Tone = s.over ? 'loss' : tone
                      return (
                        <rect
                          // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional (left to right, never reordered), and two can round to the same x
                          key={i}
                          data-ch-part="gantt-segment"
                          data-ch-tone={segmentTone}
                          data-ch-fill={s.fill}
                          x={round2(plotX + s.x)}
                          y={barTop + BAR_Y}
                          width={s.width}
                          height={BAR_HEIGHT}
                          style={paint(segmentTone, s.fill)}
                        />
                      )
                    })}
                  </g>
                ) : null}
                {mark.baseline ? (
                  <rect
                    data-ch-part="gantt-baseline"
                    data-ch-dimmed={dim}
                    x={round2(plotX + mark.baseline.x)}
                    y={barTop + BASELINE_Y}
                    width={mark.baseline.width}
                    height={BASELINE_HEIGHT}
                    rx={round2(Math.max(0, Math.min(BASELINE_RADIUS, mark.baseline.width / 2)))}
                  />
                ) : null}
              </>
            )}
            {value && place ? (
              <text
                data-ch-part="gantt-value"
                data-ch-side={place.side}
                x={round2(place.x)}
                y={barTop + (mark.milestone ? CENTRE : BAR_Y + BAR_HEIGHT / 2) + VALUE_DROP}
                textAnchor={place.side === 'left' ? 'end' : undefined}
              >
                {value.over ? `${value.text} ` : value.text}
                {value.over ? <tspan data-ch-part="gantt-over">{value.over}</tspan> : null}
              </text>
            ) : null}
            {/* The whole row, over the name, the bar and the value label. */}
            <rect
              data-ch-part="gantt-hit"
              data-ch-selectable={ctx.selectable ? 'true' : undefined}
              fill="transparent"
              x={0}
              y={0}
              width={round2(Math.max(0, ctx.width))}
              height={entry.height}
              {...pointer(row)}
            >
              {/* The hit rect covers the name, so a cut name's native tooltip lives here. */}
              {name !== row.name ? <title>{row.name}</title> : null}
            </rect>
          </g>
        )
      })}
    </g>
  )
}

export function GanttChart<D>({
  data,
  x,
  start,
  end,
  id,
  group,
  baselineStart,
  baselineEnd,
  progress,
  now,
  domain,
  zone = 'utc',
  tone = 'accent',
  labelPosition = 'auto',
  valueLabels = true,
  legend = true,
  dataTable = true,
  tooltip = true,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: GanttChartProps<D>) {
  const warn = useMemo(() => createWarner(), [])
  const messages = useMessages()
  const { locale } = useLocale()

  const nowMs = now === undefined ? undefined : toTime(now)
  const badNow = now !== undefined && nowMs === undefined
  if (DEV && badNow) warn('gantt-now', 'GanttChart ignored an invalid `now`.')

  const d0 = domain ? toTime(domain[0]) : undefined
  const d1 = domain ? toTime(domain[1]) : undefined
  const given: [number, number] | null =
    d0 !== undefined && d1 !== undefined && d0 < d1 ? [d0, d1] : null
  if (DEV && domain && !given) {
    warn(
      'gantt-domain',
      'GanttChart ignored a domain that is not two valid dates, start before end.',
    )
  }

  const built = useMemo(() => {
    const getName = resolveAccessor(x)
    const getStart = resolveAccessor(start)
    const getEnd = end === undefined ? undefined : resolveAccessor(end)
    const getGroup = group === undefined ? undefined : resolveAccessor(group)
    const getBaseStart = baselineStart === undefined ? undefined : resolveAccessor(baselineStart)
    const getBaseEnd = baselineEnd === undefined ? undefined : resolveAccessor(baselineEnd)
    const getProgress = progress === undefined ? undefined : resolveAccessor(progress)
    const ids = resolveIds(data, id, warn)
    let badDate = false
    let badBaseline = false
    let badProgress = false
    const rows = data.map((d, i): GanttRow<D> => {
      const rawEnd = getEnd?.(d, i)
      const s = toTime(getStart(d, i))
      const e = isMissing(rawEnd) ? null : toTime(rawEnd)
      const valid = s !== undefined && e !== undefined && (e === null || e >= s)
      if (!valid) badDate = true
      const milestone = valid && (e === null || e === s)

      let bs: number | null = null
      let be: number | null = null
      if (valid && (getBaseStart || getBaseEnd)) {
        const rawStart = getBaseStart?.(d, i)
        const rawBaseEnd = milestone ? undefined : getBaseEnd?.(d, i)
        const ms = isMissing(rawStart) ? null : (toTime(rawStart) ?? Number.NaN)
        const me = isMissing(rawBaseEnd) ? null : (toTime(rawBaseEnd) ?? Number.NaN)
        if (milestone) {
          if (ms !== null && Number.isFinite(ms)) bs = ms
          else if (ms !== null) badBaseline = true
        } else if (ms !== null && me !== null && ms < me) {
          bs = ms
          be = me
        } else if (ms !== null || me !== null) {
          badBaseline = true
        }
      }

      let share: number | undefined
      const raw = getProgress?.(d, i)
      if (valid && !isMissing(raw)) {
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          if (raw < 0 || raw > 1) badProgress = true
          share = raw
        } else {
          badProgress = true
        }
      }

      const rawGroup = valid ? getGroup?.(d, i) : undefined
      const startMs = valid ? (s as number) : null
      const done = !valid
        ? 0
        : milestone
          ? (share !== undefined ? share >= 1 : nowMs === undefined || (s as number) <= nowMs)
            ? 1
            : 0
          : doneShare(s as number, e as number, share, nowMs)
      return {
        datum: d,
        index: i,
        rowId: ids[i] ?? i,
        name: String(getName(d, i) ?? ''),
        group: isMissing(rawGroup) || rawGroup === '' ? null : String(rawGroup),
        start: startMs,
        end: milestone ? null : (e ?? null),
        milestone,
        baselineStart: bs,
        baselineEnd: be,
        done,
        valid,
      }
    })
    return { rows, badDate, badBaseline, badProgress }
  }, [data, x, start, end, id, group, baselineStart, baselineEnd, progress, nowMs, warn])
  const { badDate, badBaseline, badProgress } = built
  // Inline accessors rebuild the rows on every render; keep the previous ones while they match.
  const stableRows = useRef(built.rows)
  if (!sameRows(stableRows.current, built.rows)) stableRows.current = built.rows
  const rows = stableRows.current

  if (DEV && badDate) {
    warn(
      'gantt-date',
      'GanttChart skipped a row with a missing or invalid start, an invalid end, or an end before its start.',
    )
  }
  if (DEV && badBaseline) {
    warn(
      'gantt-baseline',
      'GanttChart ignored a baseline that is invalid, half missing or ends before it starts.',
    )
  }
  if (DEV && badProgress) {
    warn(
      'gantt-progress',
      'GanttChart progress must be a number from 0 to 1; it was clamped or ignored.',
    )
  }

  const drawn = useMemo(() => rows.filter((r) => r.valid), [rows])
  const groups = useMemo(() => drawn.map((r) => r.group), [drawn])
  const nameWidth = useMemo(
    () => Math.max(0, ...drawn.flatMap((r) => [textWidth(r.name), textWidth(r.group ?? '')])),
    [drawn],
  )
  const times = useMemo(
    () =>
      drawn.flatMap((r) =>
        [r.start, r.end, r.baselineStart, r.baselineEnd].filter((t): t is number => t !== null),
      ),
    [drawn],
  )

  // Dates drop the year when the explicit domain, or else the data, lies in one year. (The data's
  // extent, not the rounded-out domain: that one depends on the width, which depends on the labels.)
  const [g0, g1] = given ?? inferTimeDomain(times)
  const date = useMemo(() => ganttDate(locale, zone, [g0, g1]), [locale, zone, g0, g1])
  const days = useMemo(() => dayText(locale, 'narrow'), [locale])
  const longDays = useMemo(() => dayText(locale, 'long'), [locale])
  // One per drawn row: what the geometry and the texts are built from.
  const items = useMemo(
    () =>
      drawn.map((r): GanttValueRow => {
        const item = {
          start: r.start as number,
          end: r.end,
          baselineStart: r.baselineStart,
          baselineEnd: r.baselineEnd,
          done: r.done,
        }
        return { ...item, overMs: ganttOverrun(item) }
      }),
    [drawn],
  )
  const values = useMemo(
    () => (valueLabels ? items.map((item) => ganttValue(item, days, date)) : null),
    [valueLabels, items, days, date],
  )
  const words: GanttWords = {
    statusDone: messages.statusDone ?? STATUS_DONE,
    statusInProgress: messages.statusInProgress ?? STATUS_IN_PROGRESS,
    statusPlanned: messages.statusPlanned ?? STATUS_PLANNED,
    milestone: messages.milestone ?? MILESTONE,
    statusReached: messages.statusReached ?? STATUS_REACHED,
    statusUpcoming: messages.statusUpcoming ?? STATUS_UPCOMING,
    percentDone: messages.percentDone ?? PERCENT_DONE,
    overBaseline: messages.overBaseline ?? OVER_BASELINE,
    late: messages.late ?? LATE,
    early: messages.early ?? EARLY,
    baselineRange: messages.baselineRange ?? BASELINE_RANGE,
  }
  const texts = items.map((item, i) =>
    ganttTexts({ ...item, name: (drawn[i] as GanttRow<D>).name }, words, longDays, date),
  )
  // The gutter's room: the widest label with its own gap after its mark.
  const widestValue = values
    ? Math.max(
        0,
        ...values.map(
          (v, i) =>
            valueWidth(v) +
            ((items[i] as GanttValueRow).end === null ? MILESTONE_VALUE_GAP : VALUE_GAP),
        ),
      )
    : 0
  const nowText =
    nowMs === undefined ? '' : formatMessage(messages.today ?? TODAY, { date: date(nowMs) })
  const keyWords: Record<GanttKind, string> = {
    done: messages.legendDone ?? LEGEND_DONE,
    planned: messages.legendPlanned ?? LEGEND_PLANNED,
    overrun: messages.legendOverrun ?? LEGEND_OVERRUN,
    baseline: messages.legendBaseline ?? LEGEND_BASELINE,
    milestone: messages.legendMilestone ?? LEGEND_MILESTONE,
  }

  const layoutAt = (width: number): GanttLayout => {
    const columns = ganttColumns({
      width,
      nameWidth,
      valueWidth: widestValue,
      position: labelPosition,
    })
    const { top, plotX, plotWidth } = columns
    // At least five: with the two or three of a narrow plot, a schedule of a few weeks would be
    // rounded out to whole months and get a single tick. The ticks are drawn with the same count,
    // so the axis ends normally fall on grid lines; fitTimeTicks thins their labels.
    const count = Math.max(5, Math.round(plotWidth / 100))
    const range = given ?? niceTimeDomain(inferTimeDomain(times), zone, count)
    const scale = timeScale(range, [0, plotWidth], zone)
    const { entries, height: rowsHeight } = ganttRows(groups, top)
    const marks = items.map((item) => ganttMark(item, scale, plotWidth))
    const labels = values
      ? marks.map((mark, i) => placeValue(mark, valueWidth(values[i] as GanttValue), plotX, width))
      : []

    // The key: the kinds present, from two up, flowing left to right and wrapping.
    const present: Record<GanttKind, boolean> = {
      done: marks.some((m) => m.segments.some((s) => s.fill === 'solid' && !s.over)),
      planned: marks.some((m) => m.segments.some((s) => s.fill === 'hatch')),
      overrun: marks.some((m) => m.segments.some((s) => s.over)),
      baseline: drawn.some((r) => r.baselineStart !== null),
      milestone: drawn.some((r) => r.milestone),
    }
    const kinds = legend ? KINDS.filter((kind) => present[kind]) : []
    const key: GanttLayout['key'] = []
    if (kinds.length >= 2) {
      let x = 0
      let line = 0
      for (const kind of kinds) {
        const itemWidth = KEY_SWATCH + KEY_TEXT_GAP + textWidth(keyWords[kind])
        if (x > 0 && x + itemWidth > width) {
          line++
          x = 0
        }
        key.push({ kind, x, line })
        x += itemWidth + KEY_ITEM_GAP
      }
    }
    const lines = key.length > 0 ? (key[key.length - 1] as (typeof key)[number]).line + 1 : 0
    const keyHeight = lines * KEY_LINE

    const [r0, r1] = scale.domain()
    const nowX = nowMs !== undefined && nowMs >= r0 && nowMs <= r1 ? scale(nowMs) : null
    const rowsTop = keyHeight + TICK_ROW
    return {
      top,
      plotX,
      plotWidth,
      count,
      scale,
      entries,
      marks,
      labels,
      key,
      keyHeight,
      nowX,
      rowsTop,
      rowsHeight,
      height: rowsTop + rowsHeight + (nowX === null ? 0 : NOW_ROW),
    }
  }
  const layoutFor = (width: number) => ({ margin: MARGIN, height: layoutAt(width).height })

  // One table row per data row, in data order; a skipped row keeps its name with empty cells.
  let table: DataTableSpec<GanttRow<D>> | undefined
  if (dataTable) {
    const day = createDateFormatter('day', { locale, zone })
    const at = (ms: number | null) => (ms === null ? '' : day(ms))
    const baseline = baselineStart !== undefined || baselineEnd !== undefined
    table = {
      columns: [
        { header: headerOf(x, messages.headerName ?? HEADER_NAME), value: (r) => r.name },
        ...(group === undefined
          ? []
          : [
              {
                header: headerOf(group, messages.headerGroup ?? HEADER_GROUP),
                value: (r: GanttRow<D>) => r.group ?? '',
              },
            ]),
        { header: messages.headerStart ?? HEADER_START, value: (r) => at(r.start) },
        { header: messages.headerEnd ?? HEADER_END, value: (r) => at(r.end) },
        ...(baseline
          ? [
              {
                header: messages.headerBaselineStart ?? HEADER_BASELINE_START,
                value: (r: GanttRow<D>) => at(r.baselineStart),
              },
              {
                header: messages.headerBaselineEnd ?? HEADER_BASELINE_END,
                value: (r: GanttRow<D>) => at(r.baselineEnd),
              },
            ]
          : []),
        {
          header: messages.headerProgress ?? HEADER_PROGRESS,
          value: (r) => (r.valid && !r.milestone ? `${donePercent(r.done)}%` : ''),
        },
        {
          header: messages.headerStatus ?? HEADER_STATUS,
          value: (r) => (r.valid ? ganttStatus(r, words) : ''),
        },
      ],
    }
  }

  return (
    <FittedChart<GanttRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={drawn.length > 0 ? rows : []}
      dataTable={withTableOptions(table, dataTable)}
      // The chart lays itself out from its width; fixed domains keep the scales quiet.
      x={UNIT_SCALE}
      y={UNIT_SCALE}
      layoutFor={layoutFor}
    >
      <GanttMarks<D>
        rows={drawn}
        layoutAt={layoutAt}
        zone={zone}
        tone={tone}
        values={values}
        keyWords={keyWords}
        nowText={nowText}
        texts={texts}
      />
      {tooltip ? <Tooltip content={tooltipContent(tooltip)} /> : null}
      {children}
    </FittedChart>
  )
}
