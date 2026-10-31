import type { ReactNode } from 'react'
import type { Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar } from './util'

export interface DotCountProps {
  count: number
  /** Most dots drawn; the label still shows the full count. Default 30. */
  max?: number
  /** Dots per row. Default 15. */
  perRow?: number
  /** Default 'accent'. */
  tone?: Tone
  /** Text after the dots. Default: the formatted count. `null` hides it (the count stays readable). */
  label?: ReactNode | null
  className?: string
}

/** A count drawn as a small field of dots, e.g. "•••••• 29 jobs". */
export function DotCount({
  count,
  max = 30,
  perRow = 15,
  tone = 'accent',
  label,
  className,
}: DotCountProps) {
  const { create } = useFormat()
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0
  const text = create('number')(n)
  const columns = Number.isFinite(perRow) ? Math.max(1, Math.floor(perRow)) : 15
  const drawn = Math.min(n, Math.max(0, Math.floor(max)))
  return (
    <span className={cx('ch-dot-count', className)} data-ch-part="dot-count" style={toneVar(tone)}>
      <span
        className="ch-dot-grid"
        data-ch-part="dot-count-dots"
        aria-hidden="true"
        style={{ gridTemplateColumns: `repeat(${columns}, 8px)` }}
      >
        {Array.from({ length: drawn }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: dots are identical and positional
          <span key={i} className="ch-dot" data-ch-part="dot-count-dot" />
        ))}
      </span>
      {label === null ? (
        <span className="ch-sr-only">{text}</span>
      ) : (
        <span className="ch-dot-count-label" data-ch-part="dot-count-label">
          {label ?? text}
        </span>
      )}
    </span>
  )
}
