// biome-ignore-all lint/a11y/useSemanticElements: tiles are ARIA options placed absolutely; <select> can't hold them
// biome-ignore-all lint/a11y/useFocusableInteractive: one roving tab stop on the options (APG listbox); the listbox and groups are not focusable
import {
  type CSSProperties,
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { resolveAccessor, resolveIds } from '../../core/accessor'
import type { FormatSpec, Formatter } from '../../core/format'
import { toNumber } from '../../core/number'
import {
  binLevels,
  breaksInOrder,
  distinctBreaks,
  levelFor,
  MAX_BREAKS,
  sequentialBreaks,
} from '../../core/thresholds'
import {
  type TreemapDirection,
  type TreemapRect,
  treemapLayout,
  treemapNeighbour,
} from '../../core/treemap'
import type { Accessor, Id, SeqLevel, Tone } from '../../core/types'
import { createWarner, DEV } from '../../core/warn'
import type { ChartName } from '../Chart'
import { useFormat, useMessages } from '../ChartsProvider'
import { HEADER_SHADE, NO_DATA, OF_TOTAL, TREEMAP_NAME } from '../messages'
import { Legend } from '../ui/Legend'
import { TooltipPill } from '../ui/TooltipPill'
import { cx } from '../ui/util'
import { useIsoLayoutEffect } from '../useIsoLayoutEffect'
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
  /** NaN without `shade`, without `breaks`, or when the row has no shade number. */
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
}

/** Tile text thresholds in px: the name, then the "value · share" line. */
const NAME_WIDTH = 64
const NAME_HEIGHT = 28
const VALUE_WIDTH = 96
const VALUE_HEIGHT = 48

/** Gap between a tile and its tooltip in px. */
const TOOLTIP_GAP = 6

const DIRECTIONS: Partial<Record<string, TreemapDirection>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

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

/**
 * Where a tooltip of `size` goes for tile `r` in a box `width` × `height`: centred on the tile and
 * inside the box horizontally; above the tile when that fits, else below it, else inside its top.
 */
function tooltipAt(
  r: TreemapRect,
  size: { width: number; height: number },
  width: number,
  height: number,
): { left: number; top: number; placement: 'above' | 'below' | 'inside' } {
  const left = Math.min(
    Math.max(0, r.x + r.width / 2 - size.width / 2),
    Math.max(0, width - size.width),
  )
  const above = r.y - size.height - TOOLTIP_GAP
  if (above >= 0) return { left, top: above, placement: 'above' }
  const below = r.y + r.height + TOOLTIP_GAP
  if (below + size.height <= height) return { left, top: below, placement: 'below' }
  return { left, top: r.y + TOOLTIP_GAP, placement: 'inside' }
}

