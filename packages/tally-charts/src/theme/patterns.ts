import type { Fill, Tone } from '../core/types'

export type FadeAxis = 'x' | 'y'

export interface HatchGeometry {
  /** Stripe direction in degrees from horizontal. */
  angle: number
  /** Distance between stripes in px. */
  gap: number
}

export const DEFAULT_HATCH: HatchGeometry = { angle: 45, gap: 6 }

export const patternId = (chartId: string, tone: Tone) => `${chartId}-hatch-${tone}`

export const fadeMaskId = (chartId: string, axis: FadeAxis) => `${chartId}-fade-${axis}`

export interface Paint {
  fill: string
  mask?: string
}

export function paintFor(chartId: string, tone: Tone, fill: Fill, fadeAxis: FadeAxis = 'y'): Paint {
  if (fill === 'solid') return { fill: `var(--ch-${tone})` }
  const pattern = `url(#${patternId(chartId, tone)})`
  if (fill === 'hatch') return { fill: pattern }
  return { fill: pattern, mask: `url(#${fadeMaskId(chartId, fadeAxis)})` }
}

export function readHatchGeometry(
  style: Pick<CSSStyleDeclaration, 'getPropertyValue'>,
): HatchGeometry {
  const angle = Number.parseFloat(style.getPropertyValue('--ch-hatch-angle'))
  const gap = Number.parseFloat(style.getPropertyValue('--ch-hatch-gap'))
  return {
    angle: Number.isFinite(angle) ? angle : DEFAULT_HATCH.angle,
    gap: Number.isFinite(gap) && gap > 0 ? gap : DEFAULT_HATCH.gap,
  }
}
