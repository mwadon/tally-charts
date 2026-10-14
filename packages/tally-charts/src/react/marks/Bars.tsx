import { type CSSProperties, useMemo } from 'react'
import { resolveAccessor, resolveIds, resolvePerItem, toFieldGetter } from '../../core/accessor'
import { computeBars } from '../../core/bars'
import type { FormatSpec } from '../../core/format'
import type { Accessor, Fill, Id, PerItem, Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { paintFor } from '../../theme/patterns'
import { useChart } from '../context'
import type { ChartPoint, TooltipSegment } from '../types'
import { useRegisterPoints } from '../useRegisterPoints'

export interface BarsProps<D> {
  /** Defaults to <Chart data>. */
  data?: readonly D[]
  /** Defaults to the field on <Chart x>. */
  x?: Accessor<D, string | number>
  /** Defaults to the field on <Chart y>. */
  y?: Accessor<D, string | number>
  id?: Accessor<D, Id>
  tone?: PerItem<D, Tone>
  fill?: PerItem<D, Fill>
  /** Corner radius in px. Default: the `--ch-radius` token (3px). */
  radius?: number
  /** Value format for tooltips and announcements. Default 'number'. */
  format?: FormatSpec
  /** Category label for tooltips and announcements. Defaults to the category value. */
  label?: Accessor<D, string>
  tooltip?: (d: D, i: number) => TooltipSegment[]
}

export function Bars<D>(props: BarsProps<D>) {
  const ctx = useChart('Bars')
  const data = (props.data ?? ctx.data) as readonly D[]
  const getX = useMemo(() => toFieldGetter(props.x) ?? ctx.x.field, [props.x, ctx.x.field])
  const getY = useMemo(() => toFieldGetter(props.y) ?? ctx.y.field, [props.y, ctx.y.field])
  if (DEV && (!getX || !getY)) {
    ctx.warn(
      'bars-fields',
      'Bars need x and y fields: pass them to <Bars> or set `field` on <Chart x/y>.',
    )
  }
  const { x: scaleX, y: scaleY, warn, format: createFormat } = ctx
  const ids = useMemo(() => resolveIds(data, props.id, warn), [data, props.id, warn])
  const valueAccessor = scaleY.kind === 'band' ? props.x : props.y
  const valueField = typeof valueAccessor === 'string' ? valueAccessor : undefined
  const layout = useMemo(
    () =>
      getX && getY
        ? computeBars({ data, ids, x: scaleX, y: scaleY, getX, getY, warn, valueField })
        : { orientation: 'vertical' as const, bars: [] },
    [data, ids, scaleX, scaleY, getX, getY, warn, valueField],
  )

  const format = useMemo(() => createFormat(props.format), [createFormat, props.format])
  const { label, tooltip } = props
  const points: ChartPoint[] = useMemo(() => {
    const getLabel = label ? resolveAccessor(label) : undefined
    return layout.bars.map((bar) => {
      const name = getLabel ? getLabel(bar.datum as D, bar.index) : bar.category
      return {
        id: bar.id,
        index: bar.index,
        datum: bar.datum,
        x: bar.anchor.x,
        y: bar.anchor.y,
        label: `${name}, ${format(bar.value)}`,
        segments: tooltip
          ? tooltip(bar.datum as D, bar.index)
          : [{ value: name }, { value: format(bar.value) }],
      }
    })
  }, [layout, label, tooltip, format])
  useRegisterPoints(ctx, points)

  const toneOf = resolvePerItem<D, Tone>(props.tone ?? 'accent')
  const fillOf = resolvePerItem<D, Fill>(props.fill ?? 'solid')
  const vertical = layout.orientation === 'vertical'
  const radius = props.radius ?? ctx.radius
  const dimming = ctx.dimInactive && ctx.activeId !== null

  return (
    <g data-ch-part="bars">
      {layout.bars.map((bar, i) => {
        const point = points[i]
        const datum = bar.datum as D
        const tone = toneOf(datum, bar.index, data)
        const fill = fillOf(datum, bar.index, data)
        const paint = paintFor(ctx.chartId, tone, fill, bar.dir)
        const active = bar.id === ctx.activeId
        // Geometry is also set as CSS so browsers that support it can transition x/y/width/height.
        const style = {
          x: bar.x,
          y: bar.y,
          width: bar.width,
          height: bar.height,
          fill: paint.fill,
          mask: paint.mask,
        } as CSSProperties
        return (
          <g key={String(bar.id)}>
            <rect
              data-ch-part="bar"
              data-ch-tone={tone}
              data-ch-fill={fill}
              data-ch-dir={bar.dir}
              data-ch-active={active ? 'true' : undefined}
              data-ch-dimmed={dimming && !active ? 'true' : undefined}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={Math.max(0, Math.min(radius, bar.width / 2, bar.height / 2))}
              style={style}
            />
            {/* biome-ignore lint/a11y/noStaticElementInteractions: pointer-only hit area; keyboard selection lives on the focusable figure */}
            <rect
              data-ch-part="bar-hit"
              data-ch-selectable={ctx.selectable ? 'true' : undefined}
              fill="transparent"
              x={vertical ? bar.x : 0}
              y={vertical ? 0 : bar.y}
              width={vertical ? bar.width : ctx.innerWidth}
              height={vertical ? ctx.innerHeight : bar.height}
              onPointerEnter={() => ctx.setActive(bar.id, 'pointer')}
              onClick={point ? () => ctx.select(point) : undefined}
            />
          </g>
        )
      })}
    </g>
  )
}
