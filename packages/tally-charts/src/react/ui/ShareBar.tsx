import type { CSSProperties } from 'react'
import type { FormatSpec } from '../../core/format'
import { useFormat } from '../ChartsProvider'
import { type ShareSegment, shareLayout } from './share'
import { cx, toneVar } from './util'

export type { ShareSegment } from './share'

export interface ShareBarProps {
  segments: readonly ShareSegment[]
  /** The whole. Default: the sum of the segments. A larger total leaves an empty track. */
  total?: number
  /** The list of parts under the bar. Default true. */
  legend?: boolean
  /** What each list row shows on the right. Default 'both' ("2,711 · 46%"). */
  legendValue?: 'both' | 'value' | 'percent'
  /** Default 'number'. */
  format?: FormatSpec
  /** Accessible name. */
  label: string
  className?: string
}

/** Parts of a whole: one bar split into segments, with an optional list of the parts. */
export function ShareBar({
  segments,
  total,
  legend = true,
  legendValue = 'both',
  format,
  label,
  className,
}: ShareBarProps) {
  const { create } = useFormat()
  const fmt = create(format)
  const { parts, empty } = shareLayout(segments, total)
  const bar = (
    <div
      className="ch-share-bar"
      data-ch-part="share-bar"
      {...(legend
        ? { 'aria-hidden': true }
        : {
            role: 'img',
            'aria-label': empty
              ? `${label}: No data`
              : parts.length
                ? `${label}: ${parts
                    .map((p) => `${p.label} ${p.percentText} (${fmt(p.value)})`)
                    .join(', ')}`
                : label,
          })}
    >
      {parts.map((p) =>
        !empty && p.value > 0 ? (
          <div
            key={p.key}
            className="ch-share-segment ch-fillable"
            data-ch-part="share-segment"
            data-ch-tone={p.tone}
            data-ch-fill={p.fill}
            style={{ ...toneVar(p.tone), flexBasis: `${p.share}%` } as CSSProperties}
          />
        ) : null,
      )}
    </div>
  )
  if (!legend) {
    return (
      <div className={cx('ch-share', className)} data-ch-part="share">
        {bar}
      </div>
    )
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: a named group of a bar and its list, not a fieldset
    <div className={cx('ch-share', className)} data-ch-part="share" role="group" aria-label={label}>
      {bar}
      {empty ? (
        <p className="ch-share-empty" data-ch-part="share-empty">
          No data
        </p>
      ) : (
        <ul className="ch-share-list" data-ch-part="share-list">
          {parts.map((p) => (
            <li key={p.key} className="ch-share-row" data-ch-part="share-row">
              <span
                className="ch-share-swatch ch-fillable"
                data-ch-part="share-swatch"
                data-ch-tone={p.tone}
                data-ch-fill={p.fill}
                style={toneVar(p.tone)}
              />
              <span className="ch-share-label" data-ch-part="share-label">
                {p.label}
              </span>{' '}
              <span className="ch-share-value" data-ch-part="share-value">
                {legendValue === 'percent' ? (
                  p.percentText
                ) : legendValue === 'value' ? (
                  fmt(p.value)
                ) : (
                  <>
                    {fmt(p.value)} <span aria-hidden="true">·</span> {p.percentText}
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
