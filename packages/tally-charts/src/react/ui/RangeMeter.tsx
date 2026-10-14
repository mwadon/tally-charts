import type { CSSProperties, ReactNode } from 'react'
import type { FormatSpec } from '../../core/format'
import type { Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar, toPercent } from './util'

export interface RangeMeterProps {
  /** The actual value: a filled dot. */
  value: number
  /** The planned or estimated value: an empty ring. */
  reference: number
  /** Default 0. */
  min?: number
  /** Default 100. */
  max?: number
  /** Dot, gap and value label color. Default 'loss'. */
  tone?: Tone
  /** Ring color. Default 'accent'. */
  referenceTone?: Tone
  /** Default 'number'. */
  format?: FormatSpec
  /** Start of the accessible name, e.g. "Margin". */
  label: string
  /** Text above the dot. Default: the formatted value. */
  valueLabel?: ReactNode
  /** Text above the ring. Default: the formatted reference. */
  referenceLabel?: ReactNode
  /** Min and max labels under the track. Default true. */
  showScale?: boolean
  className?: string
}

const at = (p: number): CSSProperties => ({ left: `${p}%`, transform: `translateX(-${p}%)` })

/** Actual against plan on one track: dot → hatched gap → ring. */
export function RangeMeter({
  value,
  reference,
  min = 0,
  max = 100,
  tone = 'loss',
  referenceTone = 'accent',
  format,
  label,
  valueLabel,
  referenceLabel,
  showScale = true,
  className,
}: RangeMeterProps) {
  const { create } = useFormat()
  const fmt = create(format)
  const hasValue = Number.isFinite(value)
  const hasReference = Number.isFinite(reference)
  const pv = toPercent(value, min, max)
  const pr = toPercent(reference, min, max)
  const lo = Math.min(pv, pr)
  const hi = Math.max(pv, pr)
  const name = !hasValue
    ? `${label}: No data`
    : hasReference
      ? `${label}: ${fmt(value)} against ${fmt(reference)}`
      : `${label}: ${fmt(value)}`
  const style = {
    ...toneVar(tone),
    '--ch-range-ref-color': `var(--ch-${referenceTone})`,
  } as CSSProperties
  return (
    <div
      className={cx('ch-range', className)}
      data-ch-part="range-meter"
      role="img"
      aria-label={name}
      style={style}
    >
      <div className="ch-range-labels" aria-hidden="true">
        {hasValue ? (
          <span className="ch-range-value-label ch-tone-text" style={at(pv)}>
            {valueLabel ?? fmt(value)}
          </span>
        ) : null}
        {hasReference ? (
          <span className="ch-range-ref-label" style={at(pr)}>
            {referenceLabel ?? fmt(reference)}
          </span>
        ) : null}
      </div>
      <div className="ch-range-track" aria-hidden="true">
        {hasValue && hasReference ? (
          <span
            className="ch-range-gap ch-fillable"
            data-ch-fill="hatch"
            style={{ left: `${lo}%`, width: `${hi - lo}%` }}
          />
        ) : null}
        {hasValue ? <span className="ch-range-dot" style={{ left: `${pv}%` }} /> : null}
        {hasReference ? <span className="ch-range-ring" style={{ left: `${pr}%` }} /> : null}
      </div>
      {showScale ? (
        <div className="ch-range-scale" aria-hidden="true">
          <span>{fmt(min)}</span>
          <span>{fmt(max)}</span>
        </div>
      ) : null}
    </div>
  )
}
