import { useMemo } from 'react'
import type { Id, Tone } from '../../core/types'
import { useChartContext } from '../context'
import type { ChartPoint, PointGroup, TooltipSegment } from '../types'
import { useRegisterPoints } from '../useRegisterPoints'

export interface DotItem {
  /** Unique React key. */
  key: string
  /** Point id for activation, selection and dimming; dots sharing an id light up together. */
  id: Id
  datum: unknown
  cx: number
  cy: number
  tone: Tone
  /** Lighter fill, e.g. for periods that aren't the peak. Default false. */
  soft?: boolean
  /** Screen-reader text and default tooltip. */
  label: string
  segments?: TooltipSegment[]
  /** Stack or row for the arrow keys. */
  group?: PointGroup
}

export interface DotsProps {
  dots: readonly DotItem[]
  radius: number
  /** Register a point per dot. Set false when another layer registers the points. Default true. */
  interactive?: boolean
}

const NO_POINTS: ChartPoint[] = []
/** Share of the tone in a soft dot; the rest is the surface colour. */
const SOFT_MIX = 45

/** Circles at given plot positions, with a ring on the active one and dimming for the rest. */
export function Dots({ dots, radius, interactive = true }: DotsProps) {
  const ctx = useChartContext('Dots')
  const r = Math.max(0, radius)
  const points = useMemo(
    () =>
      dots.map(
        (d, index): ChartPoint => ({
          id: d.id,
          index,
          datum: d.datum,
          x: d.cx,
          y: d.cy - r,
          hitX: d.cx,
          hitY: d.cy,
          label: d.label,
          segments: d.segments ?? [{ value: d.label }],
          group: d.group,
        }),
      ),
    [dots, r],
  )
  useRegisterPoints(interactive ? points : NO_POINTS)
  const dimming = ctx.dimInactive && ctx.activeId !== null
  const active = interactive ? dots.find((d) => d.id === ctx.activeId) : undefined
  return (
    <g data-ch-part="dots">
      {dots.map((d) => {
        const on = d.id === ctx.activeId
        return (
          <circle
            key={d.key}
            data-ch-part="dot"
            data-ch-tone={d.tone}
            data-ch-soft={d.soft ? 'true' : undefined}
            data-ch-active={on ? 'true' : undefined}
            data-ch-dimmed={dimming && !on ? 'true' : undefined}
            cx={d.cx}
            cy={d.cy}
            r={r}
            style={{
              fill: d.soft
                ? `color-mix(in srgb, var(--ch-${d.tone}) ${SOFT_MIX}%, var(--ch-surface))`
                : `var(--ch-${d.tone})`,
            }}
          />
        )
      })}
      {active ? (
        <circle
          data-ch-part="dot-ring"
          data-ch-tone={active.tone}
          cx={active.cx}
          cy={active.cy}
          r={r + 3}
          style={{ stroke: `var(--ch-${active.tone})` }}
        />
      ) : null}
    </g>
  )
}
