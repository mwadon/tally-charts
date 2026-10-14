import { DEV } from '../../core/warn'
import { useChart } from '../context'

export interface ColumnHighlightProps {
  /** The band (category) to back. */
  at: string | number
  /** Extra room around the band, in px. Default 12. */
  pad?: number
  /** Corner radius in px. Default 16. */
  radius?: number
}

/** A soft backdrop behind one column (or row), drawn before the marks. */
export function ColumnHighlight({ at, pad = 12, radius = 16 }: ColumnHighlightProps) {
  const ctx = useChart('ColumnHighlight')
  const bandOnX = ctx.x.kind === 'band'
  const band = bandOnX ? ctx.x : ctx.y
  if (band.kind !== 'band') {
    if (DEV) ctx.warn('column-highlight-scale', 'ColumnHighlight needs a band scale on <Chart>.')
    return null
  }
  const start = band.scale(String(at))
  if (start === undefined) return null
  const size = band.scale.bandwidth()
  const rect = bandOnX
    ? { x: start - pad, y: -ctx.margin.top, width: size + 2 * pad, height: ctx.height }
    : { x: -ctx.margin.left, y: start - pad, width: ctx.width, height: size + 2 * pad }
  return <rect data-ch-part="column-highlight" {...rect} rx={radius} />
}
