import { useMemo, useRef } from 'react'
import { resolveAccessor, resolveIds, resolvePerItem } from '../../core/accessor'
import type { FormatSpec, Formatter } from '../../core/format'
import { niceDomain } from '../../core/linear'
import { inferLinearDomain } from '../../core/scale'
import { estimateWidth, type Tick, type TickSpec } from '../../core/ticks'
import type { Accessor, Id, PerItem, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import { Chart, type ChartName } from '../Chart'
import { useFormat, useMessages } from '../ChartsProvider'
import { type Margin, useChartContext } from '../context'
import type { DataTableSpec } from '../DataTable'
import { samePoints } from '../interaction'
import { Axis, type AxisFormat } from '../marks/Axis'
import { Grid } from '../marks/Grid'
import { NearestPointer } from '../marks/NearestPointer'
import { Target } from '../marks/Target'
import { HEADER_NAME, HEADER_SIZE, HEADER_X, HEADER_Y } from '../messages'
import { Tooltip } from '../overlays/Tooltip'
import type { ChartPoint, TooltipSegment } from '../types'
import { toneVar } from '../ui/util'
import { useRegisterPoints } from '../useRegisterPoints'
import {
  type ChartPassThroughProps,
  type ChartTooltip,
  type DataTableOptions,
  headerOf,
  toNumber,
  tooltipContent,
  userCallbacks,
  withTableOptions,
} from './shared'

export type ScatterChartProps<D> = ChartName &
  Omit<ChartPassThroughProps<D>, 'aspectRatio'> & {
    data: readonly D[]
    /** Horizontal position: a number per row. */
    x: Accessor<D, number>
    /** Vertical position: a number per row. */
    y: Accessor<D, number>
    /**
     * A third measure drawn as the area of each point (a bubble chart). Without it every point
     * is a dot of `radius`.
     */
    size?: Accessor<D, number>
    /** Point id. Default: the data index. */
    id?: Accessor<D, Id>
    /** Item name for tooltips, announcements and the data table. */
    label?: Accessor<D, string>
    /** Default 'accent'. */
    tone?: PerItem<D, Tone>
    /**
     * Name of the x measure: in tooltips, announcements and the data table header, and drawn
     * under the x axis when set. Default for the texts: the field name in sentence case, or "X".
     */
    xLabel?: string
    /** As `xLabel`, for y; drawn above the y axis when set. Default: the field name, or "Y". */
    yLabel?: string
    /** As `xLabel`, for `size`; never drawn. Default: the field name, or "Size". */
    sizeLabel?: string
    /** Default 'number'. */
    xFormat?: FormatSpec
    /** Default 'number'. */
    yFormat?: FormatSpec
    /** Default 'number'. */
    sizeFormat?: FormatSpec
    /** Default: the range of x including zero, rounded to nice ticks. */
    xDomain?: readonly [number, number]
    /** Default: the range of y and the target, including zero, rounded to nice ticks. */
    yDomain?: readonly [number, number]
    /** Dot radius in px when `size` is not set. Default 5. */
    radius?: number
    /** Radius in px of the bubble with the largest `size`. Default 18. */
    maxRadius?: number
    /** A horizontal target line on y, optionally with a label. */
    target?: number | { value: number; label?: string }
    xAxis?: TickSpec | 'none'
    /** Default: `xFormat`. */
    xAxisFormat?: AxisFormat
    yAxis?: TickSpec | 'none'
    /** Default: `yFormat`. */
    yAxisFormat?: AxisFormat
    /** Horizontal grid lines at the y ticks. Default true. */
    grid?: boolean
    /**
     * Hidden data table for screen readers: `true`, `false`, or `{ caption, columns }` to set its
     * caption and rename column headers. Default true.
     */
    dataTable?: boolean | DataTableOptions
    /**
     * Tooltip on hover and focus: `true` for the default pill, or a function that renders the
     * content for a point (`point.datum` is your row). Default true.
     */
    tooltip?: ChartTooltip<D>
  }

interface ScatterRow<D> {
  datum: D
  index: number
  rowId: Id
  name: string
  x: number
  y: number
  /** NaN without `size`, or when it is missing. */
  size: number
}

/** Smallest drawn radius of a bubble, in px. */
const MIN_RADIUS = 3
/** Gap between the plot top and the baseline of the y axis name, in px. */
const Y_TITLE_RISE = 14
/** Gap between the plot bottom and the baseline of the x axis name, in px. */
const X_TITLE_DROP = 40

const DEFAULT_MARGIN = { top: 24, right: 16, bottom: 32, left: 44 }

/** A drawn row without its position: validity, radius, tone and draw order are settled. */
interface BubbleItem<D> {
  row: ScatterRow<D>
  r: number
  tone: Tone
}

const inDomain = (v: number, d: readonly [number, number]) =>
  v >= Math.min(d[0], d[1]) && v <= Math.max(d[0], d[1])

/** The drawn rows (inside the domains), larger bubbles first; ties keep data order. */
function drawnBubbles<D>(
  source: readonly D[],
  rows: readonly ScatterRow<D>[],
  hasSize: boolean,
  tone: PerItem<D, Tone> | undefined,
  radius: number,
  maxRadius: number,
  xDomain: readonly [number, number],
  yDomain: readonly [number, number],
): BubbleItem<D>[] {
  const toneOf = resolvePerItem(tone)
  // The largest size of every valid row, also outside the domains: bubbles keep their size when
  // a domain narrows.
  let largest = 0
  for (const r of rows) if (r.size > largest) largest = r.size
  const rad = (size: number) =>
    hasSize
      ? largest > 0
        ? Math.max(MIN_RADIUS, maxRadius * Math.sqrt(size / largest))
        : MIN_RADIUS
      : Math.max(0, radius)
  const items: BubbleItem<D>[] = []
  for (const row of rows) {
    if (!inDomain(row.x, xDomain) || !inDomain(row.y, yDomain)) continue
    items.push({
      row,
      r: rad(row.size),
      tone: toneOf(row.datum, row.index, source) ?? 'accent',
    })
  }
  // Array.sort is stable.
  return items.sort((a, b) => b.r - a.r)
}

function Marks<D>({
  source,
  rows,
  hasSize,
  tone,
  radius,
  maxRadius,
  xDomain,
  yDomain,
  target,
  targetLabel,
  xLabel,
  yLabel,
  showXTitle,
  showYTitle,
  names,
  fmts,
}: {
  source: readonly D[]
  rows: readonly ScatterRow<D>[]
  hasSize: boolean
  tone: PerItem<D, Tone> | undefined
  radius: number
  maxRadius: number
  xDomain: readonly [number, number]
  yDomain: readonly [number, number]
  target: number | undefined
  targetLabel: string | undefined
  xLabel: string | undefined
  yLabel: string | undefined
  showXTitle: boolean
  showYTitle: boolean
  names: { x: string; y: string; size: string; hasName: boolean }
  fmts: { x: Formatter; y: Formatter; size: Formatter }
}) {
  const ctx = useChartContext('ScatterChart')
  const items = useMemo(
    () => drawnBubbles(source, rows, hasSize, tone, radius, maxRadius, xDomain, yDomain),
    [source, rows, hasSize, tone, radius, maxRadius, xDomain, yDomain],
  )
  const sx = ctx.x.kind === 'linear' ? ctx.x.scale : undefined
  const sy = ctx.y.kind === 'linear' ? ctx.y.scale : undefined
  const built = useMemo((): ChartPoint[] => {
    if (!sx || !sy) return []
    const placed = items.map((b) => ({ b, cx: sx(b.row.x), cy: sy(b.row.y) }))
    // Keyboard order follows the screen: left to right, then bottom to top, then data order.
    placed.sort((p, q) => p.cx - q.cx || q.cy - p.cy || p.b.row.index - q.b.row.index)
    return placed.map(({ b, cx, cy }, index): ChartPoint => {
      const { row } = b
      const xText = fmts.x(row.x)
      const yText = fmts.y(row.y)
      const sizeText = hasSize ? fmts.size(row.size) : undefined
      const name = names.hasName ? row.name : ''
      const label = [
        name,
        `${names.x} ${xText}`,
        `${names.y} ${yText}`,
        sizeText === undefined ? '' : `${names.size} ${sizeText}`,
      ]
        .filter(Boolean)
        .join(', ')
      const segments: TooltipSegment[] = []
      if (name) segments.push({ value: name })
      segments.push(
        { label: names.x, value: xText },
        { label: names.y, value: yText, tone: b.tone },
      )
      if (sizeText !== undefined) segments.push({ label: names.size, value: sizeText })
      return {
        id: row.rowId,
        index,
        datum: row,
        x: cx,
        y: cy - b.r,
        hitX: cx,
        hitY: cy,
        label,
        segments,
      }
    })
  }, [items, sx, sy, hasSize, names, fmts])
  // `tone` and the formats are often inline functions, so `built` is a new array on every render
  // even when nothing it holds changed; keep the previous array while the content is the same.
  const stable = useRef<ChartPoint[]>([])
  if (!samePoints(stable.current, built)) stable.current = built
  useRegisterPoints(stable.current)
  if (!sx || !sy) return null
  const dimming = ctx.dimInactive && ctx.activeId !== null
  // The chart's active point is one of the registered points, so match its row, not its id.
  const activeRow = ctx.activePoint?.datum
  const active = activeRow === undefined ? undefined : items.find((b) => b.row === activeRow)

  const targetY = target !== undefined && inDomain(target, yDomain) ? sy(target) : undefined
  return (
    <>
      {target !== undefined && targetY !== undefined ? <Target y={target} /> : null}
      {targetLabel && targetY !== undefined ? (
        <text
          data-ch-part="target-label"
          x={ctx.innerWidth + 6}
          y={targetY}
          dominantBaseline="middle"
        >
          {targetLabel}
        </text>
      ) : null}
      <g data-ch-part="bubbles">
        {items.map((b) => {
          const on = active === b
          return (
            <circle
              key={b.row.index}
              data-ch-part="bubble"
              data-ch-tone={b.tone}
              data-ch-active={on ? 'true' : undefined}
              data-ch-dimmed={dimming && !on ? 'true' : undefined}
              cx={sx(b.row.x)}
              cy={sy(b.row.y)}
              r={b.r}
              style={toneVar(b.tone)}
            />
          )
        })}
        {active ? (
          <circle
            data-ch-part="bubble-ring"
            data-ch-tone={active.tone}
            cx={sx(active.row.x)}
            cy={sy(active.row.y)}
            r={active.r + 3}
            style={toneVar(active.tone)}
          />
        ) : null}
      </g>
      {showYTitle && yLabel ? (
        <text data-ch-part="axis-title" x={-ctx.margin.left} y={-Y_TITLE_RISE} textAnchor="start">
          {yLabel}
        </text>
      ) : null}
      {showXTitle && xLabel ? (
        <text
          data-ch-part="axis-title"
          x={ctx.innerWidth}
          y={ctx.innerHeight + X_TITLE_DROP}
          textAnchor="end"
        >
          {xLabel}
        </text>
      ) : null}
      <NearestPointer radius={Math.max(24, (hasSize ? maxRadius : radius) + 6)} />
    </>
  )
}

export function ScatterChart<D>({
  data,
  x,
  y,
  size,
  id,
  label,
  tone,
  xLabel,
  yLabel,
  xFormat,
  yFormat,
  xDomain,
  yDomain,
  radius = 5,
  maxRadius = 18,
  target,
  xAxis = 'all',
  xAxisFormat,
  yAxis = 'all',
  yAxisFormat,
  grid = true,
  margin,
  height = 280,
  children,
  onSelect,
  onActiveChange,
  sizeLabel,
  sizeFormat,
  dataTable = true,
  tooltip = true,
  ...chart
}: ScatterChartProps<D>) {
  const { create } = useFormat()
  const messages = useMessages()
  const warn = useMemo(() => createWarner(), [])
  const hasSize = size !== undefined
  // A non-finite radius would reach the SVG as r="NaN": use the defaults.
  const dotRadius = Number.isFinite(radius) ? radius : 5
  const bubbleRadius = Number.isFinite(maxRadius) ? maxRadius : 18
  const { rows, valid, badValue, badSize } = useMemo(() => {
    const ids = resolveIds(data, id, warn)
    const getX = resolveAccessor(x)
    const getY = resolveAccessor(y)
    const getSize = size ? resolveAccessor(size) : undefined
    const getLabel = label ? resolveAccessor(label) : undefined
    let badValue = false
    let badSize = false
    const all = data.map((d, i): ScatterRow<D> => {
      const sz = getSize ? toNumber(getSize(d, i)) : Number.NaN
      return {
        datum: d,
        index: i,
        rowId: ids[i] ?? i,
        name: getLabel ? String(getLabel(d, i) ?? '') : '',
        x: toNumber(getX(d, i)),
        y: toNumber(getY(d, i)),
        size: sz,
      }
    })
    const ok: ScatterRow<D>[] = []
    for (const r of all) {
      const valueOk = Number.isFinite(r.x) && Number.isFinite(r.y)
      const sizeOk = !getSize || (Number.isFinite(r.size) && r.size >= 0)
      if (!valueOk) badValue = true
      if (!sizeOk) badSize = true
      if (valueOk && sizeOk) ok.push(r)
    }
    return { rows: all, valid: ok, badValue, badSize }
  }, [data, x, y, size, id, label, warn])
  if (DEV && badValue) {
    warn('scatter-value', 'ScatterChart skipped a row with a missing or non-numeric x or y.')
  }
  if (DEV && badSize) {
    warn('scatter-size', 'ScatterChart skipped a row with a missing, non-numeric or negative size.')
  }

  const targetSpec = typeof target === 'number' ? { value: target } : target
  const targetValue = targetSpec && Number.isFinite(targetSpec.value) ? targetSpec.value : undefined
  const xTicks = typeof xAxis === 'number' ? xAxis : undefined
  const yTicks = typeof yAxis === 'number' ? yAxis : undefined
  const xDom = useMemo(
    (): readonly [number, number] =>
      xDomain ??
      niceDomain(
        inferLinearDomain(
          valid.map((r) => r.x),
          true,
        ),
        xTicks,
      ),
    [xDomain, valid, xTicks],
  )
  const yDom = useMemo((): readonly [number, number] => {
    if (yDomain) return yDomain
    const values = valid.map((r) => r.y)
    if (targetValue !== undefined) values.push(targetValue)
    return niceDomain(inferLinearDomain(values, true), yTicks)
  }, [yDomain, valid, targetValue, yTicks])

  // Mirrors the domain check in `marks/Target.tsx`.
  const line =
    targetValue !== undefined &&
    targetValue >= Math.min(yDom[0], yDom[1]) &&
    targetValue <= Math.max(yDom[0], yDom[1])
      ? targetValue
      : undefined
  const targetLabel = line !== undefined ? targetSpec?.label : undefined
  const showXTitle = xAxis !== 'none' && Boolean(xLabel)
  const showYTitle = yAxis !== 'none' && Boolean(yLabel)
  const m: Margin = {
    ...DEFAULT_MARGIN,
    top: showYTitle ? 32 : DEFAULT_MARGIN.top,
    bottom: showXTitle ? 48 : DEFAULT_MARGIN.bottom,
    right: targetLabel
      ? DEFAULT_MARGIN.right + estimateWidth({ label: targetLabel } as Tick) + 8
      : DEFAULT_MARGIN.right,
    ...margin,
  }

  const xFmtr = useMemo(() => create(xFormat), [create, xFormat])
  const yFmtr = useMemo(() => create(yFormat), [create, yFormat])
  const sizeFmtr = useMemo(() => create(sizeFormat), [create, sizeFormat])
  const xName = xLabel ?? headerOf(x, messages.headerX ?? HEADER_X)
  const yName = yLabel ?? headerOf(y, messages.headerY ?? HEADER_Y)
  const sizeName = sizeLabel ?? headerOf(size, messages.headerSize ?? HEADER_SIZE)
  const hasName = label !== undefined
  const names = useMemo(
    () => ({ x: xName, y: yName, size: sizeName, hasName }),
    [xName, yName, sizeName, hasName],
  )
  const fmts = useMemo(() => ({ x: xFmtr, y: yFmtr, size: sizeFmtr }), [xFmtr, yFmtr, sizeFmtr])
  const text = (fmt: Formatter, v: number) => (Number.isFinite(v) ? fmt(v) : '')
  const table: DataTableSpec<ScatterRow<D>> | undefined = dataTable
    ? {
        columns: [
          ...(hasName
            ? [
                {
                  header: headerOf(label, messages.headerName ?? HEADER_NAME),
                  value: (r: ScatterRow<D>) => r.name,
                },
              ]
            : []),
          { header: xName, value: (r) => text(xFmtr, r.x) },
          { header: yName, value: (r) => text(yFmtr, r.y) },
          ...(hasSize
            ? [{ header: sizeName, value: (r: ScatterRow<D>) => text(sizeFmtr, r.size) }]
            : []),
        ],
      }
    : undefined

  const xSpec = useMemo(() => ({ domain: xDom }), [xDom])
  const ySpec = useMemo(() => ({ domain: yDom }), [yDom])
  const xFmt: AxisFormat | undefined = xAxisFormat ?? xFormat
  const yFmt: AxisFormat | undefined = yAxisFormat ?? yFormat

  return (
    <Chart<ScatterRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={xSpec}
      y={ySpec}
      margin={m}
      height={height}
      dataTable={withTableOptions(table, dataTable)}
    >
      {grid ? <Grid ticks={yAxis === 'none' ? 'all' : yAxis} /> : null}
      <Marks<D>
        source={data}
        rows={valid}
        hasSize={hasSize}
        tone={tone}
        radius={dotRadius}
        maxRadius={bubbleRadius}
        xDomain={xDom}
        yDomain={yDom}
        target={line}
        targetLabel={targetLabel}
        xLabel={xLabel}
        yLabel={yLabel}
        showXTitle={showXTitle}
        showYTitle={showYTitle}
        names={names}
        fmts={fmts}
      />
      {yAxis === 'none' ? null : <Axis side="left" ticks={yAxis} format={yFmt} />}
      {xAxis === 'none' ? null : <Axis side="bottom" ticks={xAxis} format={xFmt} />}
      {tooltip ? <Tooltip content={tooltipContent(tooltip)} /> : null}
      {children}
    </Chart>
  )
}
