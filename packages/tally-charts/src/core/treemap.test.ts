import { describe, expect, it } from 'vitest'
import { squarify, type TreemapRect, treemapLayout, treemapNeighbour } from './treemap'

const area = (r: TreemapRect) => r.width * r.height
const sum = (xs: readonly number[]) => xs.reduce((s, v) => s + v, 0)

function expectTiling(values: number[], box: TreemapRect) {
  const rects = squarify(values, box)
  expect(rects).toHaveLength(values.length)
  const k = (box.width * box.height) / sum(values)
  rects.forEach((r, i) => {
    expect(area(r)).toBeCloseTo(values[i]! * k, 6)
    expect(r.x).toBeGreaterThanOrEqual(box.x - 1e-6)
    expect(r.y).toBeGreaterThanOrEqual(box.y - 1e-6)
    expect(r.x + r.width).toBeLessThanOrEqual(box.x + box.width + 1e-6)
    expect(r.y + r.height).toBeLessThanOrEqual(box.y + box.height + 1e-6)
  })
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i]!
      const b = rects[j]!
      const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
      const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
      expect(w > 1e-6 && h > 1e-6).toBe(false)
    }
  }
}

describe('squarify', () => {
  it('gives the paper layout for [6, 6, 4, 3, 2, 2, 1] in 6 x 4', () => {
    const rects = squarify([6, 6, 4, 3, 2, 2, 1], { x: 0, y: 0, width: 6, height: 4 })
    expect(rects[0]).toEqual({ x: 0, y: 0, width: 3, height: 2 })
    expect(rects[1]).toEqual({ x: 0, y: 2, width: 3, height: 2 })
    const values = [6, 6, 4, 3, 2, 2, 1]
    rects.forEach((r, i) => {
      expect(area(r)).toBeCloseTo(values[i]!, 9)
    })
    expect(sum(rects.map(area))).toBeCloseTo(24, 9)
  })

  it.each([
    ['wide', { x: 0, y: 0, width: 1024, height: 480 }],
    ['tall', { x: 0, y: 0, width: 320, height: 480 }],
    ['square', { x: 10, y: 20, width: 300, height: 300 }],
  ])('tiles a %s box without overlap', (_name, box) => {
    expectTiling([412, 286, 188, 164, 148, 142, 96, 96, 86, 82, 54, 48, 38], box)
  })

  it('fills the box with one value', () => {
    expect(squarify([5], { x: 1, y: 2, width: 30, height: 40 })).toEqual([
      { x: 1, y: 2, width: 30, height: 40 },
    ])
  })

  it('gives equal values equal areas', () => {
    const rects = squarify([3, 3, 3, 3, 3, 3], { x: 0, y: 0, width: 120, height: 60 })
    rects.forEach((r) => {
      expect(area(r)).toBeCloseTo(1200, 6)
    })
  })

  it('returns [] for no values', () => {
    expect(squarify([], { x: 0, y: 0, width: 10, height: 10 })).toEqual([])
  })

  it('returns zero-sized rects for bad values or boxes', () => {
    const rects = squarify([4, 0, -1, NaN], { x: 0, y: 0, width: 10, height: 10 })
    expect(rects[0]).toEqual({ x: 0, y: 0, width: 10, height: 10 })
    for (const r of rects.slice(1)) expect(r).toEqual({ x: 0, y: 0, width: 0, height: 0 })
    for (const r of squarify([1, 2], { x: 3, y: 4, width: 0, height: 10 })) {
      expect(r).toEqual({ x: 3, y: 4, width: 0, height: 0 })
    }
  })
})

const GROUPS = [
  [412, 286, 148, 96],
  [188, 142, 96, 54],
  [164, 82, 48],
  [86, 38],
]

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps

