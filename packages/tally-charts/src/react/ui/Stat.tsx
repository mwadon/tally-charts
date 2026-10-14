import type { ReactNode } from 'react'
import type { FormatSpec } from '../../core/format'
import type { Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar } from './util'

export interface StatProps {
  /** A number formatted with `format`, or preformatted text. */
  value: number | string
  /** Default 'number'. */
  format?: FormatSpec
  /** Small muted line above the value. */
  label?: ReactNode
  /** Usually a <Delta>, shown under the value. */
  delta?: ReactNode
  /** Muted text after the delta, e.g. "vs last week". */
  caption?: ReactNode
  /** Default 'lg'. */
  size?: 'lg' | 'md' | 'sm'
  /** Color role of the value. Default: ink. */
  tone?: Tone
  className?: string
}

/** A headline number with an optional label, change and caption. */
export function Stat({
  value,
  format,
  label,
  delta,
  caption,
  size = 'lg',
  tone,
  className,
}: StatProps) {
  const { create } = useFormat()
  const text =
    typeof value === 'number' ? (Number.isFinite(value) ? create(format)(value) : '–') : value
  return (
    <div className={cx('ch-stat', className)} data-ch-part="stat" data-ch-size={size}>
      {label ? <div className="ch-stat-label">{label}</div> : null}
      <div
        className={tone ? 'ch-stat-value ch-tone-text' : 'ch-stat-value'}
        data-ch-tone={tone}
        style={tone ? toneVar(tone) : undefined}
      >
        {text}
      </div>
      {delta || caption ? (
        <div className="ch-stat-meta">
          {delta}
          {caption ? <span className="ch-stat-caption">{caption}</span> : null}
        </div>
      ) : null}
    </div>
  )
}
