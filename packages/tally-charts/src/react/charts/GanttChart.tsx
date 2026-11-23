import { type CSSProperties, useMemo } from 'react'
import { resolveAccessor, resolveIds } from '../../core/accessor'
import { autoTickLabels } from '../../core/date'
import { round2 } from '../../core/path'
import { CHAR_WIDTH, truncateLabel } from '../../core/text'
import { estimateWidth, type Tick, thinTicks } from '../../core/ticks'
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
import { useLocale } from '../ChartsProvider'
import { type Margin, useChartContext } from '../context'
import { doneShare, type GanttEntry, ganttColumns, ganttMark, ganttRows } from './gantt-geometry'
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

interface GanttLayout {
  top: boolean
  plotX: number
  plotWidth: number
  /** About one tick per 100 px of plot, at least 2. */
  count: number
  scale: TimeScale
  entries: GanttEntry[]
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

const textWidth = (text: string) => text.length * CHAR_WIDTH

/** A diamond: a square of side `size` centred on (cx, cy), turned 45° about its centre. */
const diamond = (cx: number, cy: number, size: number) => ({
  x: round2(cx - size / 2),
  y: round2(cy - size / 2),
  width: size,
  height: size,
  transform: `rotate(45 ${round2(cx)} ${round2(cy)})`,
})

const isMissing = (v: unknown) => v === null || v === undefined

/**
 * Tick labels as `Axis` writes them for a time axis: thinned until they stop overlapping, then
 * written again for the ticks that stay (a dropped tick may have carried the year), until nothing
 * changes.
 */
function fitTicks(ticks: readonly Tick[], label: (values: readonly number[]) => string[]): Tick[] {
  const withLabels = (list: readonly Tick[]) => {
    const labels = label(list.map((t) => t.value as number))
    return list.map((t, i) => ({ ...t, label: labels[i] ?? '' }))
  }
  let kept = withLabels(ticks)
  for (let pass = 0; pass < 4; pass++) {
    const distinct = kept.filter((t, i) => i === 0 || t.label !== kept[i - 1]?.label)
    const next = withLabels(thinTicks(distinct, estimateWidth))
    if (next.length === kept.length && next.every((t, i) => t.label === kept[i]?.label)) break
    kept = next
  }
  return kept
}

function GanttMarks<D>(props: {
  rows: readonly GanttRow<D>[]
  layoutAt: (width: number) => GanttLayout
  zone: TimeZone
  tone: Tone
}) {
  const ctx = useChartContext('GanttChart')
  const { locale } = useLocale()
  const { rows, zone, tone } = props
  const layout = props.layoutAt(ctx.width)
  const { top, plotX, plotWidth, scale, entries, rowsHeight } = layout

  const values = scale.ticks(layout.count)
  const [a, b] = values
  const step = a !== undefined && b !== undefined ? b - a : undefined
  const ticks = fitTicks(
    values.map((value) => ({
      value,
      position: scale(value) + TICK_GAP,
      label: '',
      anchor: 'start',
    })),
    (list) => autoTickLabels(list, { locale, zone, step }),
    // A label that would cross the chart's right edge goes; its grid line stays.
  ).filter((t) => plotX + t.position + estimateWidth(t) <= ctx.width)

  const nameMax = top ? ctx.width : plotX - NAME_GAP
  // Top of the 32 px bar row inside a row.
  const barTop = top ? NAME_ROW : 0
  const corner = (w: number, h: number) => Math.max(0, Math.min(ctx.radius, w / 2, h / 2))

  return (
    <g data-ch-part="gantt" data-ch-labels={top ? 'top' : 'left'}>
      <g data-ch-part="gantt-axis">
        {ticks.map((t) => (
          <text
            key={t.value}
            data-ch-part="gantt-tick"
            x={round2(plotX + t.position)}
            y={TICK_LINE}
          >
            {t.label}
          </text>
        ))}
        {values.map((value) => {
          const x = round2(plotX + scale(value))
          return (
            <line
              key={value}
              data-ch-part="gantt-grid"
              x1={x}
              x2={x}
              y1={TICK_ROW}
              y2={TICK_ROW + rowsHeight}
            />
          )
        })}
      </g>
      {entries.map((entry) => {
        const y = TICK_ROW + entry.y
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
        const mark = ganttMark(
          {
            start: row.start as number,
            end: row.end,
            baselineStart: row.baselineStart,
            baselineEnd: row.baselineEnd,
            done: row.done,
          },
          scale,
          plotWidth,
        )
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
                    {mark.segments.map((s) => {
                      const segmentTone: Tone = s.over ? 'loss' : tone
                      const style = {
                        fill: paintFor(ctx.chartId, segmentTone, s.fill).fill,
                        // The tone, for the outline theme.css draws on hatched parts.
                        '--_ch-swatch-color': `var(--ch-${segmentTone})`,
                      } as CSSProperties
                      return (
                        <rect
                          key={s.x}
                          data-ch-part="gantt-segment"
                          data-ch-tone={segmentTone}
                          data-ch-fill={s.fill}
                          x={round2(plotX + s.x)}
                          y={barTop + BAR_Y}
                          width={s.width}
                          height={BAR_HEIGHT}
                          style={style}
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
  // Value labels, the key, the data table and the tooltip come with later work on this chart.
  valueLabels: _valueLabels = true,
  legend: _legend = true,
  dataTable: _dataTable = true,
  tooltip: _tooltip = true,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: GanttChartProps<D>) {
  const warn = useMemo(() => createWarner(), [])

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

  const layoutAt = (width: number): GanttLayout => {
    const columns = ganttColumns({ width, nameWidth, valueWidth: 0, position: labelPosition })
    const count = Math.max(2, Math.round(columns.plotWidth / 100))
    const range = given ?? niceTimeDomain(inferTimeDomain(times), zone, count)
    const scale = timeScale(range, [0, columns.plotWidth], zone)
    const { entries, height } = ganttRows(groups, columns.top)
    return { ...columns, count, scale, entries, rowsHeight: height, height: TICK_ROW + height }
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
      <GanttMarks<D> rows={drawn} layoutAt={layoutAt} zone={zone} tone={tone} />
      {children}
    </FittedChart>
  )
}
