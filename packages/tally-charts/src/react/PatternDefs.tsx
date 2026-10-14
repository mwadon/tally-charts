import { TONES } from '../core/types'
import { fadeMaskId, type HatchGeometry, patternId } from '../theme/patterns'

export interface PatternDefsProps {
  chartId: string
  geometry: HatchGeometry
}

/**
 * One hatch pattern per tone (always all six, so server and client markup match) and two
 * fade masks. Colors and stroke width come from CSS variables; angle and gap are attributes.
 */
export function PatternDefs({ chartId, geometry }: PatternDefsProps) {
  const { gap } = geometry
  // A vertical stripe rotated clockwise by (90 - angle) runs at `angle` from horizontal.
  const rotate = 90 - geometry.angle
  return (
    <defs>
      {TONES.map((tone) => (
        <pattern
          key={tone}
          id={patternId(chartId, tone)}
          patternUnits="userSpaceOnUse"
          width={gap}
          height={gap}
          patternTransform={`rotate(${rotate})`}
        >
          <rect
            width={gap}
            height={gap}
            style={{ fill: `var(--ch-${tone})`, opacity: 'var(--ch-hatch-tint)' }}
          />
          <line
            x1={gap / 2}
            y1={0}
            x2={gap / 2}
            y2={gap}
            style={{ stroke: `var(--ch-${tone})`, strokeWidth: 'var(--ch-hatch-width)' }}
          />
        </pattern>
      ))}
      <linearGradient id={`${chartId}-fade-gradient-y`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity={1} />
        <stop offset="1" stopColor="#fff" stopOpacity={0.3} />
      </linearGradient>
      <linearGradient id={`${chartId}-fade-gradient-x`} x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity={1} />
        <stop offset="1" stopColor="#fff" stopOpacity={0.3} />
      </linearGradient>
      <mask id={fadeMaskId(chartId, 'y')} maskContentUnits="objectBoundingBox">
        <rect width={1} height={1} fill={`url(#${chartId}-fade-gradient-y)`} />
      </mask>
      <mask id={fadeMaskId(chartId, 'x')} maskContentUnits="objectBoundingBox">
        <rect width={1} height={1} fill={`url(#${chartId}-fade-gradient-x)`} />
      </mask>
    </defs>
  )
}
