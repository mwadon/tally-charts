// biome-ignore-all lint/a11y/useSemanticElements: rows are ARIA options laid out with CSS grid; <select> can't hold them

import { timeDay, unixDay } from 'd3-time'
import {
  type CSSProperties,
  Fragment,
  type KeyboardEvent,
  memo,
  type ReactNode,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  cellBounds,
  DEFAULT_BREAKS,
  normalizeRow,
  parseCell,
  type RunwayCell,
  type RunwayDateFormats,
  type RunwayFacts,
  type RunwayStatusText,
  runwayCells,
  runwayDate,
  runwayFacts,
  statusLines,
} from '../../core/runway'
import { binLevels, sequentialBreaks } from '../../core/thresholds'
import { estimateWidth, type Tick, thinTicks } from '../../core/ticks'
import { DAY, type TimeInput, type TimeZone, timeScale, toTime } from '../../core/time'
import type { Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { DEFAULT_HATCH, patternId, readHatchGeometry } from '../../theme/patterns'
import type { ChartName } from '../Chart'
import { useFormat, useMessages } from '../ChartsProvider'
import { DataTable } from '../DataTable'
import {
  formatMessage,
  HEADER_NAME,
  HEADER_PROJECTED_AT_RESET,
  HEADER_RESETS,
  HEADER_RUNS_OUT,
  HEADER_RUNWAY_DETAIL,
  HEADER_STATUS,
  LEGEND_LOCKED,
  LEGEND_NO_FORECAST,
  LEGEND_PROJECTED_USE,
  LEGEND_RESET,
  LEGEND_RUNS_OUT,
  LEGEND_UNDER_SHARE,
  NO_DATA,
  NOW,
  RESET_MARK,
  STATUS_AT_RESET,
  STATUS_DISCONNECTED,
  STATUS_NO_FORECAST,
  STATUS_RESETS,
  STATUS_RUNS_OUT,
} from '../messages'
import { PatternDefs } from '../PatternDefs'
import { cx } from '../ui/util'
import { useIsoLayoutEffect } from '../useIsoLayoutEffect'
import { useWidth } from '../useWidth'
import { type DataTableOptions, withTableOptions } from './shared'

export type { RunwayFacts } from '../../core/runway'

/** One entity of a {@link RunwayChart}: an allowance and where it is heading. */
export interface RunwayRow {
  /** Unique per row; `selectedId`, `activeId` and the callbacks use it. */
  id: string
  /** Name in the label column and the start of the option's accessible name. */
  label: string
  /** Decorative mark before the label, hidden from assistive tech. */
  icon?: ReactNode
  /** Extra description, e.g. "Side project". Not drawn in the strip; shown in the data table. */
  sublabel?: string
  /**
   * Projected cumulative use, 0–1, linear between points. Absent or empty: no forecast. Cells
   * before the first point take its value, so start the domain at `now` or include history.
   */
  projection?: readonly { at: TimeInput; used: number }[]
  /** When the allowance runs out: the dot, and locked cells from there to `resetAt`. */
  runsOutAt?: TimeInput
  /** When the allowance resets: the reset tick; cells from there on are empty. */
  resetAt?: TimeInput
  /** A muted row with every cell empty. */
  disconnected?: boolean
  /** Replaces the default status text; `null` shows none. A string is also the table's Status. */
  status?: ReactNode
}

/** Props of {@link RunwayChart}. */
export type RunwayChartProps = ChartName & {
  /** One strip per row, in this order. */
  rows: readonly RunwayRow[]
  /** Time span of the strips. */
  domain: readonly [TimeInput, TimeInput]
  /** The present: the Now line, and the reference for "Fri 03:24" versus "Oct 21 09:21". */
  now: TimeInput
  /** Cell length: '30m', '6h', '1d' or ms. Default '6h'. */
  cell?: string | number
  /** Ascending level edges as shares. Default [0.25, 0.5, 0.75]: four levels. 1–4 edges. */
  breaks?: readonly number[]
  /** Sequential tone of the levels and the legend. Default 'neutral'. */
  tone?: Tone
  /** 'auto' stacks the rows when the strip would be under 240 px. Default 'auto'. */
  layout?: 'auto' | 'columns' | 'stacked'
  /** Width before the first measurement and on the server. Default 960 (the columns layout). */
  initialWidth?: number
  /** Label column width in px in the columns layout. Default 200. */
  labelWidth?: number
  /** The selected row, marked with `data-ch-selected`; with `onSelect` also `aria-selected`. */
  selectedId?: string | null
  /** Click, Enter or Space on a row. With it, the rows are a listbox; without, a plain list. */
  onSelect?: (id: string, row: RunwayRow) => void
  /**
   * The highlighted row (hover or keyboard cursor). Pass it to control the highlight, e.g. to
   * link it with another view; `null` for none. Leave it out to let the chart keep its own.
   */
  activeId?: string | null
  /** Called when hover, the keyboard or Escape changes the highlighted row. */
  onActiveChange?: (id: string | null, row: RunwayRow | null) => void
  /**
   * Custom status per row: return `undefined` to keep the default, `null` for none. A string is
   * also the table's Status and part of the option's name. A row's own `status` wins.
   */
  status?: (row: RunwayRow, facts: RunwayFacts) => ReactNode
  /** Default true. */
  legend?: boolean
  /** Accessible description, usually the takeaway sentence. */
  description?: string
  /** A visually hidden table of the rows for screen readers. Default true. */
  dataTable?: boolean | DataTableOptions
  /** Rendered instead of the rows when there are none or the domain is invalid. Default "No data". */
  empty?: ReactNode
  /** Class on the root element. */
  className?: string
  /** Style on the root element. */
  style?: CSSProperties
  /** Stable base for the element ids. Default: React's `useId`. */
  chartId?: string
  /** Zone of the day boundaries and the dates. Default 'utc'. */
  timeZone?: TimeZone
}

const STRIP_HEIGHT = 32
const STATUS_WIDTH = 176 // 11rem
const COLUMN_GAP = 16
const MIN_STRIP = 240
const AXIS_HEIGHT = 40
const PAGE = 5

interface RowModel {
  row: RunwayRow
  cells: RunwayCell[]
  facts: RunwayFacts
  status: ReactNode
  statusText: string
}

/**
 * Where each allowance is heading: one strip of time cells per row, shaded by projected use, with
 * when it runs out, how long it stays locked, and when it resets.
 */
export function RunwayChart({
  rows,
  domain: domainProp,
  now: nowProp,
  cell,
  breaks = DEFAULT_BREAKS,
  tone = 'neutral',
  layout = 'auto',
  initialWidth = 960,
  labelWidth = 200,
  selectedId,
  onSelect,
  activeId,
  onActiveChange,
  status,
  legend = true,
  title,
  'aria-labelledby': labelledBy,
  description,
  dataTable = true,
  empty,
  className,
  style,
  chartId,
  timeZone = 'utc',
}: RunwayChartProps) {
  const warn = useMemo(() => createWarner(), [])
  const { date } = useFormat()
  const messages = useMessages()
  const reactId = useId()
  const baseId = `ch-${(chartId ?? reactId).replace(/[^a-zA-Z0-9_-]/g, '')}`
  const titleId = `${baseId}-title`
  // An element the caller names wins over the hidden `title` span, as in ARIA.
  const nameId = labelledBy ?? (title ? titleId : undefined)
  const descId = `${baseId}-desc`
  if (DEV && !title && !labelledBy) {
    warn('runway-title', 'RunwayChart has no `title`, so screen readers announce an unnamed list.')
  }

  const d0 = toTime(domainProp[0])
  const d1 = toTime(domainProp[1])
  const now = toTime(nowProp)
  const valid = d0 !== undefined && d1 !== undefined && now !== undefined && d0 < d1
  if (DEV && !valid) {
    warn(
      'runway-domain',
      'RunwayChart needs a domain of two valid dates, start before end, and a valid `now`.',
    )
  }

  const rootRef = useRef<HTMLDivElement>(null)
  const axisRef = useRef<HTMLDivElement>(null)
  // jsdom and display:none containers measure 0: keep the initial width then.
  const measuredRoot = useWidth(rootRef, initialWidth, true)
  const rootWidth = measuredRoot > 0 ? measuredRoot : initialWidth
  const stacked =
    layout === 'stacked' ||
    (layout === 'auto' && rootWidth - labelWidth - STATUS_WIDTH - 2 * COLUMN_GAP < MIN_STRIP)
  const initialStrip = stacked
    ? initialWidth
    : Math.max(0, initialWidth - labelWidth - STATUS_WIDTH - 2 * COLUMN_GAP)
  // The axis only exists once there is something to draw; `enabled` re-runs the measurement then.
  const measuredStrip = useWidth(axisRef, initialStrip, valid && rows.length > 0)
  const width = measuredStrip > 0 ? measuredStrip : initialStrip

  const [hatch, setHatch] = useState(DEFAULT_HATCH)
  useIsoLayoutEffect(() => {
    const el = rootRef.current
    if (el) setHatch(readHatchGeometry(getComputedStyle(el)))
  }, [])

  const cellMs = useMemo(() => {
    const ms = parseCell(cell)
    if (ms === undefined) {
      if (DEV)
        warn(
          'runway-cell',
          "RunwayChart `cell` must be like '30m', '6h', '1d' or a positive number of ms; using '6h'.",
        )
      return parseCell(undefined) as number
    }
    return ms
  }, [cell, warn])

  const edges = useMemo(() => {
    const clean = sequentialBreaks(breaks)
    if (DEV && (clean.length !== breaks.length || clean.some((b, i) => b !== breaks[i]))) {
      warn(
        'runway-breaks',
        'RunwayChart `breaks` must be 1–4 finite ascending shares; they were cleaned.',
      )
    }
    return clean.length > 0 ? clean : [...DEFAULT_BREAKS]
  }, [breaks, warn])
  const levels = useMemo(() => binLevels(edges.length + 1), [edges])

  const formats = useMemo<RunwayDateFormats>(
    () => ({
      weekday: date({ weekday: 'short' }, { zone: timeZone }),
      day: date({ month: 'short', day: 'numeric' }, { zone: timeZone }),
      time: date({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, { zone: timeZone }),
    }),
    [date, timeZone],
  )

  const statusText = useMemo(
    (): RunwayStatusText => ({
      disconnected: messages.statusDisconnected ?? STATUS_DISCONNECTED,
      noForecast: messages.statusNoForecast ?? STATUS_NO_FORECAST,
      runsOut: (date) => formatMessage(messages.statusRunsOut ?? STATUS_RUNS_OUT, { date }),
      atReset: (percent) => formatMessage(messages.statusAtReset ?? STATUS_AT_RESET, { percent }),
      resets: (date) => formatMessage(messages.statusResets ?? STATUS_RESETS, { date }),
    }),
    [messages],
  )

  const model = useMemo((): RowModel[] => {
    if (!valid) return []
    const { bounds, cut } = cellBounds([d0, d1], cellMs)
    if (DEV && cut)
      warn('runway-cells', 'RunwayChart shows at most 200 cells; use a longer `cell`.')
    const seen = new Set<string>()
    const duplicates = new Set<string>()
    const built = rows.map((row) => {
      if (DEV) {
        if (seen.has(row.id)) duplicates.add(row.id)
        seen.add(row.id)
      }
      const times = normalizeRow(row, warn)
      const facts = runwayFacts(times, d1)
      const lines = statusLines(facts, !!row.disconnected, now, d1, formats, statusText)
      // `undefined` keeps the default; `null` (or any other node) replaces it.
      const custom = row.status !== undefined ? row.status : status?.(row, facts)
      const own = custom !== undefined
      return {
        row,
        cells: runwayCells(times, bounds, edges, levels),
        facts,
        status: own
          ? custom
          : // A space between the lines keeps them apart in the accessible name and textContent;
            // grid layout drops the whitespace.
            lines.map((line, j) => (
              <Fragment key={line}>
                {j > 0 ? ' ' : null}
                <span className="ch-runway-status-line" data-ch-part="runway-status-line">
                  {line}
                </span>
              </Fragment>
            )),
        statusText:
          typeof custom === 'string' || typeof custom === 'number'
            ? String(custom)
            : own && custom === null
              ? ''
              : lines.join(', '),
      }
    })
    if (DEV && duplicates.size > 0) {
      warn(
        'runway-id',
        `RunwayChart has duplicate row ids: ${[...duplicates].map((id) => `"${id}"`).join(', ')}. Only the first row with each id can be active or selected.`,
      )
    }
    return built
  }, [valid, d0, d1, now, cellMs, rows, edges, levels, formats, statusText, status, warn])

  const [innerActive, setInnerActive] = useState<string | null>(null)
  const controlled = activeId !== undefined
  const active = controlled ? activeId : innerActive
  const activeRef = useRef(active)
  activeRef.current = active
  const activeProp = useRef(activeId)
  activeProp.current = activeId
  const [focusId, setFocusId] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  // The row a pointer pressed: the focus that follows starts there and does not scroll.
  const pressed = useRef<string | null>(null)
  // The last id handed to `onActiveChange`: a controlled `activeId` that differs came from outside.
  const emitted = useRef<string | null>(null)
  const byId = useMemo(() => {
    const map = new Map<string, number>()
    model.forEach((m, i) => {
      if (!map.has(m.row.id)) map.set(m.row.id, i)
    })
    return map
  }, [model])
  // The cursor follows its row by id; a row that is gone falls back to the first row.
  const current = focusId !== null ? (byId.get(focusId) ?? null) : null
  const selectable = onSelect !== undefined

  // A controlled `activeId` set from outside moves the cursor too; an echo of our own hover does not.
  useIsoLayoutEffect(() => {
    if (controlled && activeId != null && byId.has(activeId) && activeId !== emitted.current) {
      setFocusId(activeId)
    }
    emitted.current = activeId ?? null
  }, [controlled, activeId, byId])

  const setActive = (next: string | null) => {
    if (next === activeRef.current) return
    activeRef.current = next
    emitted.current = next
    if (controlled) {
      queueMicrotask(() => {
        activeRef.current = activeProp.current ?? null
      })
    } else {
      setInnerActive(next)
    }
    onActiveChange?.(next, next === null ? null : (model[byId.get(next) ?? -1]?.row ?? null))
  }
  // Hover ends: the active row falls back to the keyboard cursor while focused, else to none.
  const leave = () =>
    setActive(focused && current !== null ? (model[current]?.row.id ?? null) : null)
  // With duplicate ids only the first row counts as active or selected.
  const first = (id: string, i: number) => byId.get(id) === i
  const moveTo = (i: number) => {
    const m = model[i]
    if (!m) return
    setFocusId(m.row.id)
    setActive(m.row.id)
    document.getElementById(`${baseId}-row-${i}`)?.scrollIntoView?.({ block: 'nearest' })
  }
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const last = model.length - 1
    const at = current ?? 0
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const m = model[at]
      if (m) onSelect?.(m.row.id, m.row)
      return
    }
    if (event.key === 'Escape') {
      if (activeRef.current !== null) {
        event.preventDefault()
        setActive(null)
      }
      return
    }
    const next =
      event.key === 'ArrowDown'
        ? Math.min(last, at + 1)
        : event.key === 'ArrowUp'
          ? Math.max(0, at - 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : event.key === 'PageDown'
                ? Math.min(last, at + PAGE)
                : event.key === 'PageUp'
                  ? Math.max(0, at - PAGE)
                  : null
    if (next === null) return
    event.preventDefault()
    moveTo(next)
  }

  const rootProps = {
    ref: rootRef,
    className: cx('ch-runway', className),
    'data-ch-part': 'runway',
    'data-ch-seq-tone': tone,
    'data-ch-layout': stacked ? 'stacked' : 'columns',
    style: { ...style, '--_ch-runway-label': `${labelWidth}px` } as CSSProperties,
  }

  // Stable across hover and focus changes, so the memoised strips do not redraw.
  const x = useMemo(
    () =>
      valid && d0 !== undefined && d1 !== undefined
        ? timeScale([d0, d1], [0, width], timeZone)
        : null,
    [valid, d0, d1, width, timeZone],
  )

  if (!valid || x === null || model.length === 0) {
    return (
      <div {...rootProps}>
        <div data-ch-part="empty" className="ch-empty">
          {empty ?? messages.noData ?? NO_DATA}
        </div>
      </div>
    )
  }

  const nowX = now >= d0 && now <= d1 ? x(now) : null

  const dateText = (d: Date | undefined) =>
    d ? runwayDate(d.getTime(), now, d1, formats).text : ''
  const table = withTableOptions<RowModel>(
    {
      caption: title,
      columns: [
        { header: messages.headerName ?? HEADER_NAME, value: (m) => m.row.label },
        {
          header: messages.headerRunwayDetail ?? HEADER_RUNWAY_DETAIL,
          value: (m) => m.row.sublabel ?? '',
        },
        {
          header: messages.headerRunsOut ?? HEADER_RUNS_OUT,
          value: (m) => dateText(m.facts.runsOutAt),
        },
        { header: messages.headerResets ?? HEADER_RESETS, value: (m) => dateText(m.facts.resetAt) },
        {
          header: messages.headerProjectedAtReset ?? HEADER_PROJECTED_AT_RESET,
          value: (m) =>
            Number.isFinite(m.facts.usedAtReset) ? `${Math.round(m.facts.usedAtReset * 100)}%` : '',
        },
        { header: messages.headerStatus ?? HEADER_STATUS, value: (m) => m.statusText },
      ],
    },
    dataTable,
  )

  return (
    <div {...rootProps}>
      {title ? (
        <span hidden id={titleId}>
          {title}
        </span>
      ) : null}
      {description ? (
        <span hidden id={descId}>
          {description}
        </span>
      ) : null}
      <svg aria-hidden="true" width={0} height={0} style={{ position: 'absolute' }}>
        <PatternDefs chartId={baseId} geometry={hatch} />
      </svg>
      <div className="ch-runway-head" data-ch-part="runway-head-row">
        <div ref={axisRef} className="ch-runway-axis" data-ch-part="runway-axis">
          <RunwayAxis x={x} width={width} nowX={nowX} zone={timeZone} weekday={formats.weekday} />
        </div>
      </div>
      {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-describedby is valid on list and listbox; the role is chosen at runtime */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the role is listbox when selectable, and a plain list otherwise has no handlers that matter */}
      <div
        className="ch-runway-rows"
        data-ch-part="runway-rows"
        role={selectable ? 'listbox' : 'list'}
        aria-labelledby={nameId}
        aria-describedby={description ? descId : undefined}
        tabIndex={selectable ? 0 : undefined}
        aria-activedescendant={selectable && focused ? `${baseId}-row-${current ?? 0}` : undefined}
        onKeyDown={selectable ? onKeyDown : undefined}
        onFocus={() => {
          if (!selectable) return
          setFocused(true)
          const from = pressed.current
          pressed.current = null
          if (from !== null) {
            setFocusId(from)
            setActive(from)
            return
          }
          const start = current ?? (selectedId != null ? (byId.get(selectedId) ?? 0) : 0)
          moveTo(start)
        }}
        onBlur={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return
          setFocused(false)
          setActive(null)
        }}
        onPointerLeave={(event) => {
          // A touch tap ends with pointerleave before the focus it causes: keep the pressed row.
          if (event.pointerType !== 'touch') pressed.current = null
          leave()
        }}
        onPointerUp={(event) => {
          if (event.pointerType === 'touch') leave()
        }}
        onPointerCancel={(event) => {
          pressed.current = null
          if (event.pointerType === 'touch') leave()
        }}
      >
        {model.map((m, i) => (
          // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-selected is set only when the role is option
          // biome-ignore lint/a11y/noStaticElementInteractions: the role is option when click is handled; the keyboard path is the listbox's
          // biome-ignore lint/a11y/useKeyWithClickEvents: keys are handled on the listbox via aria-activedescendant
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: duplicate row ids are allowed (and warned about), so the index disambiguates
            key={`${m.row.id}-${i}`}
            id={`${baseId}-row-${i}`}
            role={selectable ? 'option' : 'listitem'}
            aria-selected={selectable ? m.row.id === selectedId && first(m.row.id, i) : undefined}
            aria-labelledby={selectable ? `${baseId}-name-${i} ${baseId}-status-${i}` : undefined}
            className="ch-runway-row"
            data-ch-part="runway-row"
            data-ch-muted={m.row.disconnected ? 'true' : undefined}
            data-ch-selectable={selectable ? 'true' : undefined}
            data-ch-selected={m.row.id === selectedId && first(m.row.id, i) ? 'true' : undefined}
            data-ch-active={m.row.id === active && first(m.row.id, i) ? 'true' : undefined}
            data-ch-focus={selectable && focused && i === (current ?? 0) ? 'true' : undefined}
            // Hover highlights only; the keyboard cursor moves on press, before focus lands.
            onPointerEnter={() => setActive(m.row.id)}
            onPointerDown={
              selectable
                ? () => {
                    if (focused) setFocusId(m.row.id)
                    else pressed.current = m.row.id
                  }
                : undefined
            }
            onClick={
              selectable
                ? () => {
                    pressed.current = null
                    setFocusId(m.row.id)
                    onSelect?.(m.row.id, m.row)
                  }
                : undefined
            }
          >
            <div className="ch-runway-label" data-ch-part="runway-label">
              {m.row.icon ? (
                <span aria-hidden="true" className="ch-runway-icon" data-ch-part="runway-icon">
                  {m.row.icon}
                </span>
              ) : null}
              <span
                id={`${baseId}-name-${i}`}
                className="ch-runway-name"
                data-ch-part="runway-name"
                title={m.row.label}
              >
                {m.row.label}
              </span>
            </div>
            <RunwayStrip
              model={m}
              x={x}
              width={width}
              nowX={nowX}
              hatchFill={`url(#${patternId(baseId, 'loss')})`}
            />
            <div
              id={`${baseId}-status-${i}`}
              className="ch-runway-status"
              data-ch-part="runway-status"
            >
              {m.status}
            </div>
          </div>
        ))}
      </div>
      {legend ? <RunwayLegend edges={edges} levels={levels} /> : null}
      {dataTable && table ? (
        <DataTable data={model} columns={table.columns} caption={table.caption} />
      ) : null}
    </div>
  )
}

