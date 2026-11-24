import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFormatter } from '../../core/format'
import { type TreemapRect, treemapLayout } from '../../core/treemap'
import { ChartsProvider } from '../ChartsProvider'
import { shareText, Treemap, type TreemapProps } from './Treemap'

type Line = {
  line: string
  group: string
  revenue: number | string | null
  margin: number | null
}

// The shared "service lines" data: 13 rows, total 1840, already in layout order.
const lines: Line[] = [
  { line: 'Kitchen', group: 'Remodels', revenue: 412, margin: 34 },
  { line: 'Bath', group: 'Remodels', revenue: 286, margin: 31 },
  { line: 'Basement', group: 'Remodels', revenue: 148, margin: 22 },
  { line: 'Whole-home', group: 'Remodels', revenue: 96, margin: 8 },
  { line: 'Plumbing', group: 'Repairs', revenue: 188, margin: 42 },
  { line: 'Electrical', group: 'Repairs', revenue: 142, margin: 38 },
  { line: 'Roofing', group: 'Repairs', revenue: 96, margin: 16 },
  { line: 'Handyman', group: 'Repairs', revenue: 54, margin: 18 },
  { line: 'Decks', group: 'Outdoor', revenue: 164, margin: 27 },
  { line: 'Fencing', group: 'Outdoor', revenue: 82, margin: 24 },
  { line: 'Landscaping', group: 'Outdoor', revenue: 48, margin: 12 },
  { line: 'Annual plans', group: 'Maintenance plans', revenue: 86, margin: 46 },
  { line: 'Seasonal', group: 'Maintenance plans', revenue: 38, margin: 41 },
]
const NAMES = lines.map((d) => d.line)
const GROUP_VALUES = [
  [412, 286, 148, 96],
  [188, 142, 96, 54],
  [164, 82, 48],
  [86, 38],
]
const LEVELS = ['4', '4', '3', '1', '5', '4', '2', '2', '3', '3', '2', '5', '5']

let measured = 1024
beforeEach(() => {
  measured = 1024
  // jsdom lays nothing out: the plot "measures" `measured` px wide.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({ width: measured, height: 0 }) as DOMRect,
  )
})

function renderTreemap(props: Partial<TreemapProps<Line>> = {}) {
  return render(
    <Treemap<Line>
      title="Revenue by service line"
      data={lines}
      name="line"
      value="revenue"
      group="group"
      shade="margin"
      breaks={[10, 20, 30, 40]}
      initialWidth={1024}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, part: string) =>
  [...root.querySelectorAll(`[data-ch-part="${part}"]`)] as HTMLElement[]
const tiles = (root: HTMLElement) => parts(root, 'treemap-tile')
const tileNames = (root: HTMLElement) =>
  tiles(root).map((t) => t.querySelector('[data-ch-part="treemap-tile-name"]')?.textContent)
const levels = (root: HTMLElement) => tiles(root).map((t) => t.getAttribute('data-ch-level'))
const r2 = (n: number) => Math.round(n * 100) / 100
const rectOf = (el: HTMLElement): TreemapRect => ({
  x: Number.parseFloat(el.style.left),
  y: Number.parseFloat(el.style.top),
  width: Number.parseFloat(el.style.width),
  height: Number.parseFloat(el.style.height),
})
const rounded = (r: TreemapRect): TreemapRect => ({
  x: r2(r.x),
  y: r2(r.y),
  width: r2(r.width),
  height: r2(r.height),
})
const styleValues = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>('[style]')].flatMap((el) => [
    el.style.left,
    el.style.top,
    el.style.width,
    el.style.height,
  ])
const warnings = (spy: { mock: { calls: unknown[][] } }): string[] =>
  spy.mock.calls.map((call) => String(call[0]))

