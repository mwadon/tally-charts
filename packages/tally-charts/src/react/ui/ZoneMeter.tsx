import type { ReactNode } from 'react'
import type { FormatSpec } from '../../core/format'
import { toNumber } from '../../core/number'
import { binIndex, type ThresholdInclusive, type Thresholds } from '../../core/thresholds'
import { createWarner, DEV } from '../../core/warn'
import { useFormat, useMessages } from '../ChartsProvider'
import { formatMessage, NO_DATA, VALUE_ABOVE, VALUE_BELOW } from '../messages'
import { cx, toneVar, toPercent } from './util'

/**
 * The zones of a `ZoneMeter`: a `thresholds()` result, or its plain `{ bins, inclusive }`, which a
 * Server Component can pass to a client component.
 */
export type ZoneMeterZones = Pick<Thresholds, 'bins'> & { inclusive?: ThresholdInclusive }

export interface ZoneMeterProps {
  /** The measured value. A value outside the range is pinned to its end; a missing or non-finite one shows "No data" and draws no marker. */
  value: number
  /** A `thresholds()` result, or its `{ bins, inclusive }`: the breaks, tones and labels of the zones. */
  zones: ZoneMeterZones
  /** Default 0. */
  min?: number
  /** The end of the range; must be greater than `min`. */
  max: number
  /** Labels under the track at min, every break and max. Default true. */
  ticks?: boolean
  /** Text under the start. Default: the formatted `min`. `null` hides it. */
  minLabel?: ReactNode | null
  /** Text under the end, e.g. "6 s+". Default: the formatted `max`. `null` hides it. */
  maxLabel?: ReactNode | null
  /** Default 'number'. */
  format?: FormatSpec
  /** Accessible name. */
  label: string
  /** Extra class on the root element. */
  className?: string
}

const warn = /* @__PURE__ */ createWarner()

/** Percent for a style value: 4 decimals, no float noise. */
const pct = (n: number) => `${Math.round(n * 1e4) / 1e4}%`

/** A value against good / needs work / poor zones: zones from `thresholds()`, a marker at the value. */
export function ZoneMeter({
  value,
  zones,
  min = 0,
  max,
  ticks = true,
  minLabel,
  maxLabel,
  format,
  label,
  className,
}: ZoneMeterProps) {
  const { create } = useFormat()
  const messages = useMessages()
  const fmt = create(format)
  if (DEV && typeof value === 'number' && !Number.isFinite(value)) {
    warn(
      `zone-value:${label}:${value}`,
      `ZoneMeter "${label}": value ${value} is not finite; it shows No data.`,
    )
  }
  if (DEV && !(max > min)) {
    warn(
      `zone-range:${label}:${min}:${max}`,
      `ZoneMeter "${label}": max (${max}) must be greater than min (${min}).`,
    )
  }
  if (DEV && max > min) {
    for (const bin of zones.bins.slice(1)) {
      if (bin.min <= min || bin.min >= max) {
        warn(
          `zone-break:${label}:${bin.min}`,
          `ZoneMeter "${label}": break ${bin.min} is outside ${min}–${max}; its zone is not drawn.`,
        )
      }
    }
  }
  const v = toNumber(value)
  const finite = Number.isFinite(v)
  const clamped = finite ? Math.min(max, Math.max(min, v)) : min
  const edges = zones.bins.slice(1).map((b) => b.min)
  const zone = finite ? zones.bins[binIndex(v, edges, zones.inclusive)]?.label : undefined
  const valueText = !finite
    ? (messages.noData ?? NO_DATA)
    : [
        fmt(v),
        v > max
          ? formatMessage(messages.valueAbove ?? VALUE_ABOVE, { max: fmt(max) })
          : v < min
            ? formatMessage(messages.valueBelow ?? VALUE_BELOW, { min: fmt(min) })
            : undefined,
        zone,
      ]
        .filter(Boolean)
        .join(', ')
  const drawn = zones.bins
    .map((bin) => ({ bin, from: Math.max(min, bin.min), to: Math.min(max, bin.max) }))
    .filter((z) => z.to > z.from)
  const breaks = edges.filter((b) => b > min && b < max)
  const labels: { key: string; at: number; text: ReactNode }[] = [
    ...(minLabel === null ? [] : [{ key: 'min', at: 0, text: minLabel ?? fmt(min) }]),
    ...breaks.map((b) => ({ key: `b${b}`, at: toPercent(b, min, max), text: fmt(b) })),
    ...(maxLabel === null ? [] : [{ key: 'max', at: 100, text: maxLabel ?? fmt(max) }]),
  ]
  return (
    <div className={cx('ch-zone-meter', className)} data-ch-part="zone-meter">
      {/* biome-ignore lint/a11y/useSemanticElements: a styled track with children, not a native <meter> */}
      <div
        className="ch-zone-meter-track"
        data-ch-part="zone-meter-track"
        role="meter"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={valueText}
      >
        {drawn.map(({ bin, from, to }) => (
          <div
            key={bin.min}
            className="ch-zone-meter-zone"
            data-ch-part="zone-meter-zone"
            data-ch-tone={bin.tone}
            style={{
              ...toneVar(bin.tone),
              width: pct(toPercent(to, min, max) - toPercent(from, min, max)),
            }}
          />
        ))}
        {finite ? (
          <div
            className="ch-zone-meter-marker"
            data-ch-part="zone-meter-marker"
            style={{ left: pct(toPercent(clamped, min, max)) }}
          />
        ) : null}
      </div>
      {ticks && labels.length > 0 ? (
        <div className="ch-zone-meter-labels" data-ch-part="zone-meter-labels" aria-hidden="true">
          {labels.map((l) => (
            <span
              key={l.key}
              className="ch-zone-meter-label"
              data-ch-part="zone-meter-label"
              style={{ left: pct(l.at), transform: `translateX(-${pct(l.at)})` }}
            >
              {l.text}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
