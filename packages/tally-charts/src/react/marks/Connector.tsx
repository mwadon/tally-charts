import { DEV } from '../../core/warn'
import { useChartContext } from '../context'

export interface ConnectorLink {
  /** Value on the chart's linear axis where the line runs. */
  at: number
  /** Band the line leaves, from its far edge. */
  from: string | number
  /** Band the line reaches, at its near edge. */
  to: string | number
}

export interface ConnectorProps {
  links: readonly ConnectorLink[]
  /** Pulls the start back from the far edge of `from`, in px. Default 0. */
  fromInset?: number
  /**
   * Pushes the end into `to`, in px, e.g. to meet a bar that sits at the bottom of its band.
   * Default 0.
   */
  toInset?: number
}

/** Dotted step lines between bands, e.g. from one waterfall bar to the next. */
export function Connector({ links, fromInset = 0, toInset = 0 }: ConnectorProps) {
  const ctx = useChartContext('Connector')
  const bandOnY = ctx.y.kind === 'band'
  const band = bandOnY ? ctx.y : ctx.x
  const linear = bandOnY ? ctx.x : ctx.y
  if (band.kind !== 'band' || linear.kind !== 'linear') {
    if (DEV)
      ctx.warn(
        'connector-scales',
        'Connector needs one band scale and one linear scale on <Chart>.',
      )
    return null
  }
  const size = band.scale.bandwidth()
  const [r0, r1] = linear.scale.range()
  const lo = Math.min(r0, r1)
  const hi = Math.max(r0, r1)
  const lines = links.flatMap((link, i) => {
    const a = band.scale(String(link.from))
    const b = band.scale(String(link.to))
    if (a === undefined || b === undefined || !Number.isFinite(link.at)) return []
    const v = Math.min(hi, Math.max(lo, linear.scale(link.at)))
    const start = a + size - fromInset
    const end = b + toInset
    return [
      bandOnY
        ? { key: i, x1: v, x2: v, y1: start, y2: end }
        : { key: i, x1: start, x2: end, y1: v, y2: v },
    ]
  })
  return (
    <g data-ch-part="connectors">
      {lines.map(({ key, ...line }) => (
        <line key={key} data-ch-part="connector" {...line} />
      ))}
    </g>
  )
}