type Scale = ReturnType<typeof timeScale>

// Pure: lets bundlers drop it with the rest of RunwayChart when only other charts are imported.
const RunwayStrip = /* @__PURE__ */ memo(function RunwayStrip({
  model,
  x,
  width,
  nowX,
  hatchFill,
}: {
  model: RowModel
  x: Scale
  width: number
  nowX: number | null
  hatchFill: string
}) {
  const resetMark = useMessages().resetMark ?? RESET_MARK
  const [d0, d1] = x.domain()
  const first = model.cells[0]
  const cellWidth = first ? x(first.end) - x(first.start) : 0
  const gap = cellWidth < 6 ? 1 : 2
  const { runsOutAt, resetAt } = model.facts
  const out = runsOutAt?.getTime()
  const reset = resetAt?.getTime()
  const inside = (t: number | undefined): t is number => t !== undefined && t >= d0 && t < d1
  const resetX = inside(reset) ? x(reset) : null
  // "reset" in 12px text is about 33px wide; it only goes right of the tick (plan ruling 2). A
  // translation is measured the same way.
  const labelFits =
    resetX !== null && resetX + 6 + estimateWidth({ label: resetMark } as Tick) <= width
  return (
    <svg
      aria-hidden="true"
      className="ch-runway-strip ch-svg"
      data-ch-part="runway-strip"
      width={width}
      height={STRIP_HEIGHT}
    >
      {model.cells.map((c) => {
        const x0 = x(c.start) + gap / 2
        const w = Math.max(0, x(c.end) - x(c.start) - gap)
        return (
          <rect
            key={c.start}
            data-ch-part="runway-cell"
            data-ch-state={c.state}
            data-ch-level={c.state === 'level' ? c.level : undefined}
            x={x0}
            y={0}
            width={w}
            height={STRIP_HEIGHT}
            rx={2}
            style={c.state === 'locked' ? { fill: hatchFill } : undefined}
          />
        )
      })}
      {nowX !== null ? (
        <line data-ch-part="runway-now" x1={nowX} x2={nowX} y1={0} y2={STRIP_HEIGHT} />
      ) : null}
      {resetX !== null ? (
        <rect data-ch-part="runway-reset" x={resetX - 1} y={0} width={2} height={STRIP_HEIGHT} />
      ) : null}
      {inside(out) ? (
        <circle data-ch-part="runway-dot" cx={x(out)} cy={STRIP_HEIGHT / 2} r={5} />
      ) : null}
      {labelFits && resetX !== null ? (
        <text
          data-ch-part="runway-reset-label"
          x={resetX + 6}
          y={STRIP_HEIGHT / 2}
          dominantBaseline="central"
        >
          {resetMark}
        </text>
      ) : null}
    </svg>
  )
})

