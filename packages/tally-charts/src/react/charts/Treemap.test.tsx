import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFormatter } from '../../core/format'
import {
  type TreemapDirection,
  type TreemapRect,
  treemapLayout,
  treemapNeighbour,
} from '../../core/treemap'
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

const element = (props: Partial<TreemapProps<Line>> = {}) => (
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
  />
)
const options = () => screen.getAllByRole('option')
const option = (i: number) => options()[i] as HTMLElement
const listbox = () => screen.getByRole('listbox')
const activeNames = (root: HTMLElement) =>
  tiles(root)
    .filter((t) => t.getAttribute('data-ch-active') === 'true')
    .map((t) => t.getAttribute('aria-label')?.split(',')[0])
const tooltips = (root: HTMLElement) => parts(root, 'treemap-tooltip')
const segments = (root: HTMLElement) =>
  parts(root, 'pill-segment').map((s) => s.textContent?.replace(/\s+/g, ' ').trim())
const thousands = lines.map((d) => ({ ...d, revenue: (d.revenue as number) * 1000 }))
const BINS = ['Under 10', '10 to 20', '20 to 30', '30 to 40', '40 and up']
const dollars: Partial<TreemapProps<Line>> = {
  data: thousands,
  format: 'currency-compact',
  shadeFormat: { preset: 'percent', digits: 0 },
  binLabels: BINS,
}

