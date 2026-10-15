// biome-ignore-all lint/a11y/useSemanticElements: an ARIA grid laid out with CSS grid; table elements lose their semantics under display: grid
// biome-ignore-all lint/a11y/useFocusableInteractive: one roving tab stop on the data cells (APG grid pattern); rows and headers are not focusable
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { resolveAccessor } from '../../core/accessor'
import type { FormatSpec, Formatter } from '../../core/format'
import { toNumber } from '../../core/number'
import { binLevels, levelFor, MAX_BREAKS, sequentialBreaks } from '../../core/thresholds'
import type { Accessor, SeqLevel, Tone } from '../../core/types'
import { createWarner, DEV, type Warn } from '../../core/warn'
import { useFormat } from '../ChartsProvider'
import { Legend } from '../ui/Legend'
import { cx } from '../ui/util'

export interface HeatmapCell<D> {
  /** `"<row>:<column>"`. */
  id: string
  row: string
  column: string
  /** NaN when the cell has no number. */
  value: number
  /** The item behind the cell; undefined for an empty cell. */
  datum: D | undefined
  /** Sequential level 1–5, or 0 for a cell without a number. */
  level: SeqLevel | 0
}

export interface HeatmapProps<D> {
  /** One item per cell, in long format. */
  data: readonly D[]
  /** Row name per item, e.g. the branch. */
  row: Accessor<D, string>
  /** Column name per item, e.g. the cause. */
  column: Accessor<D, string>
  value: Accessor<D, number>
  /** Row order. Default: order of first appearance. Rows without items show dashes. */
  rows?: readonly string[]
  /** Column order. Default: order of first appearance. */
  columns?: readonly string[]
  /** Ascending bin edges: values below `breaks[0]` are the first bin. 1–4 edges give 2–5 bins. */
  breaks: readonly number[]
  /** One label per bin. Default "Under X", "X to Y", …, "Z and up". */
  binLabels?: readonly string[]
  /** Default 'number'. */
  format?: FormatSpec
  /** Column totals under the headers and a row total column. Default true. */
  totals?: boolean
  /** Header of the row total column. Default "Total". */
  totalLabel?: string
  /** Legend of the bins under the grid. Default true. */
  legend?: boolean
  /**
   * Base tone of the sequential levels and the legend. Default: a `--ch-seq-base` set on an
   * ancestor, else loss. Every tone keeps cell text at 4.5:1 or more in both themes.
   */
  tone?: Tone
  /** Accessible name of the grid. */
  title?: string
  /** Accessible description, usually the takeaway sentence. */
  description?: string
  activeId?: string | null
  onActiveChange?: (id: string | null, cell: HeatmapCell<D> | null) => void
  onSelect?: (id: string, cell: HeatmapCell<D>) => void
  /** Rendered instead of the grid when there are no rows or columns. Default "No data". */
  empty?: ReactNode
  className?: string
  style?: CSSProperties
  /**
   * Prefix for the title and description ids. React's `useId` is only unique within one root, so
   * set this when heatmaps render in several React roots on one page.
   */
  chartId?: string
}

interface HeatmapModel<D> {
  rows: string[]
  columns: string[]
  cells: HeatmapCell<D>[][]
  rowTotals: number[]
  columnTotals: number[]
}

const MOVES = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'])

/** The breaks Heatmap bins by (see `heatmapLevel`), warning about what it had to clean up. */
function cleanBreaks(breaks: readonly number[], warn: Warn): number[] {
  const edges = sequentialBreaks(breaks)
  if (DEV) {
    const sorted = [...new Set(breaks.filter(Number.isFinite))].sort((a, b) => a - b)
    if (sorted.length !== breaks.length || sorted.some((b, i) => b !== breaks[i])) {
      warn(
        'heatmap-breaks',
        'Heatmap `breaks` must be finite and ascending; they were sorted and deduplicated.',
      )
    }
    if (sorted.length > MAX_BREAKS) {
      warn('heatmap-bins', 'Heatmap shows at most 5 bins; breaks after the fourth were dropped.')
    }
  }
  return edges
}

function defaultLabels(breaks: readonly number[], fmt: Formatter): string[] {
  const first = breaks[0]
  const last = breaks[breaks.length - 1]
  if (first === undefined || last === undefined) return ['All values']
  return [
    `Under ${fmt(first)}`,
    ...breaks.slice(1).map((b, i) => `${fmt(breaks[i] as number)} to ${fmt(b)}`),
    `${fmt(last)} and up`,
  ]
}

function sum(values: readonly number[]): number {
  const finite = values.filter(Number.isFinite)
  return finite.length === 0 ? Number.NaN : finite.reduce((a, b) => a + b, 0)
}

function NoData() {
  return (
    <>
      <span aria-hidden="true">–</span>
      <span className="ch-sr-only">No data</span>
    </>
  )
}

