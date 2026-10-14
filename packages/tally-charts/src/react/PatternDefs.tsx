import type { BarDirection } from '../core/bars'
import { TONES } from '../core/types'
import { fadeMaskId, type HatchGeometry, patternId } from '../theme/patterns'

export interface PatternDefsProps {
  chartId: string
  geometry: HatchGeometry
}

/** Gradient end points per direction: offset 0 (opaque) sits at the bar's outer end. */
const FADES: { dir: BarDirection; x1: number; y1: number; x2: number; y2: number }[] = [
  { dir: 'up', x1: 0, y1: 0, x2: 0, y2: 1 },
  { dir: 'down', x1: 0, y1: 1, x2: 0, y2: 0 },
  { dir: 'right', x1: 1, y1: 0, x2: 0, y2: 0 },
  { dir: 'left', x1: 0, y1: 0, x2: 1, y2: 0 },
]

/**
 * One hatch pattern per tone (always all six, so server and client markup match) and four
 * fade masks, one per bar direction. Colors and stroke width come from CSS variables; angle and gap are attributes.
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
      {FADES.map(({ dir, ...ends }) => (
        <linearGradient key={`g-${dir}`} id={`${chartId}-fade-gradient-${dir}`} {...ends}>
          <stop offset="0" stopColor="#fff" stopOpacity={1} />
          <stop offset="1" stopColor="#fff" stopOpacity={0.3} />
        </linearGradient>
      ))}
      {FADES.map(({ dir }) => (
        <mask key={`m-${dir}`} id={fadeMaskId(chartId, dir)} maskContentUnits="objectBoundingBox">
          <rect width={1} height={1} fill={`url(#${chartId}-fade-gradient-${dir})`} />
        </mask>
      ))}
    </defs>
  )
}
