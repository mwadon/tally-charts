import { bandPath, linePath } from '../../core/line'
import { round2 } from '../../core/path'
import type { Tone } from '../../core/types'
import { useMessages } from '../ChartsProvider'
import { cx, toneVar } from './util'

export interface SparklineProps {
  /** One value per step, left to right. A `null` or non-finite value breaks the line. */
  values: readonly (number | null)[]
  /** Accessible name, e.g. "Clicks, last 28 days". */
  label: string
  /** Default 'accent'. */
  tone?: Tone
  /** Fills under the line. Default false. */
  area?: boolean
  /** A dot on the last valid value. Default false. */
  endpoint?: boolean
  /** Draws a thin rule at this value. */
  target?: number
  /** Height in px. Default 28. */
  height?: number
  /** Default the extent of the values and the target. */
  domain?: readonly [number, number]
  className?: string
}

// The drawing is a 100 x 100 box stretched over the root. Values map to 8–92 so the stroke isn't
// clipped at the top and bottom.
const TOP = 8
const BOTTOM = 92

const valid = (v: number | null | undefined): v is number =>
  typeof v === 'number' && Number.isFinite(v)

/** A line of values for KPI rows and table cells. It fills its container's width. */
export function Sparkline({
  values,
  label,
  tone = 'accent',
  area = false,
  endpoint = false,
  target,
  height = 28,
  domain,
  className,
}: SparklineProps) {
  const messages = useMessages()
  const hasTarget = valid(target)
  const finite = values.filter(valid)
  const given = domain !== undefined && valid(domain[0]) && valid(domain[1])
  const extent = [...finite, ...(hasTarget ? [target] : [])]
  const lo = given ? Math.min(domain[0], domain[1]) : Math.min(...extent)
  const hi = given ? Math.max(domain[0], domain[1]) : Math.max(...extent)
  // A flat series (and a domain of one value) sits at mid height.
  const toY = (v: number) => {
    const t = hi === lo ? 0.5 : Math.min(1, Math.max(0, (v - lo) / (hi - lo)))
    return round2(BOTTOM - t * (BOTTOM - TOP))
  }
  const toX = (i: number) => (values.length < 2 ? 50 : round2((i / (values.length - 1)) * 100))

  const points = values.map((v, i) => ({ x: toX(i), y: valid(v) ? toY(v) : Number.NaN }))
  const line = linePath(points)
  // The fill of each run is a band down to the bottom edge, so it needs no gradient or id.
  const fills = area ? bandPath(points.map((p) => ({ x: p.x, low: 100, high: p.y }))) : ''
  const last = points.filter((p) => Number.isFinite(p.y)).at(-1)

  return (
    <span
      className={cx('ch-sparkline', className)}
      data-ch-part="sparkline"
      role="img"
      aria-label={finite.length > 0 ? label : `${label}: ${messages.noData}`}
      style={{ ...toneVar(tone), height }}
    >
      {finite.length > 0 ? (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {fills ? <path data-ch-part="sparkline-area" d={fills} /> : null}
          {hasTarget ? (
            <line
              data-ch-part="sparkline-target"
              x1={0}
              x2={100}
              y1={toY(target)}
              y2={toY(target)}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {line ? (
            <path data-ch-part="sparkline-line" d={line} vectorEffect="non-scaling-stroke" />
          ) : null}
        </svg>
      ) : null}
      {endpoint && last ? (
        <span data-ch-part="sparkline-endpoint" style={{ left: `${last.x}%`, top: `${last.y}%` }} />
      ) : null}
    </span>
  )
}
