import type { ReactNode } from 'react'
import type { FormatSpec } from '../../core/format'
import type { Fill, Tone } from '../../core/types'
import { useFormat } from '../ChartsProvider'
import { cx, toneVar, toPercent } from './util'

export interface MeterProps {
  value: number
  /** Default 0. */
  min?: number
  /** Default 100. */
  max?: number
  /** Draws a tick and, by default, a "Target …" label. */
  target?: number
  /** Default 'accent'. */
  tone?: Tone
  /** Default 'hatch'. */
  fill?: Fill
  /** Default 'number'. */
  format?: FormatSpec
  /** Accessible name. */
  label: string
  /** Text under the start. Default: the formatted `min`. `null` hides it. */
  minLabel?: ReactNode | null
  /** Text under the target tick. Default "Target <formatted target>". `null` hides it. */
  targetLabel?: ReactNode | null
  className?: string
}

/** Progress toward a target: a filled track with a target tick. */
export function Meter({
  value,
  min = 0,
  max = 100,
  target,
  tone = 'accent',
  fill = 'hatch',
  format,
  label,
  minLabel,
  targetLabel,
  className,
}: MeterProps) {
  const { create } = useFormat()
  const fmt = create(format)
  const finite = Number.isFinite(value)
  const p = finite ? toPercent(value, min, max) : 0
  const t = target === undefined ? undefined : toPercent(target, min, max)
  const valueText = !finite
    ? 'No data'
    : target === undefined
      ? fmt(value)
      : `${fmt(value)}, target ${fmt(target)}`
  const showMin = minLabel !== null
  const showTarget = t !== undefined && target !== undefined && targetLabel !== null
  return (
    <div className={cx('ch-meter', className)} data-ch-part="meter" style={toneVar(tone)}>
      {/* biome-ignore lint/a11y/useSemanticElements: a styled track with children, not a native <meter> */}
      <div
        className="ch-meter-track"
        role="meter"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={finite ? value : min}
        aria-valuetext={valueText}
      >
        <div
          className="ch-meter-fill ch-fillable"
          data-ch-tone={tone}
          data-ch-fill={fill}
          style={{ width: `${p}%` }}
        />
        {t !== undefined ? (
          <div className="ch-meter-target" data-ch-part="meter-target" style={{ left: `${t}%` }} />
        ) : null}
      </div>
      {showMin || showTarget ? (
        <div className="ch-meter-labels" aria-hidden="true">
          {showMin ? <span>{minLabel ?? fmt(min)}</span> : null}
          {showTarget ? (
            <span
              className="ch-meter-target-label"
              style={{ left: `${t}%`, transform: `translateX(-${t}%)` }}
            >
              {targetLabel ?? `Target ${fmt(target)}`}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
