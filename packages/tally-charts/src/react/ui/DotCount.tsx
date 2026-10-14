import type { ReactNode } from 'react'
import type { Tone } from '../../core/types'
import { cx, toneVar } from './util'

export interface DotCountProps {
  count: number
  /** Most dots drawn; the label still shows the full count. Default 30. */
  max?: number
  /** Dots per row. Default 15. */
  perRow?: number
  /** Default 'loss'. */
  tone?: Tone
  /** Text after the dots. Default: the count. `null` hides it (the count stays readable). */
  label?: ReactNode | null
  className?: string
}

/** A count drawn as a small field of dots, e.g. "•••••• 29 jobs". */
export function DotCount({
  count,
  max = 30,
  perRow = 15,
  tone = 'loss',
  label,
  className,
}: DotCountProps) {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  const drawn = Math.min(n, Math.max(0, Math.floor(max)))
  return (
    <span className={cx('ch-dot-count', className)} data-ch-part="dot-count" style={toneVar(tone)}>
      <span
        className="ch-dot-grid"
        aria-hidden="true"
        style={{ gridTemplateColumns: `repeat(${Math.max(1, perRow)}, 8px)` }}
      >
        {Array.from({ length: drawn }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: dots are identical and positional
          <span key={i} className="ch-dot" />
        ))}
      </span>
      {label === null ? (
        <span className="ch-sr-only">{n}</span>
      ) : (
        <span className="ch-dot-count-label">{label ?? n}</span>
      )}
    </span>
  )
}
