// biome-ignore-all lint/a11y/useSemanticElements: rows are ARIA options laid out with CSS grid; <select> can't hold them

import { timeDay, unixDay } from 'd3-time'
import {
  type CSSProperties,
  Fragment,
  type KeyboardEvent,
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
import { useFormat } from '../ChartsProvider'
import { DataTable } from '../DataTable'
import { PatternDefs } from '../PatternDefs'
import { cx } from '../ui/util'
import { useIsoLayoutEffect } from '../useIsoLayoutEffect'
import { useWidth } from '../useWidth'
import { type DataTableOptions, withTableOptions } from './shared'

export type { RunwayFacts } from '../../core/runway'

export interface RunwayRow {
  id: string
  label: string
  icon?: ReactNode
  /** Extra description, e.g. "Side project". Not drawn in the strip; shown in the data table. */
  sublabel?: string
  /** Projected cumulative use, 0–1, linear between points. Absent or empty: no forecast. */
  projection?: readonly { at: TimeInput; used: number }[]
  runsOutAt?: TimeInput
  resetAt?: TimeInput
  /** A muted row with every cell empty. */
  disconnected?: boolean
  /** Replaces the default status text. */
  status?: ReactNode
}

export interface RunwayChartProps {
  rows: readonly RunwayRow[]
  /** Time span of the strips. */
  domain: readonly [TimeInput, TimeInput]
  now: TimeInput
  /** Cell length: '30m', '6h', '1d' or ms. Default '6h'. */
  cell?: string | number
  /** Ascending level edges as shares. Default [0.25, 0.5, 0.75]: four levels. 1–4 edges. */
  breaks?: readonly number[]
  /** Sequential tone of the levels and the legend. Default 'neutral'. */
  tone?: Tone
  /** 'auto' stacks the rows when the strip would be under 240 px. Default 'auto'. */
  layout?: 'auto' | 'columns' | 'stacked'
  /** Width before the first measurement and on the server. Default 640. */
  initialWidth?: number
  /** Label column width in px in the columns layout. Default 200. */
  labelWidth?: number
  /** With `onSelect`, the rows are a listbox. */
  selectedId?: string | null
  onSelect?: (id: string, row: RunwayRow) => void
  activeId?: string | null
  onActiveChange?: (id: string | null, row: RunwayRow | null) => void
  /** Custom status per row; return undefined to keep the default. A row's own `status` wins. */
  status?: (row: RunwayRow, facts: RunwayFacts) => ReactNode
  /** Default true. */
  legend?: boolean
  title?: string
  description?: string
  dataTable?: boolean | DataTableOptions
  empty?: ReactNode
  className?: string
  style?: CSSProperties
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

export function RunwayChart({
  rows,
  domain: domainProp,
  now: nowProp,
  cell,
  breaks = DEFAULT_BREAKS,
  tone = 'neutral',
  layout = 'auto',
  initialWidth = 640,
  labelWidth = 200,
  selectedId,
  onSelect,
  activeId,
  onActiveChange,
  status,
  legend = true,
  title,
  description,
  dataTable,
  empty,
  className,
  style,
  chartId,
  timeZone = 'utc',
}: RunwayChartProps) {
  const warn = useMemo(() => createWarner(), [])
  const { date } = useFormat()
  const reactId = useId()
  const baseId = `ch-${(chartId ?? reactId).replace(/[^a-zA-Z0-9_-]/g, '')}`
  const titleId = `${baseId}-title`
  const descId = `${baseId}-desc`
  if (DEV && !title) {
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

  const model = useMemo((): RowModel[] => {
    if (!valid) return []
    const { bounds, cut } = cellBounds([d0, d1], cellMs)
    if (DEV && cut)
      warn('runway-cells', 'RunwayChart shows at most 200 cells; use a longer `cell`.')
    const seen = new Set<string>()
    return rows.map((row) => {
      if (DEV && seen.has(row.id)) {
        warn(
          'runway-id',
          `RunwayChart has a duplicate row id "${row.id}"; the first one is selected.`,
        )
      }
      seen.add(row.id)
      const times = normalizeRow(row, warn)
      const facts = runwayFacts(times, d1)
      const lines = statusLines(facts, !!row.disconnected, now, d1, formats)
      const custom = row.status ?? status?.(row, facts)
      return {
        row,
        cells: runwayCells(times, bounds, edges, levels),
        facts,
        status:
          custom ??
          // A space between the lines keeps them apart in the accessible name and textContent;
          // grid layout drops the whitespace.
          lines.map((line, j) => (
            <Fragment key={line}>
              {j > 0 ? ' ' : null}
              <span className="ch-runway-status-line" data-ch-part="runway-status-line">
                {line}
              </span>
            </Fragment>
          )),
        statusText: typeof row.status === 'string' ? row.status : lines.join(', '),
      }
    })
  }, [valid, d0, d1, now, cellMs, rows, edges, levels, formats, status, warn])

  const [innerActive, setInnerActive] = useState<string | null>(null)
  const controlled = activeId !== undefined
  const active = controlled ? activeId : innerActive
  const activeRef = useRef(active)
  activeRef.current = active
  const activeProp = useRef(activeId)
  activeProp.current = activeId
  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const [focused, setFocused] = useState(false)
  const byId = useMemo(() => {
    const map = new Map<string, number>()
    model.forEach((m, i) => {
      if (!map.has(m.row.id)) map.set(m.row.id, i)
    })
    return map
  }, [model])
  // A focus index past the end (rows removed) falls back to the first row.
  const current = focusIndex !== null && focusIndex < model.length ? focusIndex : null
  const selectable = onSelect !== undefined

  const setActive = (next: string | null) => {
    if (next === activeRef.current) return
    activeRef.current = next
    if (controlled) {
      queueMicrotask(() => {
        activeRef.current = activeProp.current ?? null
      })
    } else {
      setInnerActive(next)
    }
    onActiveChange?.(next, next === null ? null : (model[byId.get(next) ?? -1]?.row ?? null))
  }
  const moveTo = (i: number) => {
    const m = model[i]
    if (!m) return
    setFocusIndex(i)
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

  if (!valid || model.length === 0) {
    return (
      <div {...rootProps}>
        <div data-ch-part="empty" className="ch-empty">
          {empty ?? 'No data'}
        </div>
      </div>
    )
  }

  const x = timeScale([d0, d1], [0, width], timeZone)
  const nowX = now >= d0 && now <= d1 ? x(now) : null

  const dateText = (d: Date | undefined) =>
    d ? runwayDate(d.getTime(), now, d1, formats).text : ''
  const table = withTableOptions<RowModel>(
    {
      caption: title,
      columns: [
        { header: 'Name', value: (m) => m.row.label },
        { header: 'Detail', value: (m) => m.row.sublabel ?? '' },
        { header: 'Runs out', value: (m) => dateText(m.facts.runsOutAt) },
        { header: 'Resets', value: (m) => dateText(m.facts.resetAt) },
        {
          header: 'Projected at reset',
          value: (m) =>
            Number.isFinite(m.facts.usedAtReset) ? `${Math.round(m.facts.usedAtReset * 100)}%` : '',
        },
        { header: 'Status', value: (m) => m.statusText },
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
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={selectable ? 0 : undefined}
        aria-activedescendant={selectable && focused ? `${baseId}-row-${current ?? 0}` : undefined}
        onKeyDown={selectable ? onKeyDown : undefined}
        onFocus={() => {
          if (!selectable) return
          setFocused(true)
          const start = current ?? (selectedId != null ? (byId.get(selectedId) ?? 0) : 0)
          moveTo(start)
        }}
        onBlur={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return
          setFocused(false)
          setActive(null)
        }}
        onPointerLeave={() =>
          setActive(focused && current !== null ? (model[current]?.row.id ?? null) : null)
        }
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
            aria-selected={selectable ? m.row.id === selectedId : undefined}
            aria-labelledby={selectable ? `${baseId}-name-${i} ${baseId}-status-${i}` : undefined}
            className="ch-runway-row"
            data-ch-part="runway-row"
            data-ch-muted={m.row.disconnected ? 'true' : undefined}
            data-ch-selectable={selectable ? 'true' : undefined}
            data-ch-active={m.row.id === active ? 'true' : undefined}
            data-ch-focus={selectable && focused && i === (current ?? 0) ? 'true' : undefined}
            onPointerEnter={() => {
              if (selectable) setFocusIndex(i)
              setActive(m.row.id)
            }}
            onClick={
              selectable
                ? () => {
                    setFocusIndex(i)
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

function RunwayStrip({
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
  const [d0, d1] = x.domain()
  const first = model.cells[0]
  const cellWidth = first ? x(first.end) - x(first.start) : 0
  const gap = cellWidth < 6 ? 1 : 2
  const { runsOutAt, resetAt } = model.facts
  const out = runsOutAt?.getTime()
  const reset = resetAt?.getTime()
  const inside = (t: number | undefined): t is number => t !== undefined && t >= d0 && t < d1
  const resetX = inside(reset) ? x(reset) : null
  // "reset" in 12px text is about 33px wide; it only goes right of the tick (plan ruling 2).
  const labelFits =
    resetX !== null && resetX + 6 + estimateWidth({ label: 'reset' } as Tick) <= width
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
          reset
        </text>
      ) : null}
    </svg>
  )
}

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
            Now
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
          Projected use
        </span>
        {levels.map((level) => (
          <span key={level}>
            {swatch(
              { 'data-ch-level': String(level), 'data-ch-shape': 'bar' },
              `var(--ch-seq-${level})`,
            )}
          </span>
        ))}
        <span className="ch-legend-label" data-ch-part="legend-label">{`under ${shares}%`}</span>
      </li>
      <li className="ch-legend-item" data-ch-part="legend-item">
        {swatch({ 'data-ch-tone': 'loss', 'data-ch-shape': 'runs-out' }, 'var(--ch-loss)')}
        <span className="ch-legend-label" data-ch-part="legend-label">
          Runs out
        </span>
      </li>
      <li className="ch-legend-item" data-ch-part="legend-item">
        {swatch(
          { 'data-ch-tone': 'loss', 'data-ch-fill': 'hatch', 'data-ch-shape': 'bar' },
          'var(--ch-loss)',
        )}
        <span className="ch-legend-label" data-ch-part="legend-label">
          Locked until reset
        </span>
      </li>
      <li className="ch-legend-item" data-ch-part="legend-item">
        {swatch({ 'data-ch-shape': 'tick' })}
        <span className="ch-legend-label" data-ch-part="legend-label">
          Reset
        </span>
      </li>
      <li className="ch-legend-item" data-ch-part="legend-item">
        {swatch({ 'data-ch-shape': 'empty' })}
        <span className="ch-legend-label" data-ch-part="legend-label">
          New window, no forecast
        </span>
      </li>
    </ul>
  )
}