describe('treemapLayout', () => {
  const layout = treemapLayout(GROUPS, 1024, 480, true)

  it('fills the canvas edge to edge', () => {
    const tiles = layout.flatMap((g) => g.tiles)
    expect(near(Math.min(...tiles.map((t) => t.x)), 0)).toBe(true)
    expect(near(Math.max(...tiles.map((t) => t.x + t.width)), 1024)).toBe(true)
    expect(near(Math.min(...layout.map((g) => g.box.y)), 0)).toBe(true)
    expect(near(Math.max(...layout.map((g) => g.box.y + g.box.height)), 480)).toBe(true)
  })

  it('keeps group boxes 8 apart where they are side by side', () => {
    let pairs = 0
    for (const a of layout.map((g) => g.box)) {
      // The nearest box to the right that shares some height is exactly 8 away.
      const gaps = layout
        .map((g) => g.box)
        .filter(
          (b) => b !== a && Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1e-6,
        )
        .map((b) => b.x - (a.x + a.width))
        .filter((gap) => gap > -1e-6)
      if (gaps.length > 0) {
        expect(near(Math.min(...gaps), 8)).toBe(true)
        pairs++
      }
    }
    expect(pairs).toBeGreaterThan(0)
  })

  it('starts tiles under the 24 px header and keeps them 2 apart', () => {
    layout.forEach((g) => {
      expect(g.header).toBe(true)
      expect(near(Math.min(...g.tiles.map((t) => t.y)), g.box.y + 24)).toBe(true)
      for (let i = 0; i < g.tiles.length; i++) {
        for (let j = i + 1; j < g.tiles.length; j++) {
          const a = g.tiles[i]!
          const b = g.tiles[j]!
          const gapX = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width))
          const gapY = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height))
          if (near(gapX, 2))
            expect(Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y)).toBe(true)
          expect(Math.max(gapX, gapY)).toBeGreaterThanOrEqual(2 - 1e-6)
        }
      }
    })
  })

  it('shares each group in proportion to the values (within 1 %)', () => {
    layout.forEach((g, gi) => {
      const values = GROUPS[gi]!
      // Tiles lose the same 2 px frame, so compare enlarged areas.
      const grown = g.tiles.map((t) => (t.width + 2) * (t.height + 2))
      const total = sum(grown)
      grown.forEach((a, i) => {
        expect(Math.abs(a / total / (values[i]! / sum(values)) - 1)).toBeLessThan(0.01)
      })
    })
  })

  it('reserves no header without headers', () => {
    const [g] = treemapLayout([[412, 286, 148]], 1024, 480, false)
    expect(g!.header).toBe(false)
    const tiles = g!.tiles
    expect(near(Math.min(...tiles.map((t) => t.x)), 0)).toBe(true)
    expect(near(Math.min(...tiles.map((t) => t.y)), 0)).toBe(true)
    expect(near(Math.max(...tiles.map((t) => t.x + t.width)), 1024)).toBe(true)
    expect(near(Math.max(...tiles.map((t) => t.y + t.height)), 480)).toBe(true)
  })

  it('drops the header of a box lower than 48', () => {
    const low = treemapLayout([[1000, 200], [100]], 300, 40, true)
    expect(low.every((g) => g.box.height < 48 && !g.header)).toBe(true)
    for (const g of low) expect(Math.min(...g.tiles.map((t) => t.y))).toBeCloseTo(g.box.y, 9)
    expect(treemapLayout([[1000, 200], [100]], 300, 100, true).every((g) => g.header)).toBe(true)
  })

  it('stays finite and non-negative with one huge value and many tiny ones', () => {
    const [g] = treemapLayout([[1_000_000, ...Array<number>(20).fill(1)]], 320, 480, true)
    for (const r of [g!.box, ...g!.tiles]) {
      for (const n of [r.x, r.y, r.width, r.height]) expect(Number.isFinite(n)).toBe(true)
      expect(r.width).toBeGreaterThanOrEqual(0)
      expect(r.height).toBeGreaterThanOrEqual(0)
    }
  })

  it.each([
    ['zero width', 0, 480],
    ['negative width', -10, 480],
    ['zero height', 1024, 0],
    ['negative height', 1024, -5],
    ['NaN width', NaN, 480],
  ])('returns zero-sized rects for %s', (_n, w, h) => {
    const out = treemapLayout(GROUPS, w, h, true)
    expect(out).toHaveLength(GROUPS.length)
    for (const g of out) {
      for (const r of [g.box, ...g.tiles]) {
        expect(Number.isFinite(r.x) && Number.isFinite(r.y)).toBe(true)
        expect(r.width).toBe(0)
        expect(r.height).toBe(0)
      }
    }
  })

  it('returns zero-sized rects for bad totals and no groups', () => {
    expect(treemapLayout([], 100, 100, true)).toEqual([])
    const [g] = treemapLayout([[0, 0]], 100, 100, true)
    expect(g!.tiles).toHaveLength(2)
    for (const r of [g!.box, ...g!.tiles]) {
      expect(r.width).toBe(0)
      expect(r.height).toBe(0)
      expect(Number.isFinite(r.x) && Number.isFinite(r.y)).toBe(true)
    }
  })
})

