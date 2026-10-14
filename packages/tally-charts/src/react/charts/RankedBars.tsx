import { useMemo } from 'react'
import { resolveAccessor, resolvePerItem } from '../../core/accessor'
import type { FormatSpec } from '../../core/format'
import { inferLinearDomain } from '../../core/scale'
import type { Accessor, Fill, Id, PerItem, Tone } from '../../core/types'
import { Chart } from '../Chart'
import { useFormat } from '../ChartsProvider'
import { type Margin, useChart } from '../context'
import type { DataTableColumn, DataTableSpec } from '../DataTable'
import { Bars } from '../marks/Bars'
import { RowLabels, type RowLabelsProps } from '../marks/RowLabels'
import { Tooltip } from '../overlays/Tooltip'
import { type ChartPassThroughProps, headerOf, toNumber, userCallbacks } from './shared'

export interface RankedBarsProps<D> extends Omit<ChartPassThroughProps<D>, 'aspectRatio'> {
  data: readonly D[]
  label: Accessor<D, string>
  value: Accessor<D, number>
  /** Row id passed to onSelect and compared with selectedId. Default: the data index. */
  id?: Accessor<D, Id>
  /** Muted text before the value, e.g. "9 jobs". */
  meta?: Accessor<D, string>
  /** 'inline': label | bar | value on one line. 'stacked': label and value above a thin bar. Default 'inline'. */
  layout?: 'inline' | 'stacked'
  /** By size of the value, ignoring its sign. Default 'desc'. */
  sort?: 'desc' | 'asc' | 'none'
  /** Show only the first rows after sorting. */
  limit?: number
  /** Default 'number'. */
  format?: FormatSpec
  /** Domain of bar lengths. Default: zero to the largest magnitude. */
  domain?: readonly [number, number]
  /** Default 'neutral'. A non-neutral tone also colors the value text. */
  tone?: PerItem<D, Tone>
  /** Default 'hatch'. */
  fill?: PerItem<D, Fill>
  /** The highlighted row. Hover and focus stay separate (`activeId`). */
  selectedId?: Id | null
  /** Tone of the selected row's bar and value. Default 'loss'. */
  selectedTone?: Tone
  /** Default 40 (inline) or 52 (stacked). */
  rowHeight?: number
  /** Default 12 (inline) or 6 (stacked). */
  barSize?: number
  /** Inline label column width in px (default 140). In the stacked layout, a max label width. */
  labelWidth?: number
  /** Inline value column width in px. Default 72. */
  valueWidth?: number
  /** Meta column width in px. Default 64. */
  metaWidth?: number
  /** Faint track behind each bar. Default true. */
  track?: boolean
  /** Hidden data table for screen readers. Default true. */
  dataTable?: boolean
  /** Default false: the values are already on screen. */
  tooltip?: boolean
}

interface RankedRow<D> {
  key: string
  rowId: Id
  datum: D
  index: number
  label: string
  meta: string
  value: number
  magnitude: number
  text: string
  tone: Tone
  fill: Fill
  selected: boolean
}

/** Horizontal padding inside each row, in px. */
const PAD = 12
/** Stacked layout: space between the row edges and the text above / the bar below, in px. */
const STACK_PAD = 8
/** Stacked layout: smallest gap between a label and the value or meta text, in px. */
const TEXT_GAP = 8

/**
 * Stacked rows have no label column, so the label is cut to the width the chart has left
 * beside the value (and meta) text. The width is only known inside <Chart>.
 */
function FittedLabels<D>({ reserve, maxWidth, ...props }: RowLabelsProps<D> & { reserve: number }) {
  const ctx = useChart('RankedBars')
  const fit = Math.max(0, ctx.width - reserve)
  return (
    <RowLabels<D> {...props} maxWidth={maxWidth === undefined ? fit : Math.min(maxWidth, fit)} />
  )
}

function SelectedRow({ rowKey }: { rowKey: string | null }) {
  const ctx = useChart('RankedBars')
  if (rowKey === null || ctx.y.kind !== 'band') return null
  const start = ctx.y.scale(rowKey)
  if (start === undefined) return null
  return (
    <rect
      data-ch-part="row-highlight"
      x={-ctx.margin.left}
      y={start}
      width={ctx.width}
      height={ctx.y.scale.bandwidth()}
      rx={12}
    />
  )
}

