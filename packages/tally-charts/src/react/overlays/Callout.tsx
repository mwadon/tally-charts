import { type ReactNode, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { placeTooltip } from '../../core/placement'
import type { Id } from '../../core/types'
import { useChart } from '../context'
import type { TooltipSegment } from '../types'
import { TooltipPill } from '../ui/TooltipPill'
import { useIsoLayoutEffect } from '../useIsoLayoutEffect'

export interface CalloutProps {
  /** Id of the point to pin to: any point a mark registered. */
  id: Id
  /** Pill segments. Default: the point's own tooltip segments. */
  segments?: TooltipSegment[]
  /** Custom content instead of the pill. */
  content?: ReactNode
  /** A thin line from the pill to the point. Default false. */
  stem?: boolean
  /** Gap between the point and the pill, in px. Default 10. */
  offset?: number
  /** Hide while any point is active, so the tooltip takes over. Default true. */
  hideWhileActive?: boolean
}

/**
 * A pill pinned to one point regardless of hover. It lives in the HTML overlay, so it appears
 * after mount and is hidden from assistive tech; put the same facts in the data or description.
 */
export function Callout({
  id,
  segments,
  content,
  stem = false,
  offset = 10,
  hideWhileActive = true,
}: CalloutProps) {
  const ctx = useChart('Callout')
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  // Measure after every render so placement uses the real size before paint.
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
  })

  const point = ctx.points.find((p) => p.id === id)
  if (!ctx.overlay || !point || (hideWhileActive && ctx.activeId !== null)) return null

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
  const above = position.placement === 'top'
  const stemTop = above ? position.top + size.height : point.y
  const stemHeight = Math.max(0, above ? point.y - stemTop : position.top - point.y)

  return createPortal(
    <>
      {stem ? (
        <div
          className="ch-callout-stem"
          data-ch-part="callout-stem"
          style={{ left: point.x, top: stemTop, height: stemHeight }}
        />
      ) : null}
      <div
        ref={ref}
        className="ch-tooltip ch-callout"
        data-ch-part="callout"
        data-ch-placement={position.placement}
        style={{ left: position.left, top: position.top }}
      >
        {content ?? <TooltipPill segments={segments ?? point.segments} />}
      </div>
    </>,
    ctx.overlay,
  )
}