describe('<Treemap> roles and names', () => {
  it('is one listbox named by the title and described by description', () => {
    renderTreemap({ description: 'Remodels bring in half the revenue.' })
    const box = screen.getByRole('listbox', { name: 'Revenue by service line' })
    expect(screen.getAllByRole('listbox')).toHaveLength(1)
    expect(box).toHaveAttribute('data-ch-part', 'treemap-plot')
    expect(box).toHaveAccessibleDescription('Remodels bring in half the revenue.')
  })

  it('takes aria-labelledby over the title and falls back to "Treemap"', () => {
    const { unmount } = render(
      <>
        <h2 id="outside">Service lines</h2>
        {element({ 'aria-labelledby': 'outside' })}
      </>,
    )
    expect(listbox()).toHaveAccessibleName('Service lines')
    unmount()
    const { unmount: second } = renderTreemap({ title: '' })
    expect(listbox()).toHaveAccessibleName('Treemap')
    second()
    render(
      <ChartsProvider messages={{ treemapName: 'Kacheln' }}>
        {element({ title: '' })}
      </ChartsProvider>,
    )
    expect(listbox()).toHaveAccessibleName('Kacheln')
  })

  it('wraps each group in a role=group named by its header, with 13 options in all', () => {
    renderTreemap()
    const groups = within(listbox()).getAllByRole('group')
    expect(groups).toHaveLength(4)
    expect(groups.map((g) => g.parentElement)).toEqual(Array(4).fill(listbox()))
    for (const [i, name] of [
      'Remodels 942',
      'Repairs 480',
      'Outdoor 294',
      'Maintenance plans 124',
    ].entries()) {
      expect(groups[i]).toHaveAccessibleName(name)
    }
    expect(groups.map((g) => within(g).getAllByRole('option').length)).toEqual([4, 4, 3, 2])
    expect(options()).toHaveLength(13)
    // Each group holds its own header.
    expect(
      groups.map((g) => g.querySelector('[data-ch-part="treemap-group-name"]')?.textContent),
    ).toEqual(['Remodels', 'Repairs', 'Outdoor', 'Maintenance plans'])
  })

  it('names a group without a header by its name and total', () => {
    measured = 600
    render(element({ height: 150, initialWidth: 600 }))
    const groups = within(listbox()).getAllByRole('group')
    expect(groups).toHaveLength(4)
    expect(groups[3]?.querySelector('[data-ch-part="treemap-group-name"]')).toBeNull()
    expect(groups[3]).toHaveAttribute('aria-label', 'Maintenance plans 124')
    expect(groups[3]).not.toHaveAttribute('aria-labelledby')
    expect(groups[3]).toHaveAccessibleName('Maintenance plans 124')
  })

  it('puts the options straight into the listbox without group', () => {
    renderTreemap({ group: undefined })
    expect(within(listbox()).queryAllByRole('group')).toHaveLength(0)
    expect(options().every((o) => o.parentElement === listbox())).toBe(true)
  })

  it('puts the tiles of rows without a group name straight into the listbox', () => {
    const data = lines.map((d, i) => (i >= 11 ? { ...d, group: '' } : d))
    const { container } = renderTreemap({ data })
    expect(within(listbox()).getAllByRole('group')).toHaveLength(3)
    const loose = options().filter((o) => o.parentElement === listbox())
    expect(loose.map((o) => o.getAttribute('aria-label')?.split(',')[0])).toEqual([
      'Annual plans',
      'Seasonal',
    ])
    // No visible header for it; its tiles keep the layout's places.
    expect(parts(container, 'treemap-group-name').map((n) => n.textContent)).toEqual([
      'Remodels',
      'Repairs',
      'Outdoor',
    ])
    const layout = treemapLayout(GROUP_VALUES, 1024, 480, true)
    expect(tiles(container).map(rectOf)).toEqual(layout.flatMap((g) => g.tiles).map(rounded))
  })

  it('gives every tile its full text: name, value, share, shade and bin', () => {
    renderTreemap(dollars)
    expect(option(7)).toHaveAttribute(
      'aria-label',
      'Handyman, $54K, 2.9% of total, margin 18%, 10 to 20',
    )
    expect(option(7)).toHaveAccessibleName('Handyman, $54K, 2.9% of total, margin 18%, 10 to 20')
  })

  it('keeps an acronym shade label as written in the accessible text', () => {
    renderTreemap({ ...dollars, shadeLabel: 'NPS' })
    expect(option(7)).toHaveAttribute(
      'aria-label',
      'Handyman, $54K, 2.9% of total, NPS 18%, 10 to 20',
    )
  })

  it('says only the name, value and share for a level-0 tile and without shade', () => {
    const data = thousands.map((d, i) => (i === 0 ? { ...d, margin: null } : d))
    const { container } = renderTreemap({ ...dollars, data })
    expect(levels(container)[0]).toBe('0')
    expect(option(0)).toHaveAttribute('aria-label', 'Kitchen, $412K, 22.4% of total')
    const { container: plain } = render(
      element({ data: thousands, format: 'currency-compact', shade: undefined, breaks: undefined }),
    )
    expect(tiles(plain)[7]).toHaveAttribute('aria-label', 'Handyman, $54K, 2.9% of total')
  })

  it('hides the visible tile text from assistive technology', () => {
    const { container } = renderTreemap()
    const spans = [
      ...parts(container, 'treemap-tile-name'),
      ...parts(container, 'treemap-tile-value'),
    ]
    expect(spans.length).toBeGreaterThan(0)
    for (const span of spans) expect(span).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('<Treemap> keyboard', () => {
  const RECTS = treemapLayout(GROUP_VALUES, 1024, 480, true).flatMap((g) => g.tiles)
  const KEYS: Record<TreemapDirection, string> = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
  }
  const tabStops = () => options().filter((o) => o.tabIndex === 0)

  it('has one tab stop, the first tile', () => {
    renderTreemap()
    expect(tabStops()).toEqual([option(0)])
    expect(options().filter((o) => o.getAttribute('tabindex') === '-1')).toHaveLength(12)
  })

  it.each([0, 4, 7, 9, 12])(
    'moves with the arrows from tile %i to the neighbour treemapNeighbour picks',
    (from) => {
      renderTreemap()
      for (const direction of ['up', 'down', 'left', 'right'] as const) {
        act(() => option(from).focus())
        const to = treemapNeighbour(RECTS, from, direction)
        // Handled either way, so the page does not scroll.
        expect(fireEvent.keyDown(option(from), { key: KEYS[direction] })).toBe(false)
        const landed = to === -1 ? from : to
        expect(document.activeElement).toBe(option(landed))
        expect(tabStops()).toEqual([option(landed)])
      }
    },
  )

  it('keeps focus on an arrow without a neighbour', () => {
    renderTreemap()
    expect(treemapNeighbour(RECTS, 0, 'up')).toBe(-1)
    expect(treemapNeighbour(RECTS, 0, 'left')).toBe(-1)
    act(() => option(0).focus())
    expect(fireEvent.keyDown(option(0), { key: 'ArrowUp' })).toBe(false)
    expect(fireEvent.keyDown(option(0), { key: 'ArrowLeft' })).toBe(false)
    expect(document.activeElement).toBe(option(0))
  })

  it('goes to the first and last tile with Home and End', () => {
    renderTreemap()
    act(() => option(5).focus())
    expect(fireEvent.keyDown(option(5), { key: 'End' })).toBe(false)
    expect(document.activeElement).toBe(option(12))
    expect(tabStops()).toEqual([option(12)])
    fireEvent.keyDown(option(12), { key: 'Home' })
    expect(document.activeElement).toBe(option(0))
  })

  it('leaves modified arrows to the browser', () => {
    renderTreemap()
    act(() => option(0).focus())
    for (const mod of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }]) {
      expect(fireEvent.keyDown(option(0), { key: 'ArrowRight', ...mod })).toBe(true)
      expect(document.activeElement).toBe(option(0))
    }
    expect(fireEvent.keyDown(option(0), { key: 'End', altKey: true })).toBe(true)
    expect(document.activeElement).toBe(option(0))
  })

  it('calls onSelect with the tile on Enter, Space and click; Space never scrolls', () => {
    const onSelect = vi.fn()
    renderTreemap({ onSelect })
    act(() => option(7).focus())
    fireEvent.keyDown(option(7), { key: 'Enter' })
    expect(onSelect).toHaveBeenLastCalledWith(7, {
      id: 7,
      name: 'Handyman',
      group: 'Repairs',
      value: 54,
      share: 54 / 1840,
      shade: 18,
      level: 2,
      datum: lines[7],
    })
    expect(fireEvent.keyDown(option(7), { key: ' ' })).toBe(false)
    expect(onSelect).toHaveBeenCalledTimes(2)
    fireEvent.click(option(0))
    expect(onSelect).toHaveBeenLastCalledWith(0, expect.objectContaining({ name: 'Kitchen' }))
    // Without onSelect, Space still does not scroll the page.
    const { container } = render(element())
    expect(fireEvent.keyDown(tiles(container)[0] as HTMLElement, { key: ' ' })).toBe(false)
  })

  it('marks tiles selectable only with onSelect', () => {
    const { container } = renderTreemap()
    expect(tiles(container).some((t) => t.hasAttribute('data-ch-selectable'))).toBe(false)
    const { container: selectable } = render(element({ onSelect: () => {} }))
    expect(tiles(selectable).every((t) => t.getAttribute('data-ch-selectable') === 'true')).toBe(
      true,
    )
  })

  it('clears the active tile with Escape, handling the key only then', () => {
    const onActiveChange = vi.fn()
    const { container } = renderTreemap({ onActiveChange })
    act(() => option(2).focus())
    expect(activeNames(container)).toEqual(['Basement'])
    expect(tooltips(container)).toHaveLength(1)
    expect(fireEvent.keyDown(option(2), { key: 'Escape' })).toBe(false)
    expect(activeNames(container)).toEqual([])
    expect(tooltips(container)).toHaveLength(0)
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
    expect(document.activeElement).toBe(option(2))
    expect(fireEvent.keyDown(option(2), { key: 'Escape' })).toBe(true)
  })
})

describe('<Treemap> active tile', () => {
  it('activates a tile on hover and clears it when the pointer leaves the box', () => {
    const onActiveChange = vi.fn()
    const { container } = renderTreemap({ onActiveChange })
    fireEvent.pointerEnter(option(2))
    expect(option(2)).toHaveAttribute('data-ch-active', 'true')
    expect(onActiveChange).toHaveBeenLastCalledWith(
      2,
      expect.objectContaining({ name: 'Basement' }),
    )
    fireEvent.pointerLeave(listbox())
    expect(activeNames(container)).toEqual([])
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
  })

  it('returns to the focused tile when the pointer leaves', () => {
    const onActiveChange = vi.fn()
    const { container } = renderTreemap({ onActiveChange })
    act(() => option(0).focus())
    fireEvent.pointerEnter(option(3))
    expect(activeNames(container)).toEqual(['Whole-home'])
    fireEvent.pointerLeave(listbox())
    expect(activeNames(container)).toEqual(['Kitchen'])
    expect(onActiveChange).not.toHaveBeenCalledWith(null, null)
  })

  it('clears the active tile when focus leaves the box', () => {
    const onActiveChange = vi.fn()
    const { container } = renderTreemap({ onActiveChange })
    act(() => option(0).focus())
    fireEvent.keyDown(option(0), { key: 'ArrowRight' })
    expect(activeNames(container)).toHaveLength(1)
    act(() => (document.activeElement as HTMLElement).blur())
    expect(activeNames(container)).toEqual([])
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
  })

  it('closes a hover tooltip on Escape wherever focus is', () => {
    const onActiveChange = vi.fn()
    const { container } = renderTreemap({ onActiveChange })
    fireEvent.pointerEnter(option(2))
    expect(tooltips(container)).toHaveLength(1)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(activeNames(container)).toEqual([])
    expect(tooltips(container)).toHaveLength(0)
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
    // Other keys leave it open.
    fireEvent.pointerEnter(option(3))
    fireEvent.keyDown(document, { key: 'a' })
    expect(activeNames(container)).toEqual(['Whole-home'])
  })

  it('listens on the document only while a hover is open', () => {
    const add = vi.spyOn(document, 'addEventListener')
    const remove = vi.spyOn(document, 'removeEventListener')
    const keydowns = (spy: typeof add) =>
      spy.mock.calls.filter(([type]) => type === 'keydown').map(([, fn]) => fn)
    const { unmount } = renderTreemap()
    expect(keydowns(add)).toHaveLength(0)
    fireEvent.pointerEnter(option(2))
    const [first] = keydowns(add)
    expect(first).toBeDefined()
    fireEvent.pointerLeave(listbox())
    expect(keydowns(remove)).toContain(first)
    fireEvent.pointerEnter(option(4))
    const second = keydowns(add)[1]
    expect(second).toBeDefined()
    unmount()
    expect(keydowns(remove)).toContain(second)
    // Focus is not a hover: a focused tile handles its own Escape.
    add.mockClear()
    renderTreemap()
    act(() => option(0).focus())
    expect(keydowns(add)).toHaveLength(0)
  })

  it('follows a controlled activeId; a parent that ignores changes keeps it', async () => {
    const onActiveChange = vi.fn()
    const { container, rerender } = render(element({ activeId: 4, onActiveChange }))
    expect(activeNames(container)).toEqual(['Plumbing'])
    expect(tooltips(container)).toHaveLength(1)
    fireEvent.pointerEnter(option(1))
    expect(onActiveChange).toHaveBeenLastCalledWith(1, expect.objectContaining({ name: 'Bath' }))
    expect(activeNames(container)).toEqual(['Plumbing'])
    // Once the event is over, the same hover reports again, as the parent never took it.
    await Promise.resolve()
    fireEvent.pointerEnter(option(1))
    expect(onActiveChange).toHaveBeenCalledTimes(2)
    rerender(element({ activeId: 1, onActiveChange }))
    expect(activeNames(container)).toEqual(['Bath'])
    rerender(element({ activeId: null, onActiveChange }))
    expect(activeNames(container)).toEqual([])
  })

  it('shows nothing for an activeId that is not in the data', () => {
    const { container } = render(element({ activeId: 99 }))
    expect(activeNames(container)).toEqual([])
    expect(tooltips(container)).toHaveLength(0)
  })

  it('makes the first tile the tab stop again when the focused row goes away', () => {
    const { rerender } = render(element())
    act(() => option(3).focus())
    fireEvent.keyDown(option(3), { key: 'End' })
    expect(option(12).tabIndex).toBe(0)
    rerender(element({ data: lines.slice(0, 12) }))
    expect(options()).toHaveLength(12)
    expect(options().filter((o) => o.tabIndex === 0)).toEqual([option(0)])
  })
})

describe('<Treemap> tooltip', () => {
  it('shows name, value, share and shade for the active tile, hidden from assistive technology', () => {
    const { container } = renderTreemap(dollars)
    expect(tooltips(container)).toHaveLength(0)
    fireEvent.pointerEnter(option(7))
    const [tip] = tooltips(container)
    expect(tip).toHaveAttribute('aria-hidden', 'true')
    expect(tip?.parentElement).toBe(listbox())
    expect(tip).toHaveClass('ch-tooltip')
    expect(segments(container)).toEqual(['Handyman', '$54K', '2.9% of total', 'Margin 18%'])
  })

  it('leaves the shade out for a tile without a shade number', () => {
    const data = thousands.map((d, i) => (i === 7 ? { ...d, margin: null } : d))
    const { container } = renderTreemap({ ...dollars, data })
    fireEvent.pointerEnter(option(7))
    expect(segments(container)).toEqual(['Handyman', '$54K', '2.9% of total'])
  })

  it('reads a tiny share as "<0.1%"', () => {
    const data = [...lines, { line: 'Odd jobs', group: 'Repairs', revenue: 0.5, margin: 20 }]
    const { container } = renderTreemap({ data })
    const odd = options().findIndex((o) => o.getAttribute('aria-label')?.startsWith('Odd jobs'))
    fireEvent.pointerEnter(option(odd))
    expect(segments(container)[2]).toBe('<0.1% of total')
  })

  it('draws no tooltip with tooltip={false}', () => {
    const { container } = renderTreemap({ tooltip: false })
    fireEvent.pointerEnter(option(7))
    expect(option(7)).toHaveAttribute('data-ch-active', 'true')
    expect(tooltips(container)).toHaveLength(0)
  })

  it('renders what a tooltip function returns instead of the pill', () => {
    const { container } = renderTreemap({
      tooltip: (tile) => <b data-testid="custom">{`${tile.name} in ${tile.group}`}</b>,
    })
    fireEvent.pointerEnter(option(7))
    expect(screen.getByTestId('custom')).toHaveTextContent('Handyman in Repairs')
    expect(parts(container, 'tooltip-pill')).toHaveLength(0)
    expect(tooltips(container)[0]).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('<Treemap> tooltip placement', () => {
  const PILL = { width: 300, height: 30 }
  beforeEach(() => {
    // The pill measures PILL, everything else the plot width.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return (
        this.getAttribute('data-ch-part') === 'treemap-tooltip'
          ? PILL
          : { width: measured, height: 0 }
      ) as DOMRect
    })
  })
  const placed = (root: HTMLElement) => {
    const tip = tooltips(root)[0] as HTMLElement
    return {
      left: Number.parseFloat(tip.style.left),
      top: Number.parseFloat(tip.style.top),
      visibility: tip.style.visibility,
    }
  }
  const RECTS = treemapLayout(GROUP_VALUES, 1024, 480, true).flatMap((g) => g.tiles)

  it('goes inside the top of a tile as tall as the box', () => {
    type Row = { n: string; v: number }
    const { container } = render(
      <Treemap<Row> title="T" data={[{ n: 'All', v: 1 }]} name="n" value="v" initialWidth={1024} />,
    )
    fireEvent.pointerEnter(option(0))
    const rect = treemapLayout([[1]], 1024, 480, false)[0]?.tiles[0] as TreemapRect
    expect(rect).toEqual({ x: 0, y: 0, width: 1024, height: 480 })
    expect(placed(container)).toEqual({ left: r2(512 - 150), top: 6, visibility: '' })
  })

  it('goes below a tile at the top when there is room', () => {
    const { container } = renderTreemap()
    const i = RECTS.findIndex(
      (r) => r.y - PILL.height - 6 < 0 && r.y + r.height + 6 + PILL.height <= 480,
    )
    expect(i).toBeGreaterThanOrEqual(0)
    fireEvent.pointerEnter(option(i))
    const r = RECTS[i] as TreemapRect
    expect(placed(container).top).toBe(r2(r.y + r.height + 6))
  })

  it('goes inside the top of a tile with no room above or below', () => {
    const { container } = renderTreemap()
    // Kitchen runs from under its header to the bottom of the box.
    const r = RECTS[0] as TreemapRect
    expect(r.y - PILL.height - 6).toBeLessThan(0)
    expect(r.y + r.height + 6 + PILL.height).toBeGreaterThan(480)
    fireEvent.pointerEnter(option(0))
    expect(placed(container).top).toBe(r2(r.y + 6))
  })

  it('goes above a tile when it fits, centred on the tile', () => {
    const { container } = renderTreemap()
    const i = RECTS.findIndex(
      (r) =>
        r.y - PILL.height - 6 >= 0 &&
        r.x + r.width / 2 - PILL.width / 2 >= 0 &&
        r.x + r.width / 2 + PILL.width / 2 <= 1024,
    )
    expect(i).toBeGreaterThanOrEqual(0)
    fireEvent.pointerEnter(option(i))
    const r = RECTS[i] as TreemapRect
    expect(placed(container)).toEqual({
      left: r2(r.x + r.width / 2 - PILL.width / 2),
      top: r2(r.y - PILL.height - 6),
      visibility: '',
    })
  })

  it('stays inside the box at the right edge', () => {
    const { container } = renderTreemap()
    const i = RECTS.findIndex(
      (r) => Math.abs(r.x + r.width - 1024) < 0.5 && r.x + r.width / 2 + PILL.width / 2 > 1024,
    )
    expect(i).toBeGreaterThanOrEqual(0)
    fireEvent.pointerEnter(option(i))
    const { left } = placed(container)
    expect(left + PILL.width).toBeLessThanOrEqual(1024)
    expect(left).toBe(1024 - PILL.width)
  })
})