function RunwayAxis({
  x,
  width,
  nowX,
  zone,
  weekday,
}: {
  x: Scale
  width: number
  nowX: number | null
  zone: TimeZone
  weekday: (ms: number) => string
}) {
  const now = useMessages().now ?? NOW
  const [d0, d1] = x.domain()
  const days = (zone === 'utc' ? unixDay : timeDay).range(new Date(d0 - DAY), new Date(d1))
  const ticks: Tick[] = []
  for (const day of days) {
    const a = Math.max(d0, +day)
    const b = Math.min(d1, +day + DAY)
    // A sliver of a day at either end gets no label.
    if (b - a < DAY / 2) continue
    ticks.push({ value: a, position: x((a + b) / 2), label: weekday(+day), anchor: 'middle' })
  }
  const shown = thinTicks(ticks)
  const nowAnchor =
    nowX === null ? 'middle' : nowX < 16 ? 'start' : nowX > width - 16 ? 'end' : 'middle'
  return (
    <svg aria-hidden="true" className="ch-svg" width={width} height={AXIS_HEIGHT}>
      {nowX !== null ? (
        <>
          <text
            data-ch-part="runway-now-label"
            x={nowX}
            y={10}
            textAnchor={nowAnchor}
            dominantBaseline="central"
          >
            {now}
          </text>
          <line data-ch-part="runway-now" x1={nowX} x2={nowX} y1={18} y2={AXIS_HEIGHT} />
        </>
      ) : null}
      {shown.map((t) => (
        <text
          key={t.value}
          data-ch-part="axis-label"
          x={t.position}
          y={30}
          textAnchor={t.anchor}
          dominantBaseline="central"
        >
          {t.label}
        </text>
      ))}
    </svg>
  )
}

