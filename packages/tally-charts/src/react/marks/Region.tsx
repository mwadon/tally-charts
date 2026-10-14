import { categoryCenter, categoryStep } from '../../core/scale'
import type { Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { useChart } from '../context'
import { toneVar } from '../ui/util'

export interface RegionProps {
  /** First category in the region, e.g. the first forecast month. */
  from: string | number
  /** Last category. Default: the last category on the scale. */
  to?: string | number
  /** Default 'accent'. */
  tone?: Tone
}

/**
 * A soft backdrop over a run of categories on a point or band x scale. It covers whole steps,
 * so it starts halfway between `from` and the category before it.
 */
export function Region({ from, to, tone = 'accent' }: RegionProps) {
  const ctx = useChart('Region')
  if (ctx.x.kind === 'linear') {
    if (DEV) ctx.warn('region-scale', 'Region needs a point or band scale on <Chart x>.')
    return null
  }
  const domain = ctx.x.scale.domain()
  const last = to ?? domain[domain.length - 1]
  const a = categoryCenter(ctx.x, from)
  const b = categoryCenter(ctx.x, last)
  if (a === undefined || b === undefined) {
    if (DEV) {
      ctx.warn(
        'region-domain',
        `Region from "${from}" to "${String(last)}" is not on the x scale and was not drawn.`,
      )
    }
    return null
  }
  const half = categoryStep(ctx.x) / 2
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
