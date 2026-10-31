import type { CSSProperties, ReactNode } from 'react'
import type { Fill, SeqLevel, Tone } from '../../core/types'

/** 'band' is the soft fill of a `Band`, e.g. a likely range. */
export type LegendShape = 'bar' | 'dot' | 'line' | 'band'

export interface LegendItem {
  label: ReactNode
  /** Swatch tone. Default 'neutral'; ignored when `level` is set. */
  tone?: Tone
  fill?: Fill
  count?: ReactNode
  shape?: LegendShape
  /** A dashed line swatch, e.g. for a forecast. Only with shape 'line'. */
  dashed?: boolean
  /**
   * A dot on a line swatch, filled ('dot') or hollow ('ring'), matching the series' points, so
   * series that share a color and a dash still differ. Only with shape 'line'.
   */
  marker?: 'dot' | 'ring'
  /** A sequential level (`--ch-seq-N`), e.g. a heatmap bin. Replaces `tone`. */
  level?: SeqLevel
  /**
   * Any CSS color, including `var(--x)`, replacing the tone's paint on the swatch; `tone` stays as
   * the semantic name. Ignored when `level` is set. Contrast in light and dark is up to you:
   * `var(--x)` is the way to follow a theme. Forced-colors mode still uses system colors.
   */
  color?: string
}

export interface LegendProps {
  items: readonly LegendItem[]
  shape?: LegendShape
  className?: string
}

export function Legend({ items, shape = 'bar', className }: LegendProps) {
  return (
    <ul className={className ? `ch-legend ${className}` : 'ch-legend'} data-ch-part="legend">
      {items.map((item, i) => {
        const tone = item.tone ?? 'neutral'
        const custom = item.level ? undefined : item.color
        const color = item.level ? `var(--ch-seq-${item.level})` : (custom ?? `var(--ch-${tone})`)
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: labels may be non-string nodes; order is stable
          <li key={i} className="ch-legend-item" data-ch-part="legend-item">
            <span
              aria-hidden="true"
              className="ch-swatch ch-fillable"
              data-ch-part="legend-swatch"
              data-ch-tone={item.level ? undefined : tone}
              data-ch-level={item.level}
              data-ch-fill={item.fill ?? 'solid'}
              data-ch-shape={item.shape ?? shape}
              data-ch-dashed={item.dashed ? 'true' : undefined}
              data-ch-marker={item.marker}
              data-ch-colored={custom ? 'true' : undefined}
              style={
                {
                  '--_ch-swatch-color': color,
                  ...(custom ? { '--_ch-tone-paint': `var(--ch-${tone})` } : {}),
                } as CSSProperties
              }
            />
            <span className="ch-legend-label" data-ch-part="legend-label">
              {item.label}
            </span>
            {item.count !== undefined && item.count !== null ? (
              <span className="ch-legend-count" data-ch-part="legend-count">
                {item.count}
              </span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
