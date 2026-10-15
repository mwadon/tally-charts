import type { TooltipSegment } from '../types'
import { cx, toneVar } from './util'

export interface TooltipPillProps {
  segments: readonly TooltipSegment[]
  className?: string
}

/** The segmented pill: `#5819 | 12.3% | ABC Property Group`. */
export function TooltipPill({ segments, className }: TooltipPillProps) {
  return (
    <div className={cx('ch-pill', className)} data-ch-part="tooltip-pill">
      {segments.map((segment, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional and never reorder
          key={i}
          className="ch-pill-seg"
          data-ch-part="pill-segment"
          data-ch-tone={segment.tone}
          style={segment.tone ? toneVar(segment.tone) : undefined}
        >
          <span className="ch-pill-value" data-ch-part="pill-value">
            {segment.value}
          </span>
          {segment.label != null ? (
            <span className="ch-pill-label" data-ch-part="pill-label">
              {segment.label}
            </span>
          ) : null}
        </span>
      ))}
    </div>
  )
}
