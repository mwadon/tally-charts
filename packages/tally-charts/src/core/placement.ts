export interface PlacementInput {
  /** Anchor point in plot coordinates. */
  x: number
  y: number
  /** Measured tooltip size. */
  width: number
  height: number
  /** Allowed horizontal range for the tooltip box. */
  minX: number
  maxX: number
  /** Top edge the tooltip must stay below. */
  minY: number
  /** Gap between anchor and tooltip. */
  offset: number
}

export interface Placement {
  left: number
  top: number
  placement: 'top' | 'bottom'
}

export function placeTooltip({
  x,
  y,
  width,
  height,
  minX,
  maxX,
  minY,
  offset,
}: PlacementInput): Placement {
  const left = Math.max(minX, Math.min(x - width / 2, maxX - width))
  const above = y - offset - height
  if (above >= minY) return { left, top: above, placement: 'top' }
  return { left, top: y + offset, placement: 'bottom' }
}