describe('<Treemap> tiles and groups', () => {
  it('draws 13 tiles and 4 group headers, largest group and tile first', () => {
    const { container } = renderTreemap()
    expect(tiles(container)).toHaveLength(13)
    expect(tileNames(container)).toEqual(NAMES)
    const headers = parts(container, 'treemap-group')
    expect(
      headers.map((h) => [
        h.querySelector('[data-ch-part="treemap-group-name"]')?.textContent,
        h.querySelector('[data-ch-part="treemap-group-total"]')?.textContent,
      ]),
    ).toEqual([
      ['Remodels', '942'],
      ['Repairs', '480'],
      ['Outdoor', '294'],
      ['Maintenance plans', '124'],
    ])
  })

  it('orders groups by total and tiles by value whatever the data order; ties keep data order', () => {
    const shuffled = [...lines].reverse()
    const { container } = renderTreemap({ data: shuffled })
    // Whole-home and Roofing are both 96, in different groups; within Repairs data order is kept.
    expect(tiles(container).map((t) => t.getAttribute('data-ch-level'))).toEqual(LEVELS)
    expect(parts(container, 'treemap-group-name').map((g) => g.textContent)).toEqual([
      'Remodels',
      'Repairs',
      'Outdoor',
      'Maintenance plans',
    ])
    const tie: Line[] = [
      { line: 'A', group: 'G', revenue: 50, margin: 10 },
      { line: 'B', group: 'G', revenue: 80, margin: 10 },
      { line: 'C', group: 'G', revenue: 50, margin: 10 },
    ]
    const { container: c2 } = renderTreemap({ data: tie })
    expect(
      tiles(c2).map((t) => t.querySelector('[data-ch-part="treemap-tile-name"]')?.textContent),
    ).toEqual(['B', 'A', 'C'])
  })

  it('places tiles and headers where treemapLayout puts them for the measured width', () => {
    measured = 900
    const { container } = renderTreemap()
    const layout = treemapLayout(GROUP_VALUES, 900, 480, true)
    expect(tiles(container).map(rectOf)).toEqual(layout.flatMap((g) => g.tiles).map(rounded))
    const headers = parts(container, 'treemap-group')
    expect(headers.map((h) => [h.style.left, h.style.top, h.style.width])).toEqual(
      layout.map((g) => [`${r2(g.box.x)}px`, `${r2(g.box.y)}px`, `${r2(g.box.width)}px`]),
    )
    const plot = parts(container, 'treemap-plot')[0] as HTMLElement
    expect(plot.style.height).toBe('480px')
  })

  it('takes the box height from height', () => {
    const { container } = renderTreemap({ height: 300 })
    expect((parts(container, 'treemap-plot')[0] as HTMLElement).style.height).toBe('300px')
    const layout = treemapLayout(GROUP_VALUES, 1024, 300, true)
    expect(tiles(container).map(rectOf)).toEqual(layout.flatMap((g) => g.tiles).map(rounded))
  })

  it('gives a group lower than 48 px no header', () => {
    measured = 600
    const { container } = renderTreemap({ height: 150 })
    const layout = treemapLayout(GROUP_VALUES, 600, 150, true)
    // Maintenance plans gets a box about 39 px high.
    expect(layout.map((g) => g.header)).toEqual([true, true, true, false])
    expect(parts(container, 'treemap-group-name').map((g) => g.textContent)).toEqual([
      'Remodels',
      'Repairs',
      'Outdoor',
    ])
    expect(tiles(container).map(rectOf)).toEqual(layout.flatMap((g) => g.tiles).map(rounded))
  })

  it('fills the box with the tiles and draws no headers without group', () => {
    const { container } = renderTreemap({ group: undefined })
    expect(parts(container, 'treemap-group')).toHaveLength(0)
    const values = [...lines].map((d) => d.revenue as number).sort((a, b) => b - a)
    const layout = treemapLayout([values], 1024, 480, false)
    const rects = tiles(container).map(rectOf)
    expect(rects).toEqual(layout[0]?.tiles.map(rounded))
    expect(Math.min(...rects.map((r) => r.y))).toBe(0)
  })

  it('keeps rows with the same name in different groups apart', () => {
    const error = vi.spyOn(console, 'error')
    const data: Line[] = lines.map((d, i) =>
      i === 3 ? { ...d, line: 'Other' } : i === 10 ? { ...d, line: 'Other' } : d,
    )
    data[11] = { ...(data[11] as Line), group: 'Kitchen' }
    data[12] = { ...(data[12] as Line), group: 'Kitchen' }
    const { container } = renderTreemap({ data })
    expect(tiles(container)).toHaveLength(13)
    expect(parts(container, 'treemap-group-name').map((g) => g.textContent)).toContain('Kitchen')
    expect(error).not.toHaveBeenCalled()
  })
})

