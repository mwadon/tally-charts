import { type CSSProperties, useMemo } from 'react'
import { resolveAccessor, resolveIds, resolvePerItem, toFieldGetter } from '../../core/accessor'
import { type BarAlign, computeBars } from '../../core/bars'
import type { FormatSpec } from '../../core/format'
import type { Accessor, Fill, Id, PerItem, Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { paintFor } from '../../theme/patterns'
import { useChartContext } from '../context'
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
  /** Tooltip pill segments per bar. Default: the label and the formatted value. */
  segments?: (d: D, i: number) => readonly TooltipSegment[]
  /** Screen-reader text per bar. Default "<label>, <formatted value>". */
  ariaLabel?: (d: D, i: number) => string
  /** Start value per row; the bar runs from it to the value. Default: the zero baseline. */
  from?: Accessor<D, number>
  /** Bar thickness in px. Default: the band width. */
  size?: number
  /** Where a bar thinner than its band sits. Default 'center'. */
  align?: BarAlign
  /** Extra shift along the band axis in px, after `align`. */
  offset?: number
  /** Register points and hit areas for hover, keyboard and select. Set false on decorative layers. Default true. */
  interactive?: boolean
  /** Draw a faint track behind each bar across the whole value range. Default false. */
  track?: boolean
  /** False for bars the chart's `onSelect` skips (no pointer cursor either). Default true. */
  selectable?: PerItem<D, boolean>
}

const NO_POINTS: ChartPoint[] = []

export function Bars<D>(props: BarsProps<D>) {
  const ctx = useChartContext('Bars')
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
  const { from, size, align, offset, interactive = true } = props
  const ids = useMemo(() => resolveIds(data, props.id, warn), [data, props.id, warn])
  const valueAccessor = scaleY.kind === 'band' ? props.x : props.y
  const valueField = typeof valueAccessor === 'string' ? valueAccessor : undefined
  const getFrom = useMemo(() => toFieldGetter(from), [from])
  const layout = useMemo(
    () =>
      getX && getY
        ? computeBars({
            data,
            ids,
            x: scaleX,
            y: scaleY,
            getX,
            getY,
            warn,
            valueField,
            getFrom,
            size,
            align,
            offset,
          })
        : { orientation: 'vertical' as const, bars: [] },
    [data, ids, scaleX, scaleY, getX, getY, warn, valueField, getFrom, size, align, offset],
  )

  const format = useMemo(() => createFormat(props.format), [createFormat, props.format])
  const { label, segments, ariaLabel, selectable } = props
  const points: ChartPoint[] = useMemo(() => {
    const getLabel = label ? resolveAccessor(label) : undefined
    const selectableOf = resolvePerItem<D, boolean>(selectable ?? true)
    return layout.bars.map((bar) => {
      const datum = bar.datum as D
      const name = getLabel ? getLabel(datum, bar.index) : bar.category
      return {
        id: bar.id,
        index: bar.index,
        datum: bar.datum,
        x: bar.anchor.x,
        y: bar.anchor.y,
        label: ariaLabel ? ariaLabel(datum, bar.index) : `${name}, ${format(bar.value)}`,
        segments: segments
          ? segments(datum, bar.index)
          : [{ value: name }, { value: format(bar.value) }],
        ...(selectableOf(datum, bar.index, data) ? {} : { selectable: false }),
      }
    })
  }, [layout, label, segments, ariaLabel, format, selectable, data])
  useRegisterPoints(interactive ? points : NO_POINTS)

  const toneOf = resolvePerItem<D, Tone>(props.tone ?? 'accent')
  const fillOf = resolvePerItem<D, Fill>(props.fill ?? 'solid')
  const vertical = layout.orientation === 'vertical'
  const radius = props.radius ?? ctx.radius
  const corner = (w: number, h: number) => Math.max(0, Math.min(radius, w / 2, h / 2))
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
          // The tone, for the outline theme.css draws on hatched and soft bars.
          '--_ch-swatch-color': `var(--ch-${tone})`,
        } as CSSProperties
        const track = vertical
          ? { x: bar.x, y: 0, width: bar.width, height: ctx.innerHeight }
          : { x: 0, y: bar.y, width: ctx.innerWidth, height: bar.height }
        // Hit areas cover the whole band and reach into the margins, so labels select too.
        const hit = vertical
          ? { x: bar.band.start, y: -ctx.margin.top, width: bar.band.size, height: ctx.height }
          : { x: -ctx.margin.left, y: bar.band.start, width: ctx.width, height: bar.band.size }
        return (
          <g key={String(bar.id)}>
            {props.track ? (
              <rect data-ch-part="bar-track" {...track} rx={corner(track.width, track.height)} />
            ) : null}
            <rect
              data-ch-part="bar"
              data-ch-tone={tone}
              data-ch-fill={fill}
              data-ch-direction={bar.dir}
              data-ch-active={active ? 'true' : undefined}
              data-ch-dimmed={dimming && !active ? 'true' : undefined}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              rx={corner(bar.width, bar.height)}
              style={style}
            />
            {interactive ? (
              // biome-ignore lint/a11y/noStaticElementInteractions: pointer-only hit area; keyboard selection lives on the focusable figure
              <rect
                data-ch-part="bar-hit"
                data-ch-selectable={
                  ctx.selectable && point?.selectable !== false ? 'true' : undefined
                }
                fill="transparent"
                {...hit}
                onPointerEnter={() => ctx.setActive(bar.id, 'pointer')}
                onClick={point ? () => ctx.select(point) : undefined}
              />
            ) : null}
          </g>
        )
      })}
    </g>
  )
}
