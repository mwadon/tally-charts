import { categoryCenter, categoryStep } from '../../core/scale'
import { type TimeInput, toTime } from '../../core/time'
import type { Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { useChartContext } from '../context'
import { toneVar } from '../ui/util'

export interface RegionProps {
  /**
   * Where the region starts: a category on a point or band scale, e.g. the first forecast month,
   * or a date (`Date`, epoch ms or ISO string) on a time scale.
   */
  from: TimeInput
  /** Where it ends. Default: the last category, or the end of the time scale. */
  to?: TimeInput
  /** Default 'accent'. */
  tone?: Tone
}

/**
 * A soft backdrop over a run of categories on a point or band x scale, or a span of dates on a
 * time scale. On categories it covers whole steps, so it starts halfway between `from` and the
 * category before it; on time it starts and ends exactly at its dates.
 */
export function Region({ from, to, tone = 'accent' }: RegionProps) {
  const ctx = useChartContext('Region')
  const x = ctx.x
  if (x.kind === 'linear') {
    if (DEV) ctx.warn('region-scale', 'Region needs a point, band or time scale on <Chart x>.')
    return null
  }
  let a: number | undefined
  let b: number | undefined
  let half = 0
  if (x.kind === 'time') {
    const start = toTime(from)
    const end = to === undefined ? x.scale.domain()[1] : toTime(to)
    a = start === undefined ? undefined : x.scale(start)
    b = end === undefined ? undefined : x.scale(end)
  } else {
    const domain = x.scale.domain()
    a = categoryCenter(x, from)
    b = categoryCenter(x, to ?? domain[domain.length - 1])
    half = categoryStep(x) / 2
  }
  const last = to ?? 'the end'
  if (a === undefined || b === undefined) {
    if (DEV) {
      ctx.warn(
        'region-domain',
        `Region from "${from}" to "${String(last)}" is not on the x scale and was not drawn.`,
      )
    }
    return null
  }
  const x0 = Math.max(0, Math.min(a, b) - half)
  const x1 = Math.min(ctx.innerWidth, Math.max(a, b) + half)
  return (
    <rect
      data-ch-part="region"
      data-ch-tone={tone}
      x={x0}
      y={0}
      width={Math.max(0, x1 - x0)}
      height={ctx.innerHeight}
      rx={8}
      style={toneVar(tone)}
    />
  )
}
