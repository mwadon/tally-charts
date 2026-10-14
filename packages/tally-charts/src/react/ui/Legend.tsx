import type { CSSProperties, ReactNode } from 'react'
import type { Fill, SeqLevel, Tone } from '../../core/types'

export type LegendShape = 'bar' | 'dot' | 'line'

export interface LegendItem {
  label: ReactNode
  /** Swatch tone. Default 'neutral'; ignored when `level` is set. */
  tone?: Tone
  fill?: Fill
  count?: ReactNode
  shape?: LegendShape
  /** A dashed line swatch, e.g. for a forecast. Only with shape 'line'. */
  dashed?: boolean
  /** A sequential level (`--ch-seq-N`), e.g. a heatmap bin. Replaces `tone`. */
  level?: SeqLevel
}

export interface LegendProps {
  items: LegendItem[]
  shape?: LegendShape
  className?: string
}

export function Legend({ items, shape = 'bar', className }: LegendProps) {
  return (
    <ul className={className ? `ch-legend ${className}` : 'ch-legend'} data-ch-part="legend">
      {items.map((item, i) => {
        const tone = item.tone ?? 'neutral'
        const color = item.level ? `var(--ch-seq-${item.level})` : `var(--ch-${tone})`
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: labels may be non-string nodes; order is stable
          <li key={i} className="ch-legend-item">
            <span
              aria-hidden="true"
              className="ch-swatch ch-fillable"
              data-ch-tone={item.level ? undefined : tone}
              data-ch-level={item.level}
              data-ch-fill={item.fill ?? 'solid'}
              data-ch-shape={item.shape ?? shape}
              data-ch-dashed={item.dashed ? 'true' : undefined}
              style={{ '--ch-swatch-color': color } as CSSProperties}
            />
            <span className="ch-legend-label">{item.label}</span>
            {item.count !== undefined && item.count !== null ? (
              <span className="ch-legend-count">{item.count}</span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
