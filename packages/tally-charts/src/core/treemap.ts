export interface TreemapRect {
  x: number
  y: number
  width: number
  height: number
}

export interface TreemapGroupLayout {
  /** The group's box, header included. */
  box: TreemapRect
  /** True when the box is at least 48 px high and headers were asked for. */
  header: boolean
  /** One rect per value of the group, in input order. */
  tiles: TreemapRect[]
}

export type TreemapDirection = 'up' | 'down' | 'left' | 'right'

const HEADER = 24
const MIN_HEADER_BOX = 48
const GROUP_INSET = 4
const TILE_INSET = 1
const TOLERANCE = 0.5

const finite = (n: number) => (Number.isFinite(n) ? n : 0)
const empty = (box: TreemapRect): TreemapRect => ({
  x: finite(box.x),
  y: finite(box.y),
  width: 0,
  height: 0,
})
const usable = (v: number) => Number.isFinite(v) && v > 0

function inset(r: TreemapRect, by: number): TreemapRect {
  return {
    x: r.x + by,
    y: r.y + by,
    width: Math.max(0, r.width - 2 * by),
    height: Math.max(0, r.height - 2 * by),
  }
}

/** Squarified layout of `values` (callers pass them largest first) in `box`; one rect per value, in input order. */
export function squarify(values: readonly number[], box: TreemapRect): TreemapRect[] {
  const out: TreemapRect[] = values.map(() => empty(box))
  const total = values.reduce((s, v) => (usable(v) ? s + v : s), 0)
  if (
    !(box.width > 0 && box.height > 0) ||
    !Number.isFinite(box.width + box.height) ||
    !(total > 0)
  ) {
    return out
  }
  const scale = (box.width * box.height) / total
  let rest = values.flatMap((v, index) => (usable(v) ? [{ index, area: v * scale }] : []))
  let { x, y, width, height } = box
  while (rest.length > 0) {
    const side = Math.min(width, height)
    const worst = (areas: number[], sum: number) => {
      const s2 = side * side
      return Math.max(
        (s2 * Math.max(...areas)) / (sum * sum),
        (sum * sum) / (s2 * Math.min(...areas)),
      )
    }
    let count = 1
    let sum = rest[0]!.area
    let areas = [sum]
    while (count < rest.length) {
      const next = rest[count]!.area
      const grown = [...areas, next]
      if (worst(grown, sum + next) > worst(areas, sum)) break
      areas = grown
      sum += next
      count++
    }
    const thick = sum / side
    const wide = width >= height
    let offset = 0
    for (const item of rest.slice(0, count)) {
      const length = item.area / thick
      out[item.index] = wide
        ? { x, y: y + offset, width: thick, height: length }
        : { x: x + offset, y, width: length, height: thick }
      offset += length
    }
    if (wide) {
      x += thick
      width -= thick
    } else {
      y += thick
      height -= thick
    }
    rest = rest.slice(count)
  }
  return out
}

/**
 * Two-pass layout: groups by their totals in `width` × `height`, then each group's tiles under
 * its header. `groups[i]` are the values of group i, largest first; groups are passed largest
 * total first. `headers: false` (no `group` prop) never reserves a header.
 */
export function treemapLayout(
  groups: readonly (readonly number[])[],
  width: number,
  height: number,
  headers: boolean,
): TreemapGroupLayout[] {
  const totals = groups.map((g) => g.reduce((s, v) => (usable(v) ? s + v : s), 0))
  const live = width > 0 && height > 0
  const boxes = squarify(totals, {
    x: -GROUP_INSET,
    y: -GROUP_INSET,
    width: live ? width + 2 * GROUP_INSET : 0,
    height: live ? height + 2 * GROUP_INSET : 0,
  })
  return groups.map((values, i) => {
    const raw = boxes[i]!
    const box =
      raw.width > 0 && raw.height > 0
        ? inset(raw, GROUP_INSET)
        : empty({ x: 0, y: 0, width: 0, height: 0 })
    const header = headers && box.height >= MIN_HEADER_BOX
    const top = header ? HEADER : 0
    const tiles = squarify(values, {
      x: box.x - TILE_INSET,
      y: box.y + top - TILE_INSET,
      width: box.width + 2 * TILE_INSET,
      height: Math.max(0, box.height - top) + 2 * TILE_INSET,
    })
    return {
      box,
      header,
      tiles: tiles.map((t) =>
        t.width > 0 && t.height > 0
          ? inset(t, TILE_INSET)
          : { x: t.x, y: t.y, width: 0, height: 0 },
      ),
    }
  })
}

/** Index of the tile an arrow key moves to from `from`, or -1. */
export function treemapNeighbour(
  rects: readonly TreemapRect[],
  from: number,
  direction: TreemapDirection,
): number {
  const cur = rects[from]
  if (!cur) return -1
  const horizontal = direction === 'left' || direction === 'right'
  // a is the axis of travel, b the other one.
  const span = (r: TreemapRect) =>
    horizontal
      ? { a0: r.x, a1: r.x + r.width, b0: r.y, b1: r.y + r.height }
      : { a0: r.y, a1: r.y + r.height, b0: r.x, b1: r.x + r.width }
  const forward = direction === 'right' || direction === 'down'
  const c = span(cur)
  const centre = (c.b0 + c.b1) / 2
  let best = -1
  let bestEdge = Infinity
  let bestCross = Infinity
  rects.forEach((r, i) => {
    if (i === from) return
    const s = span(r)
    const edge = forward ? s.a0 - c.a1 : c.a0 - s.a1
    if (edge < -TOLERANCE) return
    if (Math.min(c.b1, s.b1) - Math.max(c.b0, s.b0) <= TOLERANCE) return
    const cross = Math.abs((s.b0 + s.b1) / 2 - centre)
    if (edge < bestEdge || (edge === bestEdge && cross < bestCross)) {
      best = i
      bestEdge = edge
      bestCross = cross
    }
  })
  return best
}
