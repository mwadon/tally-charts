import { type ReactNode, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { placeTooltip } from '../../core/placement'
import { useChartContext } from '../context'
import type { ChartPoint } from '../types'
import { TooltipPill } from '../ui/TooltipPill'
import { useIsoLayoutEffect } from '../useIsoLayoutEffect'

export interface TooltipProps {
  content?: (point: ChartPoint) => ReactNode
  /** Gap between the point and the tooltip in px. Default 10. */
  offset?: number
}

export function Tooltip({ content, offset = 10 }: TooltipProps) {
  const ctx = useChartContext('Tooltip')
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const point = ctx.activePoint

  // Measure after every render so placement uses the real size before paint.
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
  })

  if (!ctx.overlay || !point) return null

  const position = placeTooltip({
    x: point.x,
    y: point.y,
    width: size.width,
    height: size.height,
    minX: -ctx.margin.left,
    maxX: ctx.innerWidth + ctx.margin.right,
    minY: -ctx.margin.top,
    offset,
  })

  return createPortal(
    <div
      ref={ref}
      className="ch-tooltip"
      data-ch-part="tooltip"
      data-ch-placement={position.placement}
      // Never wider than the chart: a long pill wraps instead of widening the page.
      style={{ left: position.left, top: position.top, maxWidth: ctx.width }}
    >
      {content ? content(point) : <TooltipPill segments={point.segments} />}
    </div>,
    ctx.overlay,
  )
}