describe('<Treemap> levels and tone', () => {
  it('shades each tile by the bin of its shade', () => {
    const { container } = renderTreemap()
    expect(levels(container)).toEqual(LEVELS)
  })

  it('leaves the tone to CSS by default and sets it with tone', () => {
    const { container } = renderTreemap()
    expect(parts(container, 'treemap')[0]).not.toHaveAttribute('data-ch-seq-tone')
    const { container: loss } = renderTreemap({ tone: 'loss' })
    expect(parts(loss, 'treemap')[0]).toHaveAttribute('data-ch-seq-tone', 'loss')
  })

  it('draws every tile at level 3 and no legend without shade', () => {
    const { container } = renderTreemap({ shade: undefined, breaks: undefined })
    expect(levels(container)).toEqual(Array(13).fill('3'))
    expect(parts(container, 'treemap-legend')).toHaveLength(0)
    expect(parts(container, 'legend')).toHaveLength(0)
  })

  it('draws a row without a shade number at level 0', () => {
    const data = lines.map((d, i) => (i === 0 ? { ...d, margin: null } : d))
    const { container } = renderTreemap({ data })
    expect(levels(container)[0]).toBe('0')
  })
})

describe('<Treemap> legend', () => {
  const labels = (root: HTMLElement) => parts(root, 'legend-label').map((l) => l.textContent)

  it('shows the shade label and one swatch per bin', () => {
    const { container } = renderTreemap()
    expect(parts(container, 'treemap-legend-title')[0]).toHaveTextContent('Margin')
    expect(labels(container)).toEqual(['Under 10', '10 to 20', '20 to 30', '30 to 40', '40 and up'])
    expect(parts(container, 'legend-swatch').map((s) => s.getAttribute('data-ch-level'))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ])
  })

  it('formats the labels with shadeFormat and takes shadeLabel and binLabels', () => {
    const { container } = renderTreemap({
      shadeFormat: { preset: 'percent', digits: 0 },
      shadeLabel: 'Gross margin',
    })
    expect(parts(container, 'treemap-legend-title')[0]).toHaveTextContent('Gross margin')
    expect(labels(container)).toEqual([
      'Under 10%',
      '10% to 20%',
      '20% to 30%',
      '30% to 40%',
      '40% and up',
    ])
    const { container: custom } = renderTreemap({ binLabels: ['a', 'b', 'c', 'd', 'e'] })
    expect(labels(custom)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('names a function shade "Shade", or the translated headerShade', () => {
    const { container } = renderTreemap({ shade: (d) => d.margin as number })
    expect(parts(container, 'treemap-legend-title')[0]).toHaveTextContent('Shade')
    const { container: de } = render(
      <ChartsProvider messages={{ headerShade: 'Schattierung' }}>
        <Treemap<Line>
          title="T"
          data={lines}
          name="line"
          value="revenue"
          shade={(d) => d.margin as number}
          breaks={[10]}
        />
      </ChartsProvider>,
    )
    expect(parts(de, 'treemap-legend-title')[0]).toHaveTextContent('Schattierung')
  })

  it('draws no legend with legend={false}', () => {
    const { container } = renderTreemap({ legend: false })
    expect(parts(container, 'treemap-legend')).toHaveLength(0)
  })
})

describe('<Treemap> tile text', () => {
  const lineOf = (tile: HTMLElement, part: string) =>
    tile.querySelector(`[data-ch-part="${part}"]`)?.textContent ?? null

  it('shows the name from 64 × 28 px and "value · share" from 96 × 48 px', () => {
    type Row = { n: string; v: number }
    const rows: Row[] = [
      { n: 'Big', v: 300 },
      { n: 'Mid', v: 60 },
      { n: 'Tiny', v: 6 },
    ]
    measured = 400
    const { container } = render(
      <Treemap<Row> title="T" data={rows} name="n" value="v" height={100} initialWidth={400} />,
    )
    const rects = treemapLayout([[300, 60, 6]], 400, 100, false)[0]?.tiles ?? []
    // The data covers the three cases.
    expect(
      rects.map((r) => [r.width >= 96 && r.height >= 48, r.width >= 64 && r.height >= 28]),
    ).toEqual([
      [true, true],
      [false, true],
      [false, false],
    ])
    const [big, mid, tiny] = tiles(container) as [HTMLElement, HTMLElement, HTMLElement]
    expect(lineOf(big, 'treemap-tile-name')).toBe('Big')
    expect(lineOf(big, 'treemap-tile-value')).toBe('300 · 82.0%')
    expect(lineOf(mid, 'treemap-tile-name')).toBe('Mid')
    expect(lineOf(mid, 'treemap-tile-value')).toBeNull()
    expect(tiny.textContent).toBe('')
  })

  it('formats the value with format and the share with one decimal', () => {
    const data = lines.map((d) => ({ ...d, revenue: (d.revenue as number) * 1000 }))
    const { container } = renderTreemap({ data, format: 'currency-compact' })
    const kitchen = tiles(container)[0] as HTMLElement
    expect(lineOf(kitchen, 'treemap-tile-value')).toBe('$412K · 22.4%')
    expect(parts(container, 'treemap-group-total')[0]).toHaveTextContent('$942K')
  })

  it('reads a share above 0 that rounds to 0.0% as "<0.1%"', () => {
    const pct = createFormatter('percent')
    expect(shareText(0.224, pct)).toBe('22.4%')
    expect(shareText(0.0004, pct)).toBe('<0.1%')
    expect(shareText(0.0005, pct)).toBe('0.1%')
    expect(shareText(0, pct)).toBe('0.0%')
  })
})

describe('<Treemap> skipped rows and warnings', () => {
  it('does not draw rows with a zero value, and does not warn about them', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const data = lines.map((d, i) => (i === 2 ? { ...d, revenue: 0 } : d))
    const { container } = renderTreemap({ data })
    expect(tiles(container)).toHaveLength(12)
    expect(warn).not.toHaveBeenCalled()
  })

  it('skips missing, non-numeric and negative values with one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const data = lines.map((d, i) =>
      i === 1
        ? { ...d, revenue: null }
        : i === 4
          ? { ...d, revenue: 'x' }
          : i === 6
            ? { ...d, revenue: -5 }
            : d,
    )
    const { container } = renderTreemap({ data })
    expect(tiles(container)).toHaveLength(10)
    expect(warnings(warn)).toHaveLength(1)
    expect(warnings(warn)[0]).toContain('skipped 3 rows')
  })

  it('warns about shade without breaks and breaks without shade, and draws level 3', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderTreemap({ breaks: undefined })
    expect(levels(container)).toEqual(Array(13).fill('3'))
    expect(parts(container, 'legend')).toHaveLength(0)
    expect(warnings(warn)).toHaveLength(1)
    expect(warnings(warn)[0]).toContain('`shade` needs `breaks`')
    warn.mockClear()
    const { container: other } = renderTreemap({ shade: undefined })
    expect(levels(other)).toEqual(Array(13).fill('3'))
    expect(warnings(warn)).toHaveLength(1)
    expect(warnings(warn)[0]).toContain('`breaks` need `shade`')
  })

  it('sorts malformed breaks and falls back from binLabels of the wrong length, as Heatmap', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderTreemap({ breaks: [40, 10, 30, 20, 20], binLabels: ['a'] })
    expect(levels(container)).toEqual(LEVELS)
    expect(parts(container, 'legend-label')[0]).toHaveTextContent('Under 10')
    expect(warnings(warn).some((w) => w.includes('sorted and deduplicated'))).toBe(true)
    expect(warnings(warn).some((w) => w.includes('one label per bin'))).toBe(true)
  })

  it('warns about repeated ids and still draws every tile', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderTreemap({ id: (d) => d.group })
    expect(tiles(container)).toHaveLength(13)
    expect(warnings(warn).some((w) => w.includes('duplicate id'))).toBe(true)
  })
})