function RunwayLegend({ edges, levels }: { edges: readonly number[]; levels: readonly number[] }) {
  const messages = useMessages()
  const shares = [...edges, 1].map((b) => Math.round(b * 100)).join(', ')
  const swatch = (attrs: Record<string, string | undefined>, color?: string) => (
    <span
      aria-hidden="true"
      className="ch-swatch ch-fillable"
      data-ch-part="legend-swatch"
      {...attrs}
      style={color ? ({ '--_ch-swatch-color': color } as CSSProperties) : undefined}
    />
  )
  return (
    <ul className="ch-legend ch-runway-legend" data-ch-part="legend">
      <li className="ch-legend-item" data-ch-part="legend-item">
        <span className="ch-legend-label" data-ch-part="legend-label">
          {messages.legendProjectedUse ?? LEGEND_PROJECTED_USE}
        </span>
        {levels.map((level) => (
          <span key={level}>
            {swatch(
              { 'data-ch-level': String(level), 'data-ch-shape': 'bar' },
              `var(--ch-seq-${level})`,
            )}
          </span>
        ))}
        <span className="ch-legend-label" data-ch-part="legend-label">
          {formatMessage(messages.legendUnderShare ?? LEGEND_UNDER_SHARE, { shares })}
        </span>
      </li>
      <li className="ch-legend-item" data-ch-part="legend-item">
        {swatch({ 'data-ch-tone': 'loss', 'data-ch-shape': 'runs-out' }, 'var(--ch-loss)')}
        <span className="ch-legend-label" data-ch-part="legend-label">
          {messages.legendRunsOut ?? LEGEND_RUNS_OUT}
        </span>
      </li>
      <li className="ch-legend-item" data-ch-part="legend-item">
        {swatch(
          { 'data-ch-tone': 'loss', 'data-ch-fill': 'hatch', 'data-ch-shape': 'bar' },
          'var(--ch-loss)',
        )}
        <span className="ch-legend-label" data-ch-part="legend-label">
          {messages.legendLocked ?? LEGEND_LOCKED}
        </span>
      </li>
      <li className="ch-legend-item" data-ch-part="legend-item">
        {swatch({ 'data-ch-shape': 'tick' })}
        <span className="ch-legend-label" data-ch-part="legend-label">
          {messages.legendReset ?? LEGEND_RESET}
        </span>
      </li>
      <li className="ch-legend-item" data-ch-part="legend-item">
        {swatch({ 'data-ch-shape': 'empty' })}
        <span className="ch-legend-label" data-ch-part="legend-label">
          {messages.legendNoForecast ?? LEGEND_NO_FORECAST}
        </span>
      </li>
    </ul>
  )
}
