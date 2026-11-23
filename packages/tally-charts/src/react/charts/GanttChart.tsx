import { type CSSProperties, useMemo } from 'react'
import { resolveAccessor, resolveIds } from '../../core/accessor'
import { autoTickLabels } from '../../core/date'
import { round2 } from '../../core/path'
import { CHAR_WIDTH, truncateLabel } from '../../core/text'
import { estimateWidth, fitTimeTicks } from '../../core/ticks'
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
import { KEY_BASELINE, KEY_DONE, KEY_MILESTONE, KEY_OVERRUN, KEY_PLANNED, TODAY } from '../messages'
import {
  doneShare,
  type GanttEntry,
  type GanttMark,
  ganttColumns,
  ganttMark,
  ganttOverrun,
  ganttRows,
} from './gantt-geometry'
import { dayText, type GanttValue, ganttDate, ganttValue } from './gantt-text'
import {
  type ChartPassThroughProps,
  type ChartTooltip,
  type DataTableOptions,
  userCallbacks,
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
    /** The time axis. Default: from the data, rounded out to tick boundaries. */
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
  /** About one tick per 100 px of plot, at least 2. */
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
const MILESTONE = 12
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
/** `CHAR_WIDTH` is a glyph of 13 px text; value labels and the now label are 12 px. */
const SMALL_CHAR = (CHAR_WIDTH * 12) / 13

const textWidth = (text: string) => text.length * CHAR_WIDTH
const smallWidth = (text: string) => text.length * SMALL_CHAR
const valueWidth = (v: GanttValue) => smallWidth(v.over ? `${v.text} ${v.over}` : v.text)

/**
 * After its mark; else, when that would cross the chart's right edge, right-aligned before the
 * mark's start; else (crossing the plot's left edge or the row's baseline marker) nowhere.
 */
function placeValue(
  mark: GanttMark,
  width: number,
  plotX: number,
  chartWidth: number,
): GanttLabelPlace | null {
  if (!mark.visible) return null
  const gap = mark.milestone ? MILESTONE_VALUE_GAP : VALUE_GAP
  const right = plotX + mark.x + mark.width + gap
  if (right + width <= chartWidth) return { x: right, side: 'right' }
  const end = plotX + mark.x - gap
  if (end - width < plotX) return null
  const b = mark.baseline
  if (b) {
    // A milestone's baseline diamond reaches half its diagonal either side of its centre.
    const reach = mark.milestone ? (MILESTONE_BASELINE * Math.SQRT2) / 2 : 0
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
}) {
  const ctx = useChartContext('GanttChart')
  const { locale } = useLocale()
  const { rows, zone, tone, values, keyWords, nowText } = props
  const layout = props.layoutAt(ctx.width)
  const { top, plotX, plotWidth, scale, entries, marks, rowsTop, rowsHeight, keyHeight, nowX } =
    layout

  const ticksAt = scale.ticks(layout.count)
  const [a, b] = ticksAt
  const step = a !== undefined && b !== undefined ? b - a : undefined
  // Thinned and labelled as Axis does for a time axis. A label that would cross the chart's right
  // edge goes; its grid line stays.
  const ticks = fitTimeTicks(
    ticksAt.map((value) => ({
      value,
      position: scale(value) + TICK_GAP,
      label: '',
      anchor: 'start',
    })),
    (list) => autoTickLabels(list, { locale, zone, step }),
    estimateWidth,
  ).filter((t) => plotX + t.position + estimateWidth(t) <= ctx.width)

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
        return (
          <g
            key={row.index}
            data-ch-part="gantt-row"
            data-ch-kind={row.milestone ? 'milestone' : 'task'}
            transform={`translate(0,${y})`}
          >
            <text data-ch-part="gantt-name" x={0} y={top ? TOP_LINE : ROW_LINE}>
              {name !== row.name ? <title>{row.name}</title> : null}
              {name}
            </text>
            {mark.milestone ? (
              <>
                {mark.baseline ? (
                  <rect
                    data-ch-part="gantt-milestone-baseline"
                    {...diamond(plotX + mark.baseline.x, barTop + CENTRE, MILESTONE_BASELINE)}
                  />
                ) : null}
                {mark.visible ? (
                  <rect
                    data-ch-part="gantt-milestone"
                    data-ch-reached={row.done >= 1 ? 'true' : 'false'}
                    {...diamond(plotX + mark.x, barTop + CENTRE, MILESTONE)}
                  />
                ) : null}
              </>
            ) : (
              <>
                {mark.visible ? (
                  <g data-ch-part="gantt-bar" clipPath={`url(#${clipId})`}>
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
  // The data table and the tooltip come with later work on this chart.
  dataTable: _dataTable = true,
  tooltip: _tooltip = true,
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

  const { rows, badDate, badBaseline, badProgress } = useMemo(() => {
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
  const values = useMemo(
    () =>
      valueLabels
        ? drawn.map((r) => {
            const item = {
              start: r.start as number,
              end: r.end,
              baselineStart: r.baselineStart,
              baselineEnd: r.baselineEnd,
              done: r.done,
            }
            return ganttValue({ ...item, overMs: ganttOverrun(item) }, days, date)
          })
        : null,
    [valueLabels, drawn, days, date],
  )
  const widestValue = values ? Math.max(0, ...values.map(valueWidth)) : 0
  const nowText = nowMs === undefined ? '' : `${messages.today ?? TODAY} · ${date(nowMs)}`
  const keyWords: Record<GanttKind, string> = {
    done: messages.keyDone ?? KEY_DONE,
    planned: messages.keyPlanned ?? KEY_PLANNED,
    overrun: messages.keyOverrun ?? KEY_OVERRUN,
    baseline: messages.keyBaseline ?? KEY_BASELINE,
    milestone: messages.keyMilestone ?? KEY_MILESTONE,
  }

  const layoutAt = (width: number): GanttLayout => {
    const columns = ganttColumns({
      width,
      nameWidth,
      valueWidth: widestValue,
      position: labelPosition,
    })
    const { top, plotX, plotWidth } = columns
    const count = Math.max(2, Math.round(plotWidth / 100))
    const range = given ?? niceTimeDomain(inferTimeDomain(times), zone, count)
    const scale = timeScale(range, [0, plotWidth], zone)
    const { entries, height: rowsHeight } = ganttRows(groups, top)
    const marks = drawn.map((r) =>
      ganttMark(
        {
          start: r.start as number,
          end: r.end,
          baselineStart: r.baselineStart,
          baselineEnd: r.baselineEnd,
          done: r.done,
        },
        scale,
        plotWidth,
      ),
    )
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

  return (
    <FittedChart<GanttRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={drawn.length > 0 ? rows : []}
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
      />
      {children}
    </FittedChart>
  )
}
