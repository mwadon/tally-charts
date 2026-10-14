import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createScale, type ScaleSpec } from '../core/scale'
import type { Id } from '../core/types'
import { createWarner, type Warn } from '../core/warn'
import { DEFAULT_HATCH, DEFAULT_RADIUS, readHatchGeometry, readRadius } from '../theme/patterns'
import { useFormat } from './ChartsProvider'
import { ChartContext, type ChartContextValue, type Margin } from './context'
import { navigate, useInteraction } from './interaction'
import { PatternDefs } from './PatternDefs'
import type { ChartPoint } from './types'
import { useIsoLayoutEffect } from './useIsoLayoutEffect'
import { useWidth } from './useWidth'

export interface ChartProps<D> {
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
  /** Accessible name of the figure. */
  title?: string
  /** Accessible description, usually the takeaway sentence. */
  description?: string
  activeId?: Id | null
  onActiveChange?: (id: Id | null, point: ChartPoint | null) => void
  onSelect?: (id: Id, point: ChartPoint) => void
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
  description,
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
}: ChartProps<D>) {
  const rootRef = useRef<HTMLElement>(null)
  const reactId = useId()
  const chartId = `ch-${(chartIdProp ?? reactId).replace(/[^a-zA-Z0-9_-]/g, '')}`
  const measured = useWidth(rootRef, initialWidth, width === undefined)
  const w = Math.max(0, width ?? measured)
  const h = Math.max(0, height ?? (aspectRatio ? Math.round(w / aspectRatio) : DEFAULT_HEIGHT))
  const margin: Margin = { ...DEFAULT_MARGIN, ...marginProp }
  const innerWidth = Math.max(0, w - margin.left - margin.right)
  const innerHeight = Math.max(0, h - margin.top - margin.bottom)
  const rows: readonly D[] = data ?? EMPTY
  const isEmpty = data !== undefined && data.length === 0

  const warn = useMemo(() => createWarner(), [])
  const scaleWarn = isEmpty ? silent : warn
  const xScale = useMemo(
    () => createScale(x, rows, 'x', innerWidth, scaleWarn),
    [x, rows, innerWidth, scaleWarn],
  )
  const yScale = useMemo(
    () => createScale(y, rows, 'y', innerHeight, scaleWarn),
    [y, rows, innerHeight, scaleWarn],
  )

  const formatters = useFormat()
  const interaction = useInteraction({ activeId, onActiveChange })
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

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const next = navigate(interaction.points, effectiveActiveId, event.key)
    if (next !== undefined) {
      event.preventDefault()
      interaction.setActive(next, 'keyboard')
      return
    }
    const point = interaction.activePoint
    if ((event.key === 'Enter' || event.key === ' ') && onSelect && point) {
      event.preventDefault()
      onSelect(point.id, point)
    }
  }

  const select = (point: ChartPoint) => {
    if (onSelect) onSelect(point.id, point)
  }

  const ctx: ChartContextValue = {
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

  const announcement =
    interaction.source === 'keyboard' && interaction.activePoint
      ? interaction.activePoint.label
      : ''
  const titleId = `${chartId}-title`
  const descId = `${chartId}-desc`

  // While measuring, CSS keeps the box at the right height before the real width is known.
  const sizeStyle: CSSProperties =
    height === undefined && aspectRatio && width === undefined
      ? { aspectRatio: String(aspectRatio) }
      : { height: h }

  return (
    <figure
      ref={rootRef}
      data-ch-root=""
      data-ch-animate={animate ? 'true' : 'false'}
      className={className}
      style={{ ...sizeStyle, ...style }}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      tabIndex={isEmpty ? undefined : 0}
      onKeyDown={isEmpty ? undefined : onKeyDown}
      onPointerLeave={() => interaction.setActive(null, 'pointer')}
      onBlur={() => {
        if (interaction.source === 'keyboard') interaction.setActive(null, 'keyboard')
      }}
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
      {isEmpty ? (
        <div data-ch-part="empty" className="ch-empty">
          {empty ?? 'No data'}
        </div>
      ) : (
        <ChartContext.Provider value={ctx}>
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
        </ChartContext.Provider>
      )}
      <div aria-live="polite" className="ch-sr-only">
        {announcement}
      </div>
    </figure>
  )
}
