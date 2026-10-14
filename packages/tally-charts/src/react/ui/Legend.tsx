import type { CSSProperties, ReactNode } from 'react'
import type { Fill, Tone } from '../../core/types'

export interface LegendItem {
  label: ReactNode
  tone: Tone
  fill?: Fill
  count?: ReactNode
  shape?: 'bar' | 'dot'
}

export interface LegendProps {
  items: LegendItem[]
  shape?: 'bar' | 'dot'
  className?: string
}

export function Legend({ items, shape = 'bar', className }: LegendProps) {
  return (
    <ul className={className ? `ch-legend ${className}` : 'ch-legend'} data-ch-part="legend">
      {items.map((item, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: labels may be non-string nodes; order is stable
        <li key={i} className="ch-legend-item">
          <span
            aria-hidden="true"
            className="ch-swatch"
            data-ch-tone={item.tone}
            data-ch-fill={item.fill ?? 'solid'}
            data-ch-shape={item.shape ?? shape}
            style={{ '--ch-swatch-color': `var(--ch-${item.tone})` } as CSSProperties}
          />
          <span className="ch-legend-label">{item.label}</span>
          {item.count !== undefined && item.count !== null ? (
            <span className="ch-legend-count">{item.count}</span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