/**
 * Many parts of one total as tiles whose area is the value, largest first, optionally in named
 * groups and shaded by a second measure in bins. The tiles are HTML: a `listbox` of `option`s
 * with one roving tab stop and arrow keys between neighbouring tiles, each option named by its
 * name, value, share and shade, and a tooltip pill for the active tile.
 */
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
  tooltip = true,
  title,
  'aria-labelledby': labelledBy,
  description,
  activeId,
  onActiveChange,
  onSelect,
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
  const titleId = `${baseId}-title`
  const descId = `${baseId}-desc`
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
    // Expressions, not a block with declarations, so production builds drop the messages.
    DEV &&
      shaded &&
      !breaksInOrder(raw) &&
      warn(
        'treemap-breaks-order',
        'Treemap `breaks` must be finite and ascending; they were sorted and deduplicated.',
      )
    DEV &&
      shaded &&
      distinctBreaks(raw) > MAX_BREAKS &&
      warn('treemap-bins', 'Treemap shows at most 5 bins; breaks after the fourth were dropped.')
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
        entry = { name: g, total: 0, tiles: [] }
        byName.set(g, entry)
      }
      entry.total += v
      total += v
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
      entry.tiles.sort((a, b) => b.value - a.value)
      for (const tile of entry.tiles) tile.share = tile.value / total
    }
    return sorted
  }, [data, name, value, id, group, shade, shaded, edges, levels, warn])

  const count = groups.reduce((n, g) => n + g.tiles.length, 0)
  const plotRef = useRef<HTMLDivElement>(null)
  const hasTiles = count > 0
  const width = useWidth(plotRef, initialWidth, hasTiles)
  // False on the server and in the first client render: theme.css clips the plot until then, so
  // tiles laid out at `initialWidth` cannot widen a narrower page (nor without JavaScript). Set
  // after useWidth has measured, in the same layout phase; unclipped afterwards, so neither the
  // ring of a tile at the edge nor the tooltip is cut.
  const [measured, setMeasured] = useState(false)
  useIsoLayoutEffect(() => {
    if (hasTiles) setMeasured(true)
  }, [hasTiles])
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

  // Tiles and their rects in DOM order (largest group first, largest tile first), which is also
  // the order of `treemapNeighbour`'s indices and of Home / End.
  const tileList = useMemo(() => groups.flatMap((g) => g.tiles), [groups])
  const rects = useMemo(() => layout.flatMap((g) => g.tiles), [layout])
  const indexById = useMemo(() => new Map(tileList.map((t, i) => [t.id, i])), [tileList])

  const [innerActive, setInnerActive] = useState<Id | null>(null)
  const controlled = activeId !== undefined
  // An id that is not (or no longer) in the data activates nothing.
  const known = (tileId: Id | null | undefined): Id | null =>
    tileId != null && indexById.has(tileId) ? tileId : null
  const active = known(controlled ? activeId : innerActive)
  // Kept in step with renders; a second call in the same event must see the first one's id.
  const activeRef = useRef(active)
  activeRef.current = active
  const activeProp = useRef(known(activeId))
  activeProp.current = known(activeId)
  const [focusId, setFocusId] = useState<Id | null>(null)
  // The tab stop: the last focused tile while it exists, else the first.
  const tabId = known(focusId) ?? tileList[0]?.id
  const refs = useRef(new Map<Id, HTMLElement>())
  // How the focused tile got focus, as :focus-visible would tell (and jsdom cannot): a focus that
  // follows a pointerdown on a tile is the pointer's; any other focus, and a key on a tile, is
  // the keyboard's. Leaving the box returns to the focused tile only for keyboard focus, and not
  // after Escape dismissed it, until the focus moves.
  const pointerDown = useRef(false)
  const keyboardFocus = useRef(false)
  const dismissed = useRef(false)

  const setActive = (next: Id | null) => {
    if (next === activeRef.current) return
    activeRef.current = next
    if (controlled) {
      // The parent decides. Drop the optimistic value once the event is over, so a parent that
      // ignores the change doesn't leave the ref stale.
      queueMicrotask(() => {
        activeRef.current = activeProp.current
      })
    } else {
      setInnerActive(next)
    }
    const tile = next === null ? undefined : tileList[indexById.get(next) ?? -1]
    onActiveChange?.(tile ? tile.id : null, tile ?? null)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>, index: number) => {
    const tile = tileList[index] as TreemapTile<D>
    pointerDown.current = false
    keyboardFocus.current = true
    if (event.key === 'Enter' || event.key === ' ') {
      // Space must not scroll the page under the focused tile, with or without onSelect.
      event.preventDefault()
      onSelect?.(tile.id, tile)
      return
    }
    if (event.key === 'Escape') {
      dismissed.current = true
      // Only handled when it clears something, so an enclosing dialog can still close.
      if (activeRef.current !== null) {
        event.preventDefault()
        setActive(null)
      }
      return
    }
    const direction = DIRECTIONS[event.key]
    const jump = event.key === 'Home' ? 0 : event.key === 'End' ? tileList.length - 1 : -1
    if (!direction && jump < 0) return
    // Modified keys stay the browser's (Alt+arrows navigate); Ctrl/Cmd+Home and End still jump.
    if (event.altKey || (direction && (event.ctrlKey || event.metaKey))) return
    event.preventDefault()
    const to = direction ? treemapNeighbour(rects, index, direction) : jump
    const next = tileList[to]
    if (!next || to === index) return
    setFocusId(next.id)
    refs.current.get(next.id)?.focus()
  }

  const ofTotal = messages.ofTotal ?? OF_TOTAL
  const shadeName = shadeLabel || headerOf(shade, messages.headerShade ?? HEADER_SHADE)
  const shareOf = (tile: TreemapTile<D>) => `${shareText(tile.share, percent)} ${ofTotal}`
  /** Name, value, share and, with a shade number, the shade and its bin: the option's name. */
  const tileLabel = (tile: TreemapTile<D>) => {
    const parts = [tile.name, fmt(tile.value), shareOf(tile)]
    // A finite shade means shades are on and the tile has a level from 1 to 5.
    if (Number.isFinite(tile.shade) && tile.level !== 0) {
      // "Margin" reads "margin" mid-sentence; an acronym ("NPS") stays as written.
      const second = shadeName.charAt(1)
      const lower =
        second !== second.toLowerCase()
          ? shadeName
          : shadeName.charAt(0).toLowerCase() + shadeName.slice(1)
      parts.push(`${lower} ${shadeFmt(tile.shade)}`, labels[levels.indexOf(tile.level)] ?? '')
    }
    return parts.join(', ')
  }

  const activeIndex = active === null ? -1 : (indexById.get(active) ?? -1)
  const tipTile = tooltip === false ? undefined : tileList[activeIndex]
  const tipRect = rects[activeIndex]
  const tipRef = useRef<HTMLDivElement>(null)
  const [tipSize, setTipSize] = useState<{ width: number; height: number } | null>(null)
  // Measure after every render so placement uses the real size before paint.
  useIsoLayoutEffect(() => {
    const el = tipRef.current
    if (!el) return
    const { width: w, height: h } = el.getBoundingClientRect()
    setTipSize((prev) =>
      prev && prev.width === w && prev.height === h ? prev : { width: w, height: h },
    )
  })
  // A tooltip opened by hover closes on Escape wherever focus is (WCAG 1.4.13), as the pill does
  // in charts; a focused tile handles its own Escape.
  const [byPointer, setByPointer] = useState(false)
  const hovering = byPointer && active !== null
  const setActiveLatest = useRef(setActive)
  setActiveLatest.current = setActive
  useEffect(() => {
    if (!hovering) return
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || plotRef.current?.contains(document.activeElement)) return
      setActiveLatest.current(null)
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [hovering])

  const plotWidth = Math.max(0, width)
  const tipAt = tipSize && tipRect ? tooltipAt(tipRect, tipSize, plotWidth, boxHeight) : null

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

  const starts = groups.map((_, gi) => groups.slice(0, gi).reduce((n, g) => n + g.tiles.length, 0))

  return (
    <div {...rootProps}>
      {labelledBy ? null : (
        <span hidden id={titleId}>
          {title || (messages.treemapName ?? TREEMAP_NAME)}
        </span>
      )}
      {description ? (
        <span hidden id={descId}>
          {description}
        </span>
      ) : null}
      {legend && shaded ? (
        <div data-ch-part="treemap-legend">
          <span data-ch-part="treemap-legend-title">{shadeName}</span>
          <Legend items={labels.map((label, i) => ({ label, level: levels[i] }))} />
        </div>
      ) : null}
      <div
        ref={plotRef}
        role="listbox"
        data-ch-part="treemap-plot"
        aria-labelledby={labelledBy ?? titleId}
        aria-describedby={description ? descId : undefined}
        data-ch-unmeasured={measured ? undefined : 'true'}
        style={{ height: px(boxHeight) }}
        onPointerLeave={(event) => {
          // Keyboard focus keeps its tile active (unless Escape dismissed it); the pointer only
          // clears what it activated, and a tile focused by a click is the pointer's.
          const focused =
            event.currentTarget.contains(document.activeElement) &&
            keyboardFocus.current &&
            !dismissed.current
          setByPointer(false)
          setActive(focused ? known(focusId) : null)
        }}
        onBlur={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) return
          pointerDown.current = false
          setActive(null)
        }}
      >
        {groups.map((g, gi) => {
          const placed = layout[gi]
          if (!placed) return null
          // A named group is a role=group labelled by its header; rows without a group name (and
          // a chart without `group`) put their tiles straight into the listbox. An unnamed group
          // still gets the layout's header band, left empty.
          const named = group !== undefined && g.name !== ''
          const nameId = `${baseId}-g${gi}`
          const header =
            named && placed.header ? (
              <div
                data-ch-part="treemap-group"
                style={{
                  left: px(placed.box.x),
                  top: px(placed.box.y),
                  width: px(placed.box.width),
                }}
              >
                <span id={nameId} data-ch-part="treemap-group-name">
                  {g.name}
                </span>
                <span id={`${nameId}-total`} data-ch-part="treemap-group-total">
                  {fmt(g.total)}
                </span>
              </div>
            ) : null
          const tileNodes = g.tiles.map((tile, k) => {
            const r = placed.tiles[k] as TreemapRect
            const index = (starts[gi] as number) + k
            const textName = r.width >= NAME_WIDTH && r.height >= NAME_HEIGHT
            const valued = r.width >= VALUE_WIDTH && r.height >= VALUE_HEIGHT
            return (
              <div
                key={`${typeof tile.id}:${tile.id}`}
                ref={(el) => {
                  if (el) refs.current.set(tile.id, el)
                  else refs.current.delete(tile.id)
                }}
                role="option"
                tabIndex={tile.id === tabId ? 0 : -1}
                aria-label={tileLabel(tile)}
                data-ch-part="treemap-tile"
                data-ch-level={tile.level}
                data-ch-active={tile.id === active ? 'true' : undefined}
                data-ch-selectable={onSelect ? 'true' : undefined}
                style={place(r)}
                onFocus={() => {
                  keyboardFocus.current = !pointerDown.current
                  pointerDown.current = false
                  dismissed.current = false
                  setByPointer(false)
                  setFocusId(tile.id)
                  setActive(tile.id)
                }}
                onPointerEnter={() => {
                  setByPointer(true)
                  setActive(tile.id)
                }}
                onPointerDown={() => {
                  pointerDown.current = true
                }}
                onClick={() => onSelect?.(tile.id, tile)}
                onKeyDown={(event) => onKeyDown(event, index)}
              >
                {textName ? (
                  <span aria-hidden="true" data-ch-part="treemap-tile-name">
                    {tile.name}
                  </span>
                ) : null}
                {valued ? (
                  <span aria-hidden="true" data-ch-part="treemap-tile-value">
                    {`${fmt(tile.value)} · ${shareText(tile.share, percent)}`}
                  </span>
                ) : null}
              </div>
            )
          })
          if (!named) return <Fragment key={g.name ?? ''}>{tileNodes}</Fragment>
          return (
            <div
              key={g.name}
              role="group"
              {...(header
                ? { 'aria-labelledby': `${nameId} ${nameId}-total` }
                : { 'aria-label': `${g.name} ${fmt(g.total)}` })}
            >
              {header}
              {tileNodes}
            </div>
          )
        })}
        {tipTile ? (
          // The tile's accessible name says the same; the pill is for the eye only.
          <div
            ref={tipRef}
            aria-hidden="true"
            className="ch-tooltip"
            data-ch-part="treemap-tooltip"
            data-ch-placement={tipAt?.placement}
            style={{
              left: tipAt ? px(tipAt.left) : 0,
              top: tipAt ? px(tipAt.top) : 0,
              maxWidth: px(plotWidth),
              visibility: tipAt ? undefined : 'hidden',
            }}
          >
            {typeof tooltip === 'function' ? (
              tooltip(tipTile)
            ) : (
              <TooltipPill
                segments={[
                  { value: tipTile.name },
                  { value: fmt(tipTile.value) },
                  { value: shareOf(tipTile) },
                  ...(Number.isFinite(tipTile.shade)
                    ? [{ value: `${shadeName} ${shadeFmt(tipTile.shade)}` }]
                    : []),
                ]}
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
