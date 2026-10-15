import { useChartContext } from '../context'
import type { ChartPoint } from '../types'

export interface NearestPointerProps {
  /** Largest distance in px that still activates a point. Default 24. */
  radius?: number
  /** 'xy' measures straight-line distance; 'x' only the horizontal distance (columns). Default 'xy'. */
  axis?: 'xy' | 'x'
}

interface PointerLike {
  clientX: number
  clientY: number
  currentTarget: Element
}

/** One transparent layer over the plot that activates the registered point nearest the pointer. */
export function NearestPointer({ radius = 24, axis = 'xy' }: NearestPointerProps) {
  const ctx = useChartContext('NearestPointer')
  const nearest = (event: PointerLike): ChartPoint | undefined => {
    const box = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - box.left
    const py = event.clientY - box.top
    let best: ChartPoint | undefined
    let bestDistance = Number.POSITIVE_INFINITY
    for (const point of ctx.points) {
      const hx = point.hitX ?? point.x
      const hy = point.hitY ?? point.y
      const distance = axis === 'x' ? Math.abs(hx - px) : Math.hypot(hx - px, hy - py)
      if (distance <= radius && distance < bestDistance) {
        best = point
        bestDistance = distance
      }
    }
    return best
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: pointer-only hit layer; keyboard access lives on the focusable figure
    <rect
      data-ch-part="pointer-layer"
      data-ch-selectable={ctx.selectable ? 'true' : undefined}
      x={0}
      y={0}
      width={ctx.innerWidth}
      height={ctx.innerHeight}
      fill="transparent"
      onPointerMove={(event) => ctx.setActive(nearest(event)?.id ?? null, 'pointer')}
      onClick={(event) => {
        const point = nearest(event)
        if (point) ctx.select(point)
      }}
    />
  )
}
