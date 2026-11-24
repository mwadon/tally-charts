import { type CSSProperties, Fragment, type ReactNode, useId, useMemo, useRef } from 'react'
import { resolveAccessor, resolveIds } from '../../core/accessor'
import type { FormatSpec, Formatter } from '../../core/format'
import { toNumber } from '../../core/number'
import { binLevels, levelFor, MAX_BREAKS, sequentialBreaks } from '../../core/thresholds'
import { type TreemapRect, treemapLayout } from '../../core/treemap'
import type { Accessor, Id, SeqLevel, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import type { ChartName } from '../Chart'
import { useFormat, useMessages } from '../ChartsProvider'
import { HEADER_SHADE, NO_DATA, TREEMAP_NAME } from '../messages'
import { Legend } from '../ui/Legend'
import { cx } from '../ui/util'
import { useWidth } from '../useWidth'
import { defaultLabels, headerOf } from './shared'

export interface TreemapTile<D> {
  id: Id
  name: string
  /** Group name; undefined without `group`. */
  group: string | undefined
  value: number
  /** Share of the total, 0–1. */
  share: number
  /** NaN without `shade` or when the row has no shade number. */
  shade: number
  /** Sequential level 1–5; 0 when `shade` is set and the row has no number. */
  level: SeqLevel | 0
  datum: D
}

export type TreemapProps<D> = ChartName & {
  /** One row per tile. */
  data: readonly D[]
  /** Tile name. */
  name: Accessor<D, string>
  /** Tile area. */
  value: Accessor<D, number>
  /** Tile id. Default: the data index. */
  id?: Accessor<D, Id>
  /** Group name. Without it the tiles fill the whole box and no group headers are drawn. */
  group?: Accessor<D, string>
  /** Second measure, shown as the shade of the tile. Requires `breaks`. */
  shade?: Accessor<D, number>
  /** Ascending bin edges of `shade`, as in `Heatmap`: 1–4 edges give 2–5 bins. */
  breaks?: readonly number[]
  /** One label per bin. Default "Under X", "X to Y", …, "Z and up". */
  binLabels?: readonly string[]
  /** Default 'number'. Formats tile values and group totals. */
  format?: FormatSpec
  /** Default 'number'. Formats shade values and the default bin labels. */
  shadeFormat?: FormatSpec
  /** Name of the value in the tooltip and the accessible text. Default: the `value` field name in sentence case, or "Value" for a function. */
  valueLabel?: string
  /** Name of the shade measure in the legend, the tooltip and the accessible text. Default: the `shade` field name in sentence case, or "Shade" for a function. */
  shadeLabel?: string
  /** Base tone of the shades and the legend. Default: a `--ch-seq-base` set on an ancestor, else accent. */
  tone?: Tone
  /** Height of the tile box in px. Default 480. */
  height?: number
  /** Width assumed on the server and in the first client render. Default as in other charts. */
  initialWidth?: number
  /** Legend of the bins above the tiles. Default true; never drawn without `shade`. */
  legend?: boolean
  /** Default true. `false` turns the tooltip off, a function replaces its content. */
  tooltip?: boolean | ((tile: TreemapTile<D>) => ReactNode)
  /** Accessible description, usually the takeaway sentence. */
  description?: string
  activeId?: Id | null
  onActiveChange?: (id: Id | null, tile: TreemapTile<D> | null) => void
  onSelect?: (id: Id, tile: TreemapTile<D>) => void
  /** Rendered instead of the tiles when there is nothing to draw. Default "No data". */
  empty?: ReactNode
  className?: string
  style?: CSSProperties
  chartId?: string
}

interface TreemapGroup<D> {
  name: string | undefined
  total: number
  tiles: TreemapTile<D>[]
  /** Data index per tile, for React keys. */
  index: number[]
}

/** Tile text thresholds in px: the name, then the "value · share" line. */
const NAME_WIDTH = 64
const NAME_HEIGHT = 28
const VALUE_WIDTH = 96
const VALUE_HEIGHT = 48

const px = (n: number) => `${Math.round(n * 100) / 100}px`
const place = (r: TreemapRect): CSSProperties => ({
  left: px(r.x),
  top: px(r.y),
  width: px(r.width),
  height: px(r.height),
})

/**
 * Internal: a share (0–1) as `percent` writes percentage points, one decimal; a share above 0
 * that would print as 0.0% reads "<0.1%".
 */
export function shareText(share: number, percent: Formatter): string {
  const text = percent(share * 100)
  return share > 0 && text === percent(0) ? `<${percent(0.1)}` : text
}

export function Treemap<D>({
  data,
  name,
  value,
  id,
  group,
  shade,
  breaks,
  binLabels,
  format,
  shadeFormat,
  shadeLabel,
  tone,
  height = 480,
  initialWidth = 640,
  legend = true,
  title,
  'aria-labelledby': labelledBy,
  description,
  empty,
  className,
  style,
  chartId,
}: TreemapProps<D>) {
  const { create, percent } = useFormat()
  const messages = useMessages()
  const warn = useMemo(() => createWarner(), [])
  const fmt = useMemo(() => create(format), [create, format])
  const shadeFmt = useMemo(() => create(shadeFormat), [create, shadeFormat])
  const reactId = useId()
  const baseId = `ch-${(chartId ?? reactId).replace(/[^a-zA-Z0-9_-]/g, '')}`
  // Shades need both `shade` and `breaks`; with one of them the chart is drawn without shades.
  const shaded = shade !== undefined && breaks !== undefined
  if (DEV && (shade === undefined) !== (breaks === undefined)) {
    warn(
      'treemap-breaks',
      shade === undefined
        ? 'Treemap `breaks` need `shade`; drawing the tiles without shades.'
        : 'Treemap `shade` needs `breaks`; drawing the tiles without shades.',
    )
  }

  const edges = useMemo(() => {
    const raw = breaks ?? []
    if (DEV && shaded) {
      const sorted = [...new Set(raw.filter(Number.isFinite))].sort((a, b) => a - b)
      if (sorted.length !== raw.length || sorted.some((b, i) => b !== raw[i])) {
        warn(
          'treemap-breaks-order',
          'Treemap `breaks` must be finite and ascending; they were sorted and deduplicated.',
        )
      }
      if (sorted.length > MAX_BREAKS) {
        warn('treemap-bins', 'Treemap shows at most 5 bins; breaks after the fourth were dropped.')
      }
    }
    return sequentialBreaks(raw)
  }, [breaks, shaded, warn])
  const levels = useMemo(() => binLevels(edges.length + 1), [edges])
  const labels = useMemo(() => {
    if (binLabels && binLabels.length === edges.length + 1) return [...binLabels]
    if (DEV && shaded && binLabels) {
      warn('treemap-labels', 'Treemap `binLabels` needs one label per bin; using the defaults.')
    }
    return defaultLabels(edges, shadeFmt, messages)
  }, [binLabels, edges, shadeFmt, messages, shaded, warn])

  const groups = useMemo((): TreemapGroup<D>[] => {
    const getName = resolveAccessor(name)
    const getValue = resolveAccessor(value)
    const getGroup = group === undefined ? undefined : resolveAccessor(group)
    const getShade = shade === undefined ? undefined : resolveAccessor(shade)
    const ids = resolveIds(data, id, warn)
    const byName = new Map<string | undefined, TreemapGroup<D>>()
    let skipped = 0
    let total = 0
    data.forEach((d, i) => {
      const v = toNumber(getValue(d, i))
      if (v === 0) return
      if (!(Number.isFinite(v) && v > 0)) {
        skipped++
        return
      }
      const g = getGroup ? String(getGroup(d, i) ?? '') : undefined
      const s = shaded && getShade ? toNumber(getShade(d, i)) : Number.NaN
      let entry = byName.get(g)
      if (!entry) {
        entry = { name: g, total: 0, tiles: [], index: [] }
        byName.set(g, entry)
      }
      entry.total += v
      total += v
      entry.index.push(i)
      entry.tiles.push({
        id: ids[i] as Id,
        name: String(getName(d, i) ?? ''),
        group: g,
        value: v,
        share: 0,
        shade: s,
        level: shaded ? levelFor(s, edges, levels) : 3,
        datum: d,
      })
    })
    if (DEV && skipped > 0) {
      warn(
        'treemap-value',
        `Treemap skipped ${skipped} ${skipped === 1 ? 'row' : 'rows'} with a missing, non-numeric or negative value.`,
      )
    }
    // Largest first; sort is stable, so ties keep the data order.
    const sorted = [...byName.values()].sort((a, b) => b.total - a.total)
    for (const entry of sorted) {
      const { tiles, index } = entry
      const order = tiles.map((_, k) => k)
      order.sort((a, b) => (tiles[b] as TreemapTile<D>).value - (tiles[a] as TreemapTile<D>).value)
      entry.tiles = order.map((k) => {
        const tile = tiles[k] as TreemapTile<D>
        tile.share = tile.value / total
        return tile
      })
      entry.index = order.map((k) => index[k] as number)
    }
    return sorted
  }, [data, name, value, id, group, shade, shaded, edges, levels, warn])

  const count = groups.reduce((n, g) => n + g.tiles.length, 0)
  const plotRef = useRef<HTMLDivElement>(null)
  const width = useWidth(plotRef, initialWidth, count > 0)
  const boxHeight = Number.isFinite(height) ? Math.max(0, height) : 0
  const layout = useMemo(
    () =>
      treemapLayout(
        groups.map((g) => g.tiles.map((t) => t.value)),
        Math.max(0, width),
        boxHeight,
        group !== undefined,
      ),
    [groups, width, boxHeight, group],
  )

  // Only an explicit tone overrides a --ch-seq-base set on an ancestor (theme.css falls back to
  // accent); the legend inside inherits the root's levels.
  const rootProps = {
    className: cx('ch-treemap', className),
    'data-ch-part': 'treemap',
    'data-ch-seq-tone': tone,
    style,
  }

  if (count === 0) {
    return (
      <div {...rootProps}>
        <div data-ch-part="empty" className="ch-empty">
          {empty ?? messages.noData ?? NO_DATA}
        </div>
      </div>
    )
  }

  return (
    <div {...rootProps}>
      {labelledBy ? null : (
        <span hidden id={`${baseId}-title`}>
          {title || (messages.treemapName ?? TREEMAP_NAME)}
        </span>
      )}
      {description ? (
        <span hidden id={`${baseId}-desc`}>
          {description}
        </span>
      ) : null}
      {legend && shaded ? (
        <div data-ch-part="treemap-legend">
          <span data-ch-part="treemap-legend-title">
            {shadeLabel || headerOf(shade, messages.headerShade ?? HEADER_SHADE)}
          </span>
          <Legend items={labels.map((label, i) => ({ label, level: levels[i] }))} />
        </div>
      ) : null}
      <div ref={plotRef} data-ch-part="treemap-plot" style={{ height: px(boxHeight) }}>
        {groups.map((g, gi) => {
          const placed = layout[gi]
          if (!placed) return null
          return (
            <Fragment key={g.name ?? ''}>
              {placed.header ? (
                <div
                  data-ch-part="treemap-group"
                  style={{
                    left: px(placed.box.x),
                    top: px(placed.box.y),
                    width: px(placed.box.width),
                  }}
                >
                  <span data-ch-part="treemap-group-name">{g.name}</span>
                  <span data-ch-part="treemap-group-total">{fmt(g.total)}</span>
                </div>
              ) : null}
              {g.tiles.map((tile, k) => {
                const r = placed.tiles[k] as TreemapRect
                const named = r.width >= NAME_WIDTH && r.height >= NAME_HEIGHT
                const valued = r.width >= VALUE_WIDTH && r.height >= VALUE_HEIGHT
                return (
                  <div
                    key={g.index[k]}
                    data-ch-part="treemap-tile"
                    data-ch-level={tile.level}
                    style={place(r)}
                  >
                    {named ? <span data-ch-part="treemap-tile-name">{tile.name}</span> : null}
                    {valued ? (
                      <span data-ch-part="treemap-tile-value">
                        {`${fmt(tile.value)} · ${shareText(tile.share, percent)}`}
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
