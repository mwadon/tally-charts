import { resolveAccessor } from '../../core/accessor'
import type { FormatSpec } from '../../core/format'
import type { BandScaleSpec, LinearScaleSpec } from '../../core/scale'
import type { TickSpec } from '../../core/ticks'
import type { Accessor, Fill, Id, PerItem, Tone } from '../../core/types'
import { Chart, type ChartName } from '../Chart'
import { useFormat, useMessages } from '../ChartsProvider'
import type { Margin } from '../context'
import type { DataTableSpec } from '../DataTable'
import { Axis, type AxisFormat } from '../marks/Axis'
import { Bars } from '../marks/Bars'
import { Target } from '../marks/Target'
import { ValueLabel } from '../marks/ValueLabel'
import { HEADER_CATEGORY, HEADER_VALUE } from '../messages'
import { Tooltip } from '../overlays/Tooltip'
import {
  type ChartPassThroughProps,
  type ChartTooltip,
  type DataTableOptions,
  headerOf,
  toNumber,
  tooltipContent,
  withTableOptions,
} from './shared'

export type BarChartProps<D> = ChartName &
  ChartPassThroughProps<D> & {
    data: readonly D[]
    /** Category field: the band axis in both orientations. */
    x: Accessor<D, string | number>
    /** Value field. */
    y: Accessor<D, number>
    id?: Accessor<D, Id>
    /** Category label for tooltips, announcements and the data table. Defaults to `x`. */
    label?: Accessor<D, string>
    /** Default 'vertical'. */
    orientation?: 'vertical' | 'horizontal'
    /** Value domain. Inferred from the data (including zero) when omitted. */
    domain?: readonly [number, number]
    /** A target value, optionally with a label. */
    target?: number | { value: number; label?: string }
    /** Which bars get a value label: 'max' is the highest one. Default 'last'. */
    valueLabel?: 'last' | 'all' | 'max' | 'none'
    /**
     * 'pill' draws value labels on a filled rounded rectangle. On the tallest bar it sits in the
     * top margin, which fits at the default `margin.top` of 24; a smaller one clips it. Default 'text'.
     */
    valueLabelVariant?: 'text' | 'pill'
    /** Format for value labels. Defaults to `format`. */
    valueFormat?: FormatSpec
    /** Format for tooltips, announcements and the data table. Default 'number'. */
    format?: FormatSpec
    /** Category axis ticks, or 'none'. Default 'ends'. */
    axis?: TickSpec | 'none'
    /**
     * Category axis labels: a function of the category. Number presets and date formats don't apply
     * to categories and are ignored with a development warning. Default: the category itself.
     */
    axisFormat?: AxisFormat
    /** Default 'accent'. */
    tone?: PerItem<D, Tone>
    /** Default: history 'hatch-fade', last bar 'solid'. */
    fill?: PerItem<D, Fill>
    /** Inner band padding, 0–1. Default 0.35. */
    padding?: number
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

const VERTICAL_MARGIN: Margin = { top: 24, right: 0, bottom: 28, left: 0 }
const HORIZONTAL_MARGIN: Margin = { top: 8, right: 48, bottom: 8, left: 96 }
const ROW_HEIGHT = 32

const historyThenSolid = (_: unknown, i: number, all: readonly unknown[]): Fill =>
  i === all.length - 1 ? 'solid' : 'hatch-fade'

export function BarChart<D>({
  data,
  x,
  y,
  id,
  label,
  orientation = 'vertical',
  domain,
  target,
  valueLabel = 'last',
  valueLabelVariant,
  valueFormat,
  format,
  axis = 'ends',
  axisFormat,
  tone = 'accent',
  fill = historyThenSolid,
  padding = 0.35,
  dataTable = true,
  tooltip = true,
  margin,
  height,
  children,
  ...chart
}: BarChartProps<D>) {
  const { create } = useFormat()
  const messages = useMessages()
  const vertical = orientation === 'vertical'
  const band: BandScaleSpec<D> = { type: 'band', field: x, padding }
  const linear: LinearScaleSpec<D> = { field: y, domain }
  const m: Margin = { ...(vertical ? VERTICAL_MARGIN : HORIZONTAL_MARGIN), ...margin }
  const autoHeight =
    !vertical && chart.aspectRatio === undefined
      ? Math.max(1, data.length) * ROW_HEIGHT + m.top + m.bottom
      : undefined
  const targetSpec = typeof target === 'number' ? { value: target } : target

  let table: DataTableSpec<D> | undefined
  if (dataTable) {
    const getCategory = resolveAccessor(x)
    const getValue = resolveAccessor(y)
    const getLabel = label ? resolveAccessor(label) : undefined
    const formatValue = create(format)
    table = {
      columns: [
        {
          header: headerOf(x, messages.headerCategory ?? HEADER_CATEGORY),
          value: (d, i) => String((getLabel ? getLabel(d, i) : getCategory(d, i)) ?? ''),
        },
        {
          header: headerOf(y, messages.headerValue ?? HEADER_VALUE),
          value: (d, i) => formatValue(toNumber(getValue(d, i))),
        },
      ],
    }
  }

  return (
    <Chart<D>
      {...chart}
      data={data}
      x={vertical ? band : linear}
      y={vertical ? linear : band}
      margin={m}
      height={height ?? autoHeight}
      dataTable={withTableOptions(table, dataTable)}
    >
      {targetSpec ? (
        <Target
          {...(vertical ? { y: targetSpec.value } : { x: targetSpec.value })}
          label={targetSpec.label}
        />
      ) : null}
      <Bars<D> id={id} label={label} tone={tone} fill={fill} format={format} />
      {valueLabel === 'none' ? null : (
        <ValueLabel<D> at={valueLabel} variant={valueLabelVariant} format={valueFormat ?? format} />
      )}
      {axis === 'none' ? null : (
        <Axis side={vertical ? 'bottom' : 'left'} ticks={axis} format={axisFormat} />
      )}
      {tooltip ? <Tooltip content={tooltipContent(tooltip, false)} /> : null}
      {children}
    </Chart>
  )
}
