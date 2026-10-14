import type { CSSProperties } from 'react'
import type { TooltipSegment } from '../types'

export interface TooltipPillProps {
  segments: TooltipSegment[]
  className?: string
}

/** The segmented pill: `#5819 | 12.3% | ABC Property Group`. */
export function TooltipPill({ segments, className }: TooltipPillProps) {
  return (
    <div className={className ? `ch-pill ${className}` : 'ch-pill'} data-ch-part="tooltip-pill">
      {segments.map((segment, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
        <span
          key={i}
          className="ch-pill-seg"
          data-ch-tone={segment.tone}
          style={
            segment.tone
              ? ({ '--ch-swatch-color': `var(--ch-${segment.tone})` } as CSSProperties)
              : undefined
          }
        >
          <span className="ch-pill-value">{segment.value}</span>
          {segment.label !== undefined && segment.label !== null ? (
            <span className="ch-pill-label">{segment.label}</span>
          ) : null}
        </span>
      ))}
    </div>
  )
}