export function RankedBars<D>({
  data,
  label,
  value,
  id,
  meta,
  layout = 'inline',
  sort = 'desc',
  limit,
  format,
  domain,
  tone,
  fill,
  selectedId,
  selectedTone = 'loss',
  rowHeight,
  barSize,
  labelWidth,
  valueWidth = 72,
  metaWidth = 64,
  track = true,
  dataTable = true,
  tooltip = false,
  margin,
  height,
  children,
  onSelect,
  onActiveChange,
  ...chart
}: RankedBarsProps<D>) {
  const { create } = useFormat()
  const fmt = useMemo(() => create(format), [create, format])
  const stacked = layout === 'stacked'
  const rowH = rowHeight ?? (stacked ? 52 : 40)
  const size = barSize ?? (stacked ? 6 : 12)
  const labelW = labelWidth ?? (stacked ? 0 : 140)

  const rows = useMemo(() => {
    const getLabel = resolveAccessor(label)
    const getValue = resolveAccessor(value)
    const getId = id ? resolveAccessor(id) : undefined
    const getMeta = meta ? resolveAccessor(meta) : undefined
    const toneOf = resolvePerItem<D, Tone>(tone ?? 'neutral')
    const fillOf = resolvePerItem<D, Fill>(fill ?? 'hatch')
    const all = data.map((d, i): RankedRow<D> => {
      const v = toNumber(getValue(d, i))
      const rowId = getId ? getId(d, i) : i
      const selected = selectedId !== undefined && selectedId !== null && rowId === selectedId
      return {
        key: String(i),
        rowId,
        datum: d,
        index: i,
        label: String(getLabel(d, i) ?? ''),
        meta: getMeta ? String(getMeta(d, i) ?? '') : '',
        value: v,
        magnitude: Math.abs(v),
        text: fmt(v),
        tone: selected ? selectedTone : toneOf(d, i, data),
        fill: fillOf(d, i, data),
        selected,
      }
    })
    if (sort !== 'none') {
      // Missing values go last; Array.prototype.sort is stable, so ties keep data order.
      all.sort((a, b) => {
        const fa = Number.isFinite(a.magnitude)
        const fb = Number.isFinite(b.magnitude)
        if (fa !== fb) return fa ? -1 : 1
        if (!fa) return 0
        return sort === 'asc' ? a.magnitude - b.magnitude : b.magnitude - a.magnitude
      })
    }
    return limit === undefined ? all : all.slice(0, Math.max(0, limit))
  }, [data, label, value, id, meta, tone, fill, selectedId, selectedTone, sort, limit, fmt])

  const resolvedDomain = domain ?? inferLinearDomain(rows.map((r) => r.magnitude))
  const metaSpace = meta ? metaWidth : 0
  const m: Margin = stacked
    ? { top: 0, bottom: 0, left: PAD, right: PAD, ...margin }
    : { top: 0, bottom: 0, left: labelW, right: valueWidth + metaSpace, ...margin }
  const position = stacked ? 'above' : 'middle'
  // Stacked: the label and value sit inside the row's top padding, the bar above its bottom one.
  const textShift = stacked ? STACK_PAD : 0
  const labelReserve = 2 * PAD + (meta ? 2 * metaWidth : valueWidth) + TEXT_GAP
  const selectedKey = rows.find((r) => r.selected)?.key ?? null
  const valueTone = (r: RankedRow<D>): Tone | undefined =>
    r.selected ? selectedTone : r.tone === 'neutral' ? undefined : r.tone

  let table: DataTableSpec<RankedRow<D>> | undefined
  if (dataTable) {
    const columns: DataTableColumn<RankedRow<D>>[] = [
      { header: headerOf(label, 'Item'), value: (r) => r.label },
      { header: headerOf(value, 'Value'), value: (r) => r.text },
    ]
    if (meta) columns.push({ header: headerOf(meta, 'Details'), value: (r) => r.meta })
    table = { columns }
  }

  return (
    <Chart<RankedRow<D>>
      {...chart}
      {...userCallbacks(onSelect, onActiveChange)}
      data={rows}
      x={{ field: 'magnitude', domain: resolvedDomain }}
      y={{ type: 'band', field: 'key', padding: 0 }}
      margin={m}
      height={height ?? Math.max(1, rows.length) * rowH + m.top + m.bottom}
      dataTable={table}
    >
      <SelectedRow rowKey={selectedKey} />
      <Bars<RankedRow<D>>
        data={rows}
        x="magnitude"
        id="rowId"
        label="label"
        tone={(r) => r.tone}
        fill={(r) => r.fill}
        size={size}
        align={stacked ? 'end' : 'center'}
        offset={stacked ? -STACK_PAD : undefined}
        radius={size / 2}
        track={track}
        format={format}
        ariaLabel={(r) => (r.meta ? `${r.label}, ${r.text}, ${r.meta}` : `${r.label}, ${r.text}`)}
        tooltip={(r) => [{ value: r.label }, { value: r.text, tone: valueTone(r) }]}
      />
      <g data-ch-part="row-text" transform={textShift ? `translate(0 ${textShift})` : undefined}>
        {stacked ? (
          <FittedLabels<RankedRow<D>>
            text="label"
            position={position}
            inset={PAD}
            reserve={labelReserve}
            maxWidth={labelW > 0 ? labelW - PAD : undefined}
          />
        ) : (
          <RowLabels<RankedRow<D>>
            text="label"
            position={position}
            inset={PAD}
            maxWidth={labelW > 0 ? labelW - PAD : undefined}
          />
        )}
        {meta ? (
          <RowLabels<RankedRow<D>>
            side="right"
            text="meta"
            muted
            position={position}
            inset={stacked ? PAD + metaWidth : PAD + valueWidth}
          />
        ) : null}
        <RowLabels<RankedRow<D>>
          side="right"
          text="text"
          position={position}
          inset={PAD}
          tone={valueTone}
        />
      </g>
      {tooltip ? <Tooltip /> : null}
      {children}
    </Chart>
  )
}