describe('<Treemap> empty state and narrow boxes', () => {
  it('shows the empty state without tiles', () => {
    const { container } = renderTreemap({ data: [] })
    expect(parts(container, 'empty')[0]).toHaveTextContent('No data')
    expect(parts(container, 'treemap-plot')).toHaveLength(0)
    const zeros = lines.map((d) => ({ ...d, revenue: 0 }))
    const { container: allZero } = renderTreemap({ data: zeros, empty: 'Nothing sold' })
    expect(parts(allZero, 'empty')[0]).toHaveTextContent('Nothing sold')
    expect(tiles(allZero)).toHaveLength(0)
  })

  it('renders a 60 px wide chart and a width of 0 without NaN', () => {
    measured = 60
    const { container } = renderTreemap({ initialWidth: 60 })
    expect(tiles(container)).toHaveLength(13)
    expect(styleValues(container).join(' ')).not.toContain('NaN')
    for (const r of tiles(container).map(rectOf)) {
      expect(r.x + r.width).toBeLessThanOrEqual(60.01)
    }
    measured = 0
    const { container: zero } = renderTreemap({ initialWidth: 60 })
    expect(tiles(zero)).toHaveLength(13)
    expect(styleValues(zero).join(' ')).not.toContain('NaN')
    expect(tiles(zero).every((t) => t.textContent === '')).toBe(true)
  })
})