export function Heatmap<D>({
  data,
  row,
  column,
  value,
  rows: rowOrder,
  columns: columnOrder,
  breaks,
  binLabels,
  format,
  totals = true,
  totalLabel = 'Total',
  legend = true,
  tone,
  title,
  description,
  activeId,
  onActiveChange,
  onSelect,
  empty,
  className,
  style,
  chartId,
}: HeatmapProps<D>) {
  const { create } = useFormat()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])
  const reactId = useId()
  const baseId = `ch-${(chartId ?? reactId).replace(/[^a-zA-Z0-9_-]/g, '')}`
  const titleId = `${baseId}-title`
  const descId = `${baseId}-desc`
  if (DEV && !title) {
    warn('heatmap-title', 'Heatmap has no `title`, so screen readers announce an unnamed grid.')
  }

  const edges = useMemo(() => cleanBreaks(breaks, warn), [breaks, warn])
  const levels = useMemo(() => binLevels(edges.length + 1), [edges])
  const labels = useMemo(() => {
    if (binLabels && binLabels.length === edges.length + 1) return [...binLabels]
    if (DEV && binLabels) {
      warn('heatmap-labels', 'Heatmap `binLabels` needs one label per bin; using the defaults.')
    }
    return defaultLabels(edges, fmt)
  }, [binLabels, edges, fmt, warn])

  const model = useMemo((): HeatmapModel<D> => {
    const getRow = resolveAccessor(row)
    const getColumn = resolveAccessor(column)
    const getValue = resolveAccessor(value)
    const found = new Map<string, { value: number; datum: D }>()
    const seenRows = new Set<string>()
    const seenColumns = new Set<string>()
    data.forEach((d, i) => {
      const r = getRow(d, i)
      const c = getColumn(d, i)
      if (r === null || r === undefined || c === null || c === undefined) {
        if (DEV)
          warn('heatmap-key', `Heatmap skipped an item without a row or column at index ${i}.`)
        return
      }
      const key = `${r}:${c}`
      if (found.has(key)) {
        if (DEV) warn('heatmap-repeat', `Heatmap skipped a repeated cell "${key}" at index ${i}.`)
        return
      }
      const v = toNumber(getValue(d, i))
      if (DEV && !Number.isFinite(v)) {
        warn(
          'heatmap-value',
          `Heatmap shows a dash for a missing or non-numeric value at index ${i}.`,
        )
      }
      found.set(key, { value: v, datum: d })
      seenRows.add(String(r))
      seenColumns.add(String(c))
    })
    const rows = rowOrder ? rowOrder.map(String) : [...seenRows]
    const columns = columnOrder ? columnOrder.map(String) : [...seenColumns]
    const cells = rows.map((r) =>
      columns.map((c): HeatmapCell<D> => {
        const id = `${r}:${c}`
        const hit = found.get(id)
        const v = hit?.value ?? Number.NaN
        return {
          id,
          row: r,
          column: c,
          value: v,
          datum: hit?.datum,
          level: levelFor(v, edges, levels),
        }
      }),
    )
    return {
      rows,
      columns,
      cells,
      rowTotals: cells.map((rowCells) => sum(rowCells.map((cell) => cell.value))),
      columnTotals: columns.map((_, j) =>
        sum(cells.map((rowCells) => rowCells[j]?.value ?? Number.NaN)),
      ),
    }
  }, [data, row, column, value, rowOrder, columnOrder, edges, levels, warn])

  const byId = useMemo(() => new Map(model.cells.flat().map((c) => [c.id, c])), [model])
  const [innerActive, setInnerActive] = useState<string | null>(null)
  const controlled = activeId !== undefined
  const active = controlled ? activeId : innerActive
  // Kept in step with renders; a second call in the same event must see the first one's id.
  const activeRef = useRef(active)
  activeRef.current = active
  const activeProp = useRef(activeId)
  activeProp.current = activeId
  const [focusId, setFocusId] = useState<string | null>(null)
  const refs = useRef(new Map<string, HTMLElement>())
  const tabId = focusId !== null && byId.has(focusId) ? focusId : (model.cells[0]?.[0]?.id ?? null)

  const setActive = (next: string | null) => {
    if (next === activeRef.current) return
    activeRef.current = next
    if (controlled) {
      // The parent decides. Drop the optimistic value once the event is over, so a parent that
      // ignores the change doesn't leave the ref stale.
      queueMicrotask(() => {
        activeRef.current = activeProp.current ?? null
      })
    } else {
      setInnerActive(next)
    }
    onActiveChange?.(next, next === null ? null : (byId.get(next) ?? null))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, r: number, c: number) => {
    const cell = model.cells[r]?.[c]
    if (!cell) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect?.(cell.id, cell)
      return
    }
    if (event.key === 'Escape') {
      // Only handled when it clears something, so an enclosing dialog can still close.
      if (activeRef.current !== null) {
        event.preventDefault()
        setActive(null)
      }
      return
    }
    if (!MOVES.has(event.key)) return
    event.preventDefault()
    const lastRow = model.rows.length - 1
    const lastColumn = model.columns.length - 1
    let [nr, nc] = [r, c]
    if (event.key === 'ArrowUp') nr = Math.max(0, r - 1)
    else if (event.key === 'ArrowDown') nr = Math.min(lastRow, r + 1)
    else if (event.key === 'ArrowLeft') nc = Math.max(0, c - 1)
    else if (event.key === 'ArrowRight') nc = Math.min(lastColumn, c + 1)
    else if (event.key === 'Home') nc = 0
    else nc = lastColumn
    const next = model.cells[nr]?.[nc]
    if (!next) return
    setFocusId(next.id)
    refs.current.get(next.id)?.focus()
  }

  const valueText = (v: number | undefined): ReactNode =>
    v !== undefined && Number.isFinite(v) ? fmt(v) : <NoData />
  // Only an explicit tone overrides a --ch-seq-base set on an ancestor; data-ch-seq-tone picks
  // that tone's level mixes in theme.css, and the legend inside inherits them.
  const rootStyle = (tone ? { '--ch-seq-base': `var(--ch-${tone})`, ...style } : style) as
    | CSSProperties
    | undefined
  const rootProps = {
    className: cx('ch-heatmap', className),
    'data-ch-part': 'heatmap',
    'data-ch-seq-tone': tone,
    style: rootStyle,
  }

  if (model.rows.length === 0 || model.columns.length === 0) {
    return (
      <div {...rootProps}>
        <div data-ch-part="empty" className="ch-empty">
          {empty ?? 'No data'}
        </div>
      </div>
    )
  }

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
      <div
        role="grid"
        className="ch-heatmap-grid"
        data-ch-part="heatmap-grid"
        data-ch-totals={totals ? 'true' : undefined}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        style={{ '--_ch-heatmap-columns': model.columns.length } as CSSProperties}
        onPointerLeave={(event) => {
          // Keyboard focus keeps its cell active; the pointer only clears what it activated.
          const focused = event.currentTarget.contains(document.activeElement)
          setActive(focused && focusId !== null && byId.has(focusId) ? focusId : null)
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setActive(null)
        }}
      >
        <div role="row" className="ch-heatmap-row" data-ch-part="heatmap-row">
          <div role="columnheader" className="ch-heatmap-corner" data-ch-part="heatmap-corner" />
          {model.columns.map((name, j) => (
            <div
              key={name}
              role="columnheader"
              className="ch-heatmap-header"
              data-ch-part="heatmap-header"
            >
              <span>{name}</span>
              {totals ? (
                <span className="ch-heatmap-header-total" data-ch-part="heatmap-header-total">
                  {valueText(model.columnTotals[j])}
                </span>
              ) : null}
            </div>
          ))}
          {totals ? (
            <div
              role="columnheader"
              className="ch-heatmap-header ch-heatmap-total-header"
              data-ch-part="heatmap-total-header"
            >
              {totalLabel}
            </div>
          ) : null}
        </div>
        {model.cells.map((rowCells, r) => (
          <div key={model.rows[r]} role="row" className="ch-heatmap-row" data-ch-part="heatmap-row">
            <div role="rowheader" className="ch-heatmap-rowheader" data-ch-part="heatmap-rowheader">
              {model.rows[r]}
            </div>
            {rowCells.map((cell, c) => (
              <div
                key={cell.id}
                ref={(el) => {
                  if (el) refs.current.set(cell.id, el)
                  else refs.current.delete(cell.id)
                }}
                role="gridcell"
                tabIndex={cell.id === tabId ? 0 : -1}
                className="ch-heatmap-cell"
                data-ch-part="heatmap-cell"
                data-ch-level={cell.level}
                data-ch-active={cell.id === active ? 'true' : undefined}
                data-ch-selectable={onSelect ? 'true' : undefined}
                onFocus={() => {
                  setFocusId(cell.id)
                  setActive(cell.id)
                }}
                onPointerEnter={() => setActive(cell.id)}
                onClick={() => onSelect?.(cell.id, cell)}
                onKeyDown={(event) => onKeyDown(event, r, c)}
              >
                {valueText(cell.value)}
              </div>
            ))}
            {totals ? (
              <div role="gridcell" className="ch-heatmap-total" data-ch-part="heatmap-total">
                {valueText(model.rowTotals[r])}
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {legend ? (
        <Legend
          className="ch-heatmap-legend"
          items={labels.map((label, i) => ({ label, level: levels[i] }))}
        />
      ) : null}
    </div>
  )
}