describe('treemapNeighbour', () => {
  const rects: TreemapRect[] = [
    { x: 0, y: 0, width: 10, height: 10 }, // 0 a
    { x: 10, y: 0, width: 10, height: 10 }, // 1 b
    { x: 0, y: 10, width: 10, height: 10 }, // 2 c
    { x: 10, y: 10, width: 10, height: 10 }, // 3 d
    { x: 0, y: 20, width: 20, height: 10 }, // 4 wide
  ]

  it('moves across the grid', () => {
    expect(treemapNeighbour(rects, 0, 'right')).toBe(1)
    expect(treemapNeighbour(rects, 1, 'left')).toBe(0)
    expect(treemapNeighbour(rects, 0, 'down')).toBe(2)
    expect(treemapNeighbour(rects, 3, 'up')).toBe(1)
    expect(treemapNeighbour(rects, 2, 'right')).toBe(3)
    expect(treemapNeighbour(rects, 3, 'down')).toBe(4)
  })

  it('returns -1 at the edges', () => {
    expect(treemapNeighbour(rects, 0, 'left')).toBe(-1)
    expect(treemapNeighbour(rects, 0, 'up')).toBe(-1)
    expect(treemapNeighbour(rects, 1, 'right')).toBe(-1)
    expect(treemapNeighbour(rects, 4, 'down')).toBe(-1)
    expect(treemapNeighbour(rects, 4, 'left')).toBe(-1)
  })

  it('breaks ties by centre distance, then index', () => {
    // From the wide rect up: c and d are equally near and equally centred, the lower index wins.
    expect(treemapNeighbour(rects, 4, 'up')).toBe(2)
    // Nearest edge beats a closer centre.
    const stack: TreemapRect[] = [
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 12, y: 0, width: 10, height: 4 },
      { x: 10, y: 0, width: 10, height: 10 },
    ]
    expect(treemapNeighbour(stack, 0, 'right')).toBe(2)
    // Same edge: the one whose centre is closer on the other axis.
    const col: TreemapRect[] = [
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 10, y: 0, width: 10, height: 3 },
      { x: 10, y: 3, width: 10, height: 7 },
    ]
    expect(treemapNeighbour(col, 0, 'right')).toBe(2)
  })

  it('ignores rects that only touch on a corner or overlap by 0.5 px', () => {
    const r: TreemapRect[] = [
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 10, y: 9.5, width: 10, height: 10 },
    ]
    expect(treemapNeighbour(r, 0, 'right')).toBe(-1)
  })

  it('returns -1 for a bad index', () => {
    expect(treemapNeighbour(rects, 9, 'right')).toBe(-1)
    expect(treemapNeighbour([], 0, 'up')).toBe(-1)
  })
})
