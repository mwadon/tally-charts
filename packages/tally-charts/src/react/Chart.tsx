import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createScale, type ScaleSpec } from '../core/scale'
import type { Id } from '../core/types'
import { createWarner, DEV, type Warn } from '../core/warn'
import { DEFAULT_HATCH, DEFAULT_RADIUS, readHatchGeometry, readRadius } from '../theme/patterns'
import { useFormat } from './ChartsProvider'
import { ChartContext, type InternalChartContext, type Margin } from './context'
import { DataTable, type DataTableSpec } from './DataTable'
import { announcement, type InteractionOptions, navigate, useInteraction } from './interaction'
import { PatternDefs } from './PatternDefs'
import type { ChartPoint } from './types'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'
import { useWidth } from './useWidth'

/**
 * The accessible name every chart needs: a `title` or an `aria-labelledby` that points at an
 * element which already names the chart (a visible heading, say). Give at least one; with both,
 * `aria-labelledby` names the chart and `title` stays the default caption of the data table.
 */
export type ChartName =
  | {
      /** Accessible name of the chart; also the default caption of the data table. */
      title: string
      /** Id of an element that names the chart; it wins over `title` for the name. */
      'aria-labelledby'?: string
    }
  | {
      title?: undefined
      /** Id of an element that names the chart; it wins over `title` for the name. */
      'aria-labelledby': string
    }

export type ChartProps<D> = ChartName & {
  data?: readonly D[]
  x?: ScaleSpec<D>
  y?: ScaleSpec<D>
  /** Fixed width in px; turns off container measuring. */
  width?: number
  /** Width used for server rendering and the first client render. Default 640. */
  initialWidth?: number
  /** Height in px. Default 240 unless `aspectRatio` is set. */
  height?: number
  /** width / height. Used when `height` is not set. */
  aspectRatio?: number
  margin?: Partial<Margin>
  /** Accessible description, usually the takeaway sentence. */
  description?: string
  /** Visually hidden table of the data for screen readers. High-level charts set it by default. */
  dataTable?: DataTableSpec<D>
  /**
   * Instructions read with the chart when it takes keyboard focus. Default: "Use arrow keys to
   * move between points, Home and End for first and last, Escape to clear.", plus " Press Enter
   * to select." with `onSelect`. Set it to translate the text; `""` turns it off.
   */
  keyboardHint?: string
  activeId?: Id | null
  /** Called with the new active id, and its point; `point.datum` is the row from `data`. */
  onActiveChange?: (id: Id | null, point: ChartPoint<D> | null) => void
  /** Called on click, Enter or Space; `point.datum` is the row from `data`. */
  onSelect?: (id: Id, point: ChartPoint<D>) => void
  animate?: boolean
  dimInactive?: boolean
  /** Rendered instead of the plot when `data` is an empty array. Default "No data". */
  empty?: ReactNode
  className?: string
  style?: CSSProperties
  /**
   * Prefix for pattern and mask ids. React's `useId` is only unique within one root, so set this
   * when charts render in several React roots on one page.
   */
  chartId?: string
  children?: ReactNode
}

/** Internal: the margins and height a chart picks once it knows its width. */
export interface ChartFit {
  margin: Margin
  height: number
}

const DEFAULT_MARGIN: Margin = { top: 20, right: 0, bottom: 28, left: 0 }
const DEFAULT_HEIGHT = 240
const EMPTY: readonly never[] = []
const silent: Warn = () => {}

