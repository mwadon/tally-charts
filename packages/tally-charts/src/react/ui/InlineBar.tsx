import type { FormatSpec } from '../../core/format'
import type { Fill, Tone } from '../../core/types'
import { useFormat, useMessages } from '../ChartsProvider'
import { formatMessage } from '../messages'
import { cx, toneVar, toPercent } from './util'

export interface InlineBarProps {
  value: number
  max: number
  /** Default 0. */
  min?: number
  /** Draws a target tick. */
  target?: number
  /** Default 'accent'. */
  tone?: Tone
  /** Default 'solid'. */
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
  tone = 'accent',
  fill = 'solid',
  width = 64,
  format,
  label,
  className,
}: InlineBarProps) {
  const { create } = useFormat()
  const messages = useMessages()
  const fmt = create(format)
  const hasValue = Number.isFinite(value)
  const hasTarget = target !== undefined && Number.isFinite(target)
  const p = toPercent(value, min, max)
  const t = hasTarget ? toPercent(target, min, max) : undefined
  const name = !hasValue
    ? `${label}: ${messages.noData}`
    : hasTarget
      ? `${label}: ${fmt(value)}, ${formatMessage(messages.target, { value: fmt(target) })}`
      : `${label}: ${fmt(value)}`
  return (
    <span
      className={cx('ch-inline-bar', className)}
      data-ch-part="inline-bar"
      role="img"
      aria-label={name}
      style={{ ...toneVar(tone), width }}
    >
      {hasValue ? (
        <span
          className="ch-inline-bar-fill ch-fillable"
          data-ch-part="inline-bar-fill"
          data-ch-tone={tone}
          data-ch-fill={fill}
          style={{ width: `${p}%` }}
        />
      ) : null}
      {t !== undefined ? (
        <span
          className="ch-inline-bar-target"
          data-ch-part="inline-bar-target"
          style={{ left: `${t}%` }}
        />
      ) : null}
    </span>
  )
}
