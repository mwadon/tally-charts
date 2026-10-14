import type { FormatSpec } from '../../core/format'
import type { Fill, Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar, toPercent } from './util'

export interface InlineBarProps {
  value: number
  max: number
  /** Default 0. */
  min?: number
  /** Draws a target tick. */
  target?: number
  /** Default 'loss'. */
  tone?: Tone
  /** Default 'hatch'. */
  fill?: Fill
  /** Width in px. Default 64. */
  width?: number
  /** Default 'number'. */
  format?: FormatSpec
  /** Start of the accessible name, e.g. "Margin". */
  label: string
  className?: string
}

/** A small bar for table cells, with an optional target tick. */
export function InlineBar({
  value,
  max,
  min = 0,
  target,
  tone = 'loss',
  fill = 'hatch',
  width = 64,
  format,
  label,
  className,
}: InlineBarProps) {
  const { create } = useFormat()
  const fmt = create(format)
  const p = toPercent(value, min, max)
  const t = target === undefined ? undefined : toPercent(target, min, max)
  const name =
    target === undefined
      ? `${label}: ${fmt(value)}`
      : `${label}: ${fmt(value)}, target ${fmt(target)}`
  return (
    <span
      className={cx('ch-inline-bar', className)}
      data-ch-part="inline-bar"
      role="img"
      aria-label={name}
      style={{ ...toneVar(tone), width }}
    >
      <span
        className="ch-inline-bar-fill ch-fillable"
        data-ch-tone={tone}
        data-ch-fill={fill}
        style={{ width: `${p}%` }}
      />
      {t !== undefined ? <span className="ch-inline-bar-target" style={{ left: `${t}%` }} /> : null}
    </span>
  )
}