export function Chart<D>({
  data,
  x,
  y,
  width,
  initialWidth = 640,
  height,
  aspectRatio,
  margin: marginProp,
  title,
  'aria-labelledby': labelledBy,
  description,
  dataTable,
  keyboardHint,
  activeId,
  onActiveChange,
  onSelect,
  animate = true,
  dimInactive = true,
  empty,
  className,
  style,
  chartId: chartIdProp,
  children,
  ...internal
}: ChartProps<D>) {
  // Internal: ComparisonBars passes `layoutFor` (through FittedChart) to lay out by its width.
  const { layoutFor } = internal as { layoutFor?: (width: number) => ChartFit }
  const rootRef = useRef<HTMLElement>(null)
  // Set by a pointer press on the plot, so the focus that follows a click doesn't act like Tab.
  const pressed = useRef(false)
  const reactId = useId()
  const chartId = `ch-${(chartIdProp ?? reactId).replace(/[^a-zA-Z0-9_-]/g, '')}`
  const measured = useWidth(rootRef, initialWidth, width === undefined)
  const w = Math.max(0, width ?? measured)
  const fitted = layoutFor?.(w)
  const h = Math.max(
    0,
    fitted?.height ?? height ?? (aspectRatio ? Math.round(w / aspectRatio) : DEFAULT_HEIGHT),
  )
  const margin: Margin = fitted?.margin ?? { ...DEFAULT_MARGIN, ...marginProp }
  const innerWidth = Math.max(0, w - margin.left - margin.right)
  const innerHeight = Math.max(0, h - margin.top - margin.bottom)
  const rows: readonly D[] = data ?? EMPTY
  const isEmpty = data !== undefined && data.length === 0

  const warn = useMemo(() => createWarner(), [])
  const scaleWarn = isEmpty ? silent : warn
  if (DEV && !title && !labelledBy) {
    warn('chart-title', 'Chart has no `title`, so screen readers announce an unnamed figure.')
  }
  const xScale = useMemo(
    () => createScale(x, rows, 'x', innerWidth, scaleWarn),
    [x, rows, innerWidth, scaleWarn],
  )
  const yScale = useMemo(
    () => createScale(y, rows, 'y', innerHeight, scaleWarn),
    [y, rows, innerHeight, scaleWarn],
  )

  const formatters = useFormat()
  // Marks register `datum` as a row of `data`, so the points the store hands back are ChartPoint<D>.
  const interaction = useInteraction({
    activeId,
    onActiveChange: onActiveChange as InteractionOptions['onActiveChange'],
  })
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null)
  const [hatch, setHatch] = useState(DEFAULT_HATCH)
  const [radius, setRadius] = useState(DEFAULT_RADIUS)

  useIsoLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const computed = getComputedStyle(el)
    const next = readHatchGeometry(computed)
    setHatch((prev) => (prev.angle === next.angle && prev.gap === next.gap ? prev : next))
    setRadius(readRadius(computed))
  }, [])

  const effectiveActiveId = interaction.activePoint ? interaction.activePoint.id : null

  // A tooltip opened by hover closes on Escape wherever focus is (WCAG 1.4.13).
  const hovering = interaction.source === 'pointer' && effectiveActiveId !== null
  const { setActive } = interaction
  useEffect(() => {
    if (!hovering) return
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null, 'pointer')
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [hovering, setActive])

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    // Alt+arrow (history), Ctrl/Cmd+Home/End and friends belong to the browser.
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const next = navigate(interaction.points, effectiveActiveId, event.key)
    if (next !== undefined) {
      event.preventDefault()
      interaction.setActive(next, 'keyboard')
      return
    }
    const point = interaction.activePoint
    if ((event.key === 'Enter' || event.key === ' ') && onSelect && point) {
      event.preventDefault()
      if (point.selectable !== false) onSelect(point.id, point as ChartPoint<D>)
    }
  }

  const select = (point: ChartPoint) => {
    if (onSelect && point.selectable !== false) onSelect(point.id, point as ChartPoint<D>)
  }

  const ctx: InternalChartContext = {
    chartId,
    width: w,
    height: h,
    innerWidth,
    innerHeight,
    margin,
    data: rows,
    x: xScale,
    y: yScale,
    format: formatters.create,
    warn,
    dimInactive,
    radius,
    activeId: effectiveActiveId,
    activePoint: interaction.activePoint,
    points: interaction.points,
    setActive: interaction.setActive,
    registerPoints: interaction.registerPoints,
    unregisterPoints: interaction.unregisterPoints,
    select,
    selectable: onSelect !== undefined,
    overlay,
  }

  const spoken =
    interaction.source === 'keyboard' && interaction.activePoint
      ? announcement(interaction.points, interaction.activePoint)
      : ''
  const titleId = `${chartId}-title`
  // An element the caller names wins over the hidden `title` span, as in ARIA.
  const nameId = labelledBy ?? (title ? titleId : undefined)
  const descId = `${chartId}-desc`
  const hintId = `${chartId}-hint`
  // Only a chart whose marks registered points takes focus: the arrow keys need something to
  // move to. The first render (and the server's) has none yet, so the attributes arrive after
  // mount and hydration still matches.
  const interactive = interaction.points.length > 0
  const hint =
    keyboardHint ??
    `Use arrow keys to move between points, Home and End for first and last, Escape to clear.${
      onSelect ? ' Press Enter to select.' : ''
    }`
  const describedBy = [description ? descId : '', hint ? hintId : ''].filter(Boolean).join(' ')

  // While measuring, CSS keeps the box at the right height before the real width is known.
  // `minHeight: 0` stops the not-yet-resized svg from stretching the box (an aspect-ratio box
  // otherwise gets an automatic min-height from its content). No overflow clipping: tooltips and
  // edge labels may extend past the figure.
  const sizeStyle: CSSProperties =
    height === undefined && aspectRatio && width === undefined
      ? { aspectRatio: String(aspectRatio), minHeight: 0 }
      : { height: h }

  return (
    <figure
      ref={rootRef}
      data-ch-root=""
      data-ch-animate={animate ? 'true' : 'false'}
      className={className}
      style={{ ...sizeStyle, ...style }}
      aria-labelledby={nameId}
      aria-describedby={description ? descId : undefined}
      onPointerLeave={() => interaction.setActive(null, 'pointer')}
    >
      {title ? (
        <span hidden id={titleId} className="ch-sr-only">
          {title}
        </span>
      ) : null}
      {description ? (
        <span hidden id={descId} className="ch-sr-only">
          {description}
        </span>
      ) : null}
      {interactive && hint ? (
        <span hidden id={hintId} className="ch-sr-only">
          {hint}
        </span>
      ) : null}
      {isEmpty ? (
        <div data-ch-part="empty" className="ch-empty">
          {empty ?? 'No data'}
        </div>
      ) : (
        <ChartContext.Provider value={ctx}>
          {/* The focusable widget. A figure is not one, so screen readers in browse mode would
              keep the arrow keys; role="application" hands them to the chart. The data table
              stays outside, where browse mode can read it. */}
          <div
            data-ch-part="plot"
            {...(interactive
              ? {
                  role: 'application',
                  'aria-roledescription': 'chart',
                  'aria-labelledby': nameId,
                  'aria-describedby': describedBy || undefined,
                  tabIndex: 0,
                  onKeyDown,
                  onPointerDown: () => {
                    pressed.current = true
                  },
                  // A press that moved no focus (already focused, or preventDefault) must not
                  // leave the flag set for the next keyboard focus.
                  onPointerUp: () => {
                    pressed.current = false
                  },
                  onPointerCancel: () => {
                    pressed.current = false
                  },
                  // Keyboard focus alone shows the first point, its tooltip and announcement.
                  onFocus: () => {
                    const byPointer = pressed.current
                    pressed.current = false
                    const first = interaction.points[0]
                    if (!byPointer && !interaction.activePoint && first) {
                      interaction.setActive(first.id, 'keyboard')
                    }
                  },
                  onBlur: () => {
                    pressed.current = false
                    if (interaction.source === 'keyboard') interaction.setActive(null, 'keyboard')
                  },
                }
              : null)}
          >
            <svg width={w} height={h} aria-hidden="true" focusable="false" className="ch-svg">
              <PatternDefs chartId={chartId} geometry={hatch} />
              <g transform={`translate(${margin.left},${margin.top})`}>{children}</g>
            </svg>
            <div
              ref={setOverlay}
              data-ch-part="overlay"
              aria-hidden="true"
              className="ch-overlay"
              style={{ left: margin.left, top: margin.top, width: innerWidth, height: innerHeight }}
            />
          </div>
        </ChartContext.Provider>
      )}
      {!isEmpty && dataTable ? (
        <DataTable data={rows} columns={dataTable.columns} caption={dataTable.caption ?? title} />
      ) : null}
      <div aria-live="polite" className="ch-sr-only">
        {spoken}
      </div>
    </figure>
  )
}

/** Internal: `<Chart>` that picks its margins and height from its measured width. */
export const FittedChart = Chart as <D>(
  props: ChartProps<D> & { layoutFor: (width: number) => ChartFit },
) => ReturnType<typeof Chart>
