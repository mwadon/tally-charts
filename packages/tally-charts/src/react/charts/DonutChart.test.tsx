import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChartsProvider } from '../ChartsProvider'
import type { ChartPoint } from '../types'
import { DonutChart, type DonutChartProps } from './DonutChart'
import { donutGeometry } from './donut-geometry'

// Records every points array a mark registers, so a test can see whether a re-render with the
// same props registers a new array. The real hook still runs.
const registered = vi.hoisted(() => [] as (readonly ChartPoint[])[])
vi.mock('../useRegisterPoints', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../useRegisterPoints')>()
  return {
    useRegisterPoints: (points: readonly ChartPoint[]) => {
      if (points.length > 0) registered.push(points)
      actual.useRegisterPoints(points)
    },
  }
})

type Line = { line: string; revenue: unknown }

const lines: Line[] = [
  { line: 'Installs', revenue: 773000 },
  { line: 'Service plans', revenue: 442000 },
  { line: 'Repairs', revenue: 294000 },
  { line: 'Inspections', revenue: 184000 },
  { line: 'Maintenance', revenue: 62000 },
  { line: 'Consulting', revenue: 41000 },
  { line: 'Parts', revenue: 28000 },
  { line: 'Permits', revenue: 16000 },
]
const five: Line[] = [...lines.slice(0, 4), { line: 'Warranty', revenue: 147000 }]

/** Rows with the given values and names "Part 1", "Part 2", … */
const rowsOf = (values: readonly unknown[]): Line[] =>
  values.map((revenue, i) => ({ line: `Part ${i + 1}`, revenue }))

type Props = Record<string, unknown>

/** A 584 px chart of `lines` by revenue, unless `props` says otherwise. */
function renderChart(props: Props = {}) {
  const all = {
    data: lines,
    x: 'line',
    y: 'revenue',
    width: 584,
    title: 'Revenue by service line',
    animate: false,
    ...props,
  } as unknown as DonutChartProps<Line>
  return render(<DonutChart<Line> {...all} />)
}

const parts = (root: Element, part: string) => [
  ...root.querySelectorAll<SVGElement>(`[data-ch-part="${part}"]`),
]
const one = (root: Element, part: string) =>
  root.querySelector<SVGElement>(`[data-ch-part="${part}"]`)
const num = (el: Element, attr: string) => Number(el.getAttribute(attr))
const texts = (root: Element, part: string) => parts(root, part).map((el) => el.textContent)
const levels = (root: Element, part: string) =>
  parts(root, part).map((el) => el.getAttribute('data-ch-level'))
const svgHeight = (root: Element) => num(root.querySelector('svg') as Element, 'height')
const layoutOf = (root: Element) => one(root, 'donut')?.getAttribute('data-ch-layout')
/** The (x, y) of a `translate(x,y)` transform. */
const translate = (el: Element | null): [number, number] => {
  const m = el?.getAttribute('transform')?.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/)
  return [Number(m?.[1]), Number(m?.[2])]
}
const ringAt = (root: Element) => translate(one(root, 'donut-ring'))
const quiet = () => vi.spyOn(console, 'warn').mockImplementation(() => {})
const warnings = (spy: ReturnType<typeof quiet>, text: string) =>
  spy.mock.calls.filter((call) => String(call[0]).includes(text))
/** Every attribute value in the chart, to look for NaN and negative sizes. */
const attributes = (root: Element) =>
  [...root.querySelectorAll('*')].flatMap((el) =>
    [...el.attributes].map((a) => ({ name: a.name, value: a.value })),
  )
/** The outer radius of a slice path: the radius of its first arc command. */
const outerRadius = (d: string | null) => Number(d?.match(/A([\d.]+),/)?.[1])

describe('DonutChart ring', () => {
  it('draws five slices as donutGeometry does for a 232 px ring, right of the list', () => {
    const { container } = renderChart()
    expect(layoutOf(container)).toBe('right')
    expect(svgHeight(container)).toBe(232)
    const slices = parts(container, 'donut-slice')
    expect(slices).toHaveLength(5)
    expect(levels(container, 'donut-slice')).toEqual(['5', '4', '3', '2', 'neutral'])
    const arcs = donutGeometry({
      values: [773000, 442000, 294000, 184000, 147000],
      outer: 100,
      inner: 64,
      gap: 2,
      minArc: 2,
    })
    expect(slices.map((s) => s.getAttribute('d'))).toEqual(arcs.map((a) => a.path))
    expect(ringAt(container)).toEqual([116, 116])
  })

  it('picks the sequential ramp of `tone`', () => {
    const { container, unmount } = renderChart()
    expect(one(container, 'donut')?.getAttribute('data-ch-seq-tone')).toBe('accent')
    unmount()
    const gain = renderChart({ tone: 'gain' })
    expect(one(gain.container, 'donut')?.getAttribute('data-ch-seq-tone')).toBe('gain')
  })
})

describe('DonutChart list', () => {
  it('lists the slices in ring order with values and percents', () => {
    const { container } = renderChart()
    expect(texts(container, 'donut-name')).toEqual([
      'Installs',
      'Service plans',
      'Repairs',
      'Inspections',
      'Other',
    ])
    expect(texts(container, 'donut-percent')).toEqual(['42%', '24%', '16%', '10%', '8%'])
    expect(texts(container, 'donut-value')).toEqual([
      '773,000',
      '442,000',
      '294,000',
      '184,000',
      '147,000',
    ])
    expect(levels(container, 'donut-swatch')).toEqual(levels(container, 'donut-slice'))
    expect(parts(container, 'donut-rule')).toHaveLength(4)
  })

  it('formats values and the total with `format`', () => {
    const { container } = renderChart({ format: 'currency-compact' })
    expect(texts(container, 'donut-value')).toEqual(['$773K', '$442K', '$294K', '$184K', '$147K'])
    expect(one(container, 'donut-total')?.textContent).toBe('$1.84M')
  })

  it('shows only percents, or only values, by `legendValue`', () => {
    const { container, unmount } = renderChart({ legendValue: 'percent' })
    expect(parts(container, 'donut-value')).toHaveLength(0)
    expect(parts(container, 'donut-percent')).toHaveLength(5)
    unmount()
    const value = renderChart({ legendValue: 'value' })
    expect(parts(value.container, 'donut-percent')).toHaveLength(0)
    expect(parts(value.container, 'donut-value')).toHaveLength(5)
  })

  it('aligns the value column 12 px left of the percent column', () => {
    const { container } = renderChart()
    const percent = one(container, 'donut-percent') as Element
    const value = one(container, 'donut-value') as Element
    // The list runs from 264 to 584: 320 px wide, the percent column 3 × 7 px.
    expect(num(percent, 'x')).toBe(320)
    expect(num(value, 'x')).toBe(320 - 21 - 12)
    expect(num(one(container, 'donut-name') as Element, 'x')).toBe(20)
  })

  it('centres the 200 px list on the 232 px ring, 40 px per row', () => {
    const { container } = renderChart()
    const rows = parts(container, 'donut-row')
    expect(rows).toHaveLength(5)
    rows.forEach((row, i) => {
      expect(translate(row)).toEqual([264, 16 + i * 40])
    })
  })

  it('draws the ring alone and centred with `legend={false}`', () => {
    const { container } = renderChart({ legend: false })
    expect(one(container, 'donut-list')).toBeNull()
    expect(layoutOf(container)).toBe('none')
    expect(ringAt(container)).toEqual([292, 116])
    expect(svgHeight(container)).toBe(232)
  })

  it('cuts a 40-character name with an ellipsis and keeps it in a <title>', () => {
    const long = 'Commercial refrigeration maintenance pla'
    expect(long).toHaveLength(40)
    const { container } = renderChart({
      data: [{ line: long, revenue: 773000 }, ...lines.slice(1)],
    })
    const row = parts(container, 'donut-row').find((r) => r.querySelector('title')) as Element
    const el = row.querySelector('[data-ch-part="donut-name"]') as Element
    // The <title> is inside the name, as on a cut centre label, and the visible text is the cut.
    const title = el.querySelector('title')
    expect(title?.textContent).toBe(long)
    const name = (el.textContent ?? '').slice(long.length)
    expect(name.endsWith('…')).toBe(true)
    expect(name.length).toBeLessThan(40)
    expect(row.querySelector(':scope > title')).toBeNull()
    // Names that fit have no <title>.
    expect(parts(container, 'donut-row').filter((r) => r.querySelector('title'))).toHaveLength(1)
  })
})

describe('DonutChart centre', () => {
  it('draws the default total at 20 px: "1,840,000" is wider than the 112 px hole at 28 px', () => {
    const { container } = renderChart()
    const total = one(container, 'donut-total')
    expect(total?.textContent).toBe('1,840,000')
    expect(total?.getAttribute('data-ch-size')).toBe('small')
    expect(one(container, 'donut-center-label')).toBeNull()
  })

  it('draws a total that fits at 28 px', () => {
    const { container } = renderChart({ format: 'currency-compact' })
    const total = one(container, 'donut-total')
    expect(total?.textContent).toBe('$1.84M')
    expect(total?.hasAttribute('data-ch-size')).toBe(false)
    // Alone, it is centred on the ring: the baseline 0.35 × 28 px under the centre.
    expect(num(total as Element, 'y')).toBe(9.8)
  })

  it('draws `centerLabel` under the total', () => {
    const { container } = renderChart({ format: 'currency-compact', centerLabel: 'total revenue' })
    expect(one(container, 'donut-center-label')?.textContent).toBe('total revenue')
    expect(num(one(container, 'donut-total') as Element, 'y')).toBe(2)
    expect(num(one(container, 'donut-center-label') as Element, 'y')).toBe(22)
  })

  it('draws neither with `showTotal={false}`', () => {
    const { container } = renderChart({ showTotal: false, centerLabel: 'total revenue' })
    expect(one(container, 'donut-total')).toBeNull()
    expect(one(container, 'donut-center-label')).toBeNull()
  })

  it('hides a total that is too wide even at 20 px', () => {
    const { container, unmount } = renderChart({ format: () => '$1,840,000.00' })
    expect(one(container, 'donut-total')).toBeNull()
    unmount()
    const thirty = renderChart({ format: () => 'x'.repeat(30) })
    expect(one(thirty.container, 'donut-total')).toBeNull()
  })

  it('centres `centerLabel` alone when the total does not fit', () => {
    const { container } = renderChart({ format: () => '$1,840,000.00', centerLabel: 'total' })
    expect(one(container, 'donut-total')).toBeNull()
    // The baseline 0.35 × 12 px under the centre.
    expect(num(one(container, 'donut-center-label') as Element, 'y')).toBe(4.2)
  })

  it('cuts a 40-character `centerLabel` and keeps it in a <title>', () => {
    const label = 'total revenue across every service line!'
    expect(label).toHaveLength(40)
    const { container } = renderChart({ centerLabel: label })
    const el = one(container, 'donut-center-label') as Element
    expect(el.textContent?.endsWith('…')).toBe(true)
    expect(el.querySelector('title')?.textContent).toBe(label)
  })
})

describe('DonutChart ordering and colour', () => {
  it('keeps the data order with `sort="none"`; levels follow it', () => {
    const data = [lines[2], lines[0], lines[3]] as Line[]
    const { container } = renderChart({ data, sort: 'none' })
    expect(texts(container, 'donut-name')).toEqual(['Repairs', 'Installs', 'Inspections'])
    expect(levels(container, 'donut-slice')).toEqual(['5', '4', '3'])
  })

  it('keeps the data order for ties', () => {
    const { container } = renderChart({ data: rowsOf([5, 10, 5, 10]) })
    expect(texts(container, 'donut-name')).toEqual(['Part 2', 'Part 4', 'Part 1', 'Part 3'])
  })

  it('draws exactly maxSlices parts without "Other"; the fifth is neutral', () => {
    const { container } = renderChart({ data: five })
    expect(texts(container, 'donut-name')).toEqual([
      'Installs',
      'Service plans',
      'Repairs',
      'Inspections',
      'Warranty',
    ])
    expect(levels(container, 'donut-slice')).toEqual(['5', '4', '3', '2', 'neutral'])
    expect(texts(container, 'donut-percent')).toEqual(['42%', '24%', '16%', '10%', '8%'])
  })

  it('steps three parts through the base tone, none neutral', () => {
    const { container } = renderChart({ data: lines.slice(0, 3) })
    expect(levels(container, 'donut-slice')).toEqual(['5', '4', '3'])
  })
})

describe('DonutChart "Other"', () => {
  it('sums the two smallest of six parts into "Other"', () => {
    const { container } = renderChart({ data: lines.slice(0, 6) })
    expect(texts(container, 'donut-name')).toEqual([
      'Installs',
      'Service plans',
      'Repairs',
      'Inspections',
      'Other',
    ])
    expect(texts(container, 'donut-value')[4]).toBe('103,000')
  })

  it('names "Other" from `messages.other`', () => {
    const { container } = render(
      <ChartsProvider messages={{ other: 'Inne' }}>
        <DonutChart<Line> data={lines} x="line" y="revenue" width={584} title="R" animate={false} />
      </ChartsProvider>,
    )
    expect(texts(container, 'donut-name')[4]).toBe('Inne')
  })

  it('draws one part and "Other" with `maxSlices={2}`', () => {
    const { container } = renderChart({ maxSlices: 2 })
    expect(texts(container, 'donut-name')).toEqual(['Installs', 'Other'])
    expect(texts(container, 'donut-percent')).toEqual(['42%', '58%'])
    expect(levels(container, 'donut-slice')).toEqual(['5', 'neutral'])
  })

  it.each([
    [1, 2],
    [9, 5],
    [2.5, 2],
  ])('clamps maxSlices %s to %s slices and warns once', (maxSlices, count) => {
    const warn = quiet()
    const { container, rerender } = renderChart({ maxSlices })
    expect(parts(container, 'donut-slice')).toHaveLength(count)
    rerender(
      <DonutChart<Line>
        data={lines}
        x="line"
        y="revenue"
        width={584}
        title="Revenue by service line"
        animate={false}
        maxSlices={maxSlices}
      />,
    )
    const found = warnings(warn, 'DonutChart maxSlices must be a whole number from 2 to 5')
    expect(found).toHaveLength(1)
  })

  it('does not warn for a valid maxSlices', () => {
    const warn = quiet()
    renderChart({ maxSlices: 3 })
    expect(warn).not.toHaveBeenCalled()
  })

  it('keeps a data row named "Other" apart from the grouped slice', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const data = [{ line: 'Other', revenue: 500000 }, ...lines.slice(1)]
    const { container } = renderChart({ data })
    expect(texts(container, 'donut-name').filter((n) => n === 'Other')).toHaveLength(2)
    expect(error).not.toHaveBeenCalled()
  })

  it('keeps the four largest in data order with `sort="none"`, "Other" last', () => {
    const data = [lines[5], lines[2], lines[0], lines[7], lines[3], lines[1], lines[4], lines[6]]
    const { container } = renderChart({ data, sort: 'none' })
    expect(texts(container, 'donut-name')).toEqual([
      'Repairs',
      'Installs',
      'Inspections',
      'Service plans',
      'Other',
    ])
    expect(texts(container, 'donut-value')[4]).toBe('147,000')
  })
})

describe('DonutChart layout', () => {
  it('puts the list under a centred ring below the threshold', () => {
    const { container } = renderChart({ width: 400 })
    expect(layoutOf(container)).toBe('bottom')
    expect(ringAt(container)).toEqual([200, 116])
    expect(translate(parts(container, 'donut-row')[0] as Element)).toEqual([0, 240])
    expect(svgHeight(container)).toBe(232 + 8 + 200)
  })

  it('switches at diameter + 32 + 220', () => {
    const { container, unmount } = renderChart({ width: 484 })
    expect(layoutOf(container)).toBe('right')
    unmount()
    const narrow = renderChart({ width: 483 })
    expect(layoutOf(narrow.container)).toBe('bottom')
  })

  it('never switches a forced position', () => {
    const { container, unmount } = renderChart({ width: 400, legendPosition: 'right' })
    expect(layoutOf(container)).toBe('right')
    unmount()
    const bottom = renderChart({ legendPosition: 'bottom' })
    expect(layoutOf(bottom.container)).toBe('bottom')
  })

  it('sizes the ring and the threshold from `diameter`', () => {
    const { container, unmount } = renderChart({ diameter: 160, width: 412 })
    expect(layoutOf(container)).toBe('right')
    expect(outerRadius(parts(container, 'donut-slice')[0]?.getAttribute('d') ?? null)).toBe(64)
    expect(ringAt(container)).toEqual([80, 100])
    unmount()
    const narrow = renderChart({ diameter: 160, width: 411 })
    expect(layoutOf(narrow.container)).toBe('bottom')
  })

  it('shrinks the ring box to a narrower chart', () => {
    const { container } = renderChart({ width: 180 })
    expect(ringAt(container)).toEqual([90, 90])
    expect(outerRadius(parts(container, 'donut-slice')[0]?.getAttribute('d') ?? null)).toBe(74)
    expect(svgHeight(container)).toBe(180 + 8 + 200)
  })

  it('draws no NaN and no negative radius or size at 60 px', () => {
    const { container } = renderChart({ width: 60, centerLabel: 'total revenue' })
    for (const { name, value } of attributes(container)) {
      expect(value).not.toMatch(/NaN|Infinity/)
      if (['r', 'width', 'height', 'rx'].includes(name)) {
        expect(Number(value)).toBeGreaterThanOrEqual(0)
      }
    }
    for (const slice of parts(container, 'donut-slice')) {
      for (const m of (slice.getAttribute('d') ?? '').matchAll(/A([-\d.]+),([-\d.]+)/g)) {
        expect(Number(m[1])).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('DonutChart list that does not fit', () => {
  /** Each row's left edge, and the left edge of every list text in the row, in px. */
  const rowStarts = (root: Element) =>
    parts(root, 'donut-row').map((row) => {
      const [x0] = translate(row)
      const lefts = [...row.querySelectorAll('text')].map((t) => {
        const x = num(t, 'x')
        // A right-aligned text ends at x; 13 px text is 7 px per glyph by the estimate.
        const own = [...t.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE)
        const width = own.map((n) => n.textContent ?? '').join('').length * 7
        return t.getAttribute('text-anchor') === 'end' ? x - width : x
      })
      return { x0, lefts }
    })

  it.each([
    ['right', 300],
    ['right', 60],
    ['bottom', 60],
    ['auto', 60],
  ])(
    'with legendPosition="%s" at %i px draws no list text left of its row or over the ring',
    (legendPosition, width) => {
      const { container } = renderChart({ legendPosition, width })
      for (const { name, value } of attributes(container)) {
        expect(value).not.toMatch(/NaN|Infinity/)
        if (['width', 'height', 'x2'].includes(name))
          expect(Number(value)).toBeGreaterThanOrEqual(0)
      }
      const rows = rowStarts(container)
      expect(rows).toHaveLength(5)
      const [ringX] = ringAt(container)
      for (const { x0, lefts } of rows) {
        expect(x0).toBeGreaterThanOrEqual(0)
        // Right of the ring when the list is on the right; nothing starts before the name column.
        if (legendPosition === 'right') expect(x0).toBeGreaterThanOrEqual(ringX * 2)
        for (const left of lefts) expect(left).toBeGreaterThanOrEqual(20)
      }
    },
  )

  it('keeps the values whole and lets them run past the right edge instead', () => {
    const { container } = renderChart({ legendPosition: 'right', width: 300 })
    expect(texts(container, 'donut-value')).toEqual([
      '773,000',
      '442,000',
      '294,000',
      '184,000',
      '147,000',
    ])
    // The list starts at 264 with no room: the columns start at the name column, 20 px in.
    const value = one(container, 'donut-value') as Element
    const percent = one(container, 'donut-percent') as Element
    expect(num(value, 'x')).toBe(20 + 49)
    expect(num(percent, 'x')).toBe(20 + 49 + 12 + 21)
    expect(num(one(container, 'donut-rule') as Element, 'x2')).toBe(36)
  })
})

describe('DonutChart rows that cannot be a part', () => {
  it('skips missing, non-numeric and negative values, warns once, and leaves them out of the total', () => {
    const warn = quiet()
    const data = [
      ...lines.slice(0, 4),
      { line: 'Missing', revenue: null },
      { line: 'Text', revenue: 'n/a' },
      { line: 'Refunds', revenue: -5 },
    ]
    const { container } = renderChart({ data })
    expect(texts(container, 'donut-name')).toEqual([
      'Installs',
      'Service plans',
      'Repairs',
      'Inspections',
    ])
    // Of 1,693,000: 45.66, 26.11, 17.37, 10.87.
    expect(texts(container, 'donut-percent')).toEqual(['46%', '26%', '17%', '11%'])
    expect(one(container, 'donut-total')?.textContent).toBe('1,693,000')
    for (const { value } of attributes(container)) expect(value).not.toMatch(/NaN/)
    expect(warnings(warn, 'DonutChart skipped a row')).toHaveLength(1)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('draws no slice for a zero row and does not warn', () => {
    const warn = quiet()
    const { container } = renderChart({
      data: [...lines.slice(0, 3), { line: 'None', revenue: 0 }],
    })
    expect(parts(container, 'donut-slice')).toHaveLength(3)
    expect(texts(container, 'donut-name')).not.toContain('None')
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('DonutChart degenerate totals', () => {
  it('draws one part as a full ring at 100%', () => {
    const { container } = renderChart({ data: [lines[0]] })
    const slices = parts(container, 'donut-slice')
    expect(slices).toHaveLength(1)
    expect(levels(container, 'donut-slice')).toEqual(['5'])
    expect(texts(container, 'donut-percent')).toEqual(['100%'])
    const [arc] = donutGeometry({ values: [773000], outer: 100, inner: 64, gap: 2, minArc: 2 })
    expect(slices[0]?.getAttribute('d')).toBe(arc?.path)
  })

  it('shows the empty state for all zeros and for no data', () => {
    const { container, unmount } = renderChart({ data: rowsOf([0, 0, 0]) })
    expect(one(container, 'empty')).not.toBeNull()
    expect(one(container, 'donut-slice')).toBeNull()
    unmount()
    const none = renderChart({ data: [] })
    expect(one(none.container, 'empty')).not.toBeNull()
  })

  it('shows the empty state when no row is valid', () => {
    quiet()
    const { container } = renderChart({ data: rowsOf([null, -1]) })
    expect(one(container, 'empty')).not.toBeNull()
  })

  it('draws a huge part and tiny ones, the tiny ones "<1%"', () => {
    const { container } = renderChart({ data: rowsOf([1000000, 1, 1]) })
    expect(parts(container, 'donut-slice')).toHaveLength(3)
    expect(texts(container, 'donut-percent')).toEqual(['100%', '<1%', '<1%'])
  })
})

const chartEl = () => screen.getByRole('application', { name: 'Revenue by service line' })
const live = (root: Element) => root.querySelector('[aria-live]')?.textContent
const press = (root: Element, ...keys: string[]) =>
  keys.map((key) => {
    fireEvent.keyDown(chartEl(), { key })
    return live(root)
  })
const slicesOf = (root: Element) => parts(root, 'donut-slice')
const hits = (root: Element) => parts(root, 'donut-hit')
const tooltipOf = (root: Element) => root.querySelector('[data-ch-part="tooltip"]')
const flags = (root: Element, part: string, attr: string) =>
  parts(root, part).map((el) => el.getAttribute(attr) === 'true')
const headers = () =>
  within(screen.getByRole('table'))
    .getAllByRole('columnheader')
    .map((th) => th.textContent)
const tableRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)
const rowText = (row: Element) => ({
  name: within(row as HTMLElement).getByRole('rowheader').textContent,
  cells: within(row as HTMLElement)
    .getAllByRole('cell')
    .map((c) => c.textContent),
})

describe('DonutChart keyboard and announcements', () => {
  it('announces each slice in ring order: position, name, value and share of the total', () => {
    const { container } = renderChart()
    fireEvent.focus(chartEl())
    expect(live(container)).toBe('1 of 5, Installs, 773,000, 42% of total')
    expect(press(container, 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'End')).toEqual([
      '2 of 5, Service plans, 442,000, 24% of total',
      '1 of 5, Installs, 773,000, 42% of total',
      '2 of 5, Service plans, 442,000, 24% of total',
      '1 of 5, Installs, 773,000, 42% of total',
      '5 of 5, Other, 147,000, 8% of total',
    ])
    expect(press(container, 'Home')).toEqual(['1 of 5, Installs, 773,000, 42% of total'])
  })

  it('takes "Other" and "of total" from ChartsProvider messages', () => {
    const { container } = render(
      <ChartsProvider messages={{ other: 'Pozostałe', ofTotal: 'całości' }}>
        <DonutChart<Line>
          data={lines}
          x="line"
          y={(d) => Number(d.revenue)}
          width={584}
          title="Revenue by service line"
          animate={false}
        />
      </ChartsProvider>,
    )
    expect(texts(container, 'donut-name')[4]).toBe('Pozostałe')
    fireEvent.focus(chartEl())
    expect(press(container, 'End')).toEqual(['5 of 5, Pozostałe, 147,000, 8% całości'])
    expect(tooltipOf(container)).toHaveTextContent('8% całości')
    expect(container.textContent).not.toContain('of total')
  })

  it('counts slices only: a skipped row has no point, but keeps its table row', () => {
    quiet()
    const { container } = renderChart({
      data: [...lines.slice(0, 2), { line: 'Missing', revenue: null }, ...lines.slice(2, 4)],
    })
    fireEvent.focus(chartEl())
    expect(live(container)).toBe('1 of 4, Installs, 773,000, 46% of total')
    expect(press(container, 'End')).toEqual(['4 of 4, Inspections, 184,000, 11% of total'])
    expect(hits(container)).toHaveLength(4)
    const rows = tableRows()
    expect(rows).toHaveLength(5)
    expect(rowText(rows[2] as Element)).toEqual({
      name: 'Missing',
      cells: ['—no value', '—no value'],
    })
  })
})

describe('DonutChart pointer and tooltip', () => {
  it('covers each list row with a hit rect', () => {
    const { container } = renderChart()
    const rects = hits(container)
    expect(rects).toHaveLength(5)
    for (const r of rects) {
      expect([num(r, 'x'), num(r, 'y'), num(r, 'width'), num(r, 'height')]).toEqual([0, 0, 320, 40])
      expect(r.getAttribute('fill')).toBe('transparent')
      // Last in its row, over the swatch and the rule.
      expect(r.parentElement?.lastElementChild).toBe(r)
    }
  })

  it('shows the name, the value and the share on hover of a slice or of its list row', () => {
    const { container } = renderChart()
    fireEvent.pointerEnter(slicesOf(container)[2] as Element)
    for (const text of ['Repairs', '294,000', '16% of total']) {
      expect(tooltipOf(container)).toHaveTextContent(text)
    }
    fireEvent.pointerEnter(slicesOf(container)[0] as Element)
    expect(tooltipOf(container)).toHaveTextContent('Installs')
    fireEvent.pointerEnter(hits(container)[2] as Element)
    for (const text of ['Repairs', '294,000', '16% of total']) {
      expect(tooltipOf(container)).toHaveTextContent(text)
    }
  })

  it('registers one point per slice in ring order, at the slice centroid', () => {
    renderChart()
    const arcs = donutGeometry({
      values: [773000, 442000, 294000, 184000, 147000],
      outer: 100,
      inner: 64,
      gap: 2,
      minArc: 2,
    })
    const points = registered.at(-1) ?? []
    expect(points.map((p) => p.id)).toEqual([0, 1, 2, 3, 'other'])
    expect(points.map((p) => p.selectable)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      false,
    ])
    // The ring centre is at (116, 116); centroids are relative to it.
    points.forEach((p, i) => {
      const [cx, cy] = arcs[i]?.centroid ?? [0, 0]
      expect(p.x).toBeCloseTo(116 + cx, 2)
      expect(p.y).toBeCloseTo(116 + cy, 2)
    })
    expect(points[2]?.segments.map((s) => s.value)).toEqual(['Repairs', '294,000', '16% of total'])
    expect(points[4]?.datum).toBeUndefined()
  })

  it('draws no tooltip with tooltip={false}', () => {
    const { container } = renderChart({ tooltip: false })
    fireEvent.pointerEnter(slicesOf(container)[2] as Element)
    expect(tooltipOf(container)).toBeNull()
  })

  it('passes the user row to a function tooltip, and shows the default pill for "Other"', () => {
    const seen: unknown[] = []
    const { container } = renderChart({
      tooltip: (point: ChartPoint<Line>) => {
        seen.push(point.datum)
        return <span>custom</span>
      },
    })
    fireEvent.pointerEnter(slicesOf(container)[2] as Element)
    expect(tooltipOf(container)).toHaveTextContent('custom')
    expect(seen).toContain(lines[2])
    const before = seen.length
    fireEvent.pointerEnter(slicesOf(container)[4] as Element)
    expect(seen).toHaveLength(before)
    expect(tooltipOf(container)).not.toHaveTextContent('custom')
    expect(tooltipOf(container)).toHaveTextContent('Other')
    expect(tooltipOf(container)).toHaveTextContent('8% of total')
  })

  it('activates the tapped row on touch, and keeps it when the tap ends', () => {
    const { container } = renderChart()
    const row = hits(container)[2] as Element
    // A touch tap sends pointerover/enter and pointerdown, but no pointermove.
    fireEvent.pointerEnter(row, { pointerType: 'touch' })
    fireEvent.pointerDown(row, { pointerType: 'touch' })
    fireEvent.pointerLeave(container.querySelector('figure') as Element, { pointerType: 'touch' })
    expect(tooltipOf(container)).toHaveTextContent('Repairs')
    expect(flags(container, 'donut-row', 'data-ch-active')).toEqual([
      false,
      false,
      true,
      false,
      false,
    ])
  })

  it('clears the active slice when the mouse moves into the hole or a gap', () => {
    const { container } = renderChart()
    const svg = container.querySelector('svg') as Element
    fireEvent.pointerEnter(slicesOf(container)[2] as Element, { pointerType: 'mouse' })
    expect(tooltipOf(container)).toHaveTextContent('Repairs')
    fireEvent.pointerLeave(slicesOf(container)[2] as Element, {
      pointerType: 'mouse',
      relatedTarget: svg,
    })
    expect(tooltipOf(container)).toBeNull()
    expect(container.querySelector('[data-ch-dimmed], [data-ch-active]')).toBeNull()
    // The same for a list row left for the space beside the list.
    fireEvent.pointerEnter(hits(container)[1] as Element, { pointerType: 'mouse' })
    expect(tooltipOf(container)).toHaveTextContent('Service plans')
    fireEvent.pointerLeave(hits(container)[1] as Element, {
      pointerType: 'mouse',
      relatedTarget: svg,
    })
    expect(tooltipOf(container)).toBeNull()
  })

  it('falls back to the keyboard slice when the hover ends while the plot has focus', () => {
    const { container } = renderChart()
    fireEvent.focus(chartEl())
    expect(live(container)).toBe('1 of 5, Installs, 773,000, 42% of total')
    fireEvent.pointerEnter(slicesOf(container)[2] as Element, { pointerType: 'mouse' })
    expect(flags(container, 'donut-row', 'data-ch-active')).toEqual([
      false,
      false,
      true,
      false,
      false,
    ])
    fireEvent.pointerLeave(slicesOf(container)[2] as Element, {
      pointerType: 'mouse',
      relatedTarget: container.querySelector('svg'),
    })
    expect(flags(container, 'donut-row', 'data-ch-active')).toEqual([
      true,
      false,
      false,
      false,
      false,
    ])
    expect(tooltipOf(container)).toHaveTextContent('Installs')
  })

  it('keeps a slice active when the mouse moves straight to the next slice or row', () => {
    const onActiveChange = vi.fn()
    const { container } = renderChart({ onActiveChange })
    const slices = slicesOf(container)
    fireEvent.pointerEnter(slices[1] as Element, { pointerType: 'mouse' })
    fireEvent.pointerLeave(slices[1] as Element, {
      pointerType: 'mouse',
      relatedTarget: slices[2],
    })
    expect(tooltipOf(container)).toHaveTextContent('Repairs')
    fireEvent.pointerLeave(slices[2] as Element, {
      pointerType: 'mouse',
      relatedTarget: hits(container)[3],
    })
    expect(tooltipOf(container)).toHaveTextContent('Inspections')
    // Never cleared on the way.
    expect(onActiveChange.mock.calls.map((c) => c[0])).toEqual([1, 2, 3])
  })

  it('keeps a tapped slice when a touch leaves it', () => {
    const { container } = renderChart()
    fireEvent.pointerEnter(slicesOf(container)[2] as Element, { pointerType: 'touch' })
    fireEvent.pointerLeave(slicesOf(container)[2] as Element, {
      pointerType: 'touch',
      relatedTarget: container.querySelector('svg'),
    })
    expect(tooltipOf(container)).toHaveTextContent('Repairs')
  })

  it('clears the active slice when the mouse leaves', () => {
    const { container } = renderChart()
    fireEvent.pointerEnter(slicesOf(container)[1] as Element, { pointerType: 'mouse' })
    expect(tooltipOf(container)).toHaveTextContent('Service plans')
    fireEvent.pointerLeave(container.querySelector('figure') as Element, { pointerType: 'mouse' })
    expect(tooltipOf(container)).toBeNull()
    expect(container.querySelector('[data-ch-dimmed]')).toBeNull()
  })
})

describe('DonutChart selection', () => {
  it('selects on click of a slice or a list row with the row id and the user row', () => {
    const onSelect = vi.fn()
    const { container, unmount } = renderChart({ onSelect })
    fireEvent.click(slicesOf(container)[2] as Element)
    fireEvent.click(hits(container)[0] as Element)
    expect(onSelect).toHaveBeenCalledTimes(2)
    const [id, point] = onSelect.mock.calls[0] as [unknown, ChartPoint<Line>]
    expect(id).toBe(2)
    expect(point.datum).toBe(lines[2])
    expect(onSelect.mock.calls[1]?.[0]).toBe(0)
    expect((onSelect.mock.calls[1]?.[1] as ChartPoint<Line> | undefined)?.datum).toBe(lines[0])
    unmount()
    const byId = vi.fn()
    const named = renderChart({ onSelect: byId, id: 'line' })
    fireEvent.click(slicesOf(named.container)[0] as Element)
    expect(byId.mock.calls[0]?.[0]).toBe('Installs')
  })

  it('never selects "Other": not by click, not by Enter', () => {
    const onSelect = vi.fn()
    const { container } = renderChart({ onSelect })
    fireEvent.click(slicesOf(container)[4] as Element)
    fireEvent.click(hits(container)[4] as Element)
    fireEvent.focus(chartEl())
    press(container, 'End', 'Enter', ' ')
    expect(onSelect).not.toHaveBeenCalled()
    // The parts are selectable, "Other" is not.
    expect(flags(container, 'donut-slice', 'data-ch-selectable')).toEqual([
      true,
      true,
      true,
      true,
      false,
    ])
    expect(flags(container, 'donut-hit', 'data-ch-selectable')).toEqual([
      true,
      true,
      true,
      true,
      false,
    ])
  })

  it('marks nothing selectable without onSelect', () => {
    const { container } = renderChart()
    expect(container.querySelector('[data-ch-selectable]')).toBeNull()
  })

  it('reports "Other" to onActiveChange with an undefined datum', () => {
    const onActiveChange = vi.fn()
    const { container } = renderChart({ onActiveChange })
    fireEvent.pointerEnter(slicesOf(container)[4] as Element)
    const [id, point] = onActiveChange.mock.calls.at(-1) as [unknown, ChartPoint<Line>]
    expect(id).toBe('other')
    expect(point.datum).toBeUndefined()
    fireEvent.pointerEnter(hits(container)[1] as Element)
    expect((onActiveChange.mock.calls.at(-1)?.[1] as ChartPoint<Line> | undefined)?.datum).toBe(
      lines[1],
    )
  })
})

describe('DonutChart active slice', () => {
  it('dims the other slices and swatches, and marks the active row', () => {
    const { container } = renderChart({ activeId: 2 })
    expect(flags(container, 'donut-slice', 'data-ch-dimmed')).toEqual([
      true,
      true,
      false,
      true,
      true,
    ])
    expect(flags(container, 'donut-swatch', 'data-ch-dimmed')).toEqual([
      true,
      true,
      false,
      true,
      true,
    ])
    expect(flags(container, 'donut-row', 'data-ch-active')).toEqual([
      false,
      false,
      true,
      false,
      false,
    ])
    // Text is never dimmed.
    expect(container.querySelector('text[data-ch-dimmed], g[data-ch-dimmed]')).toBeNull()
  })

  it('dims "Other" like any slice', () => {
    const { container } = renderChart({ activeId: 'other' })
    expect(flags(container, 'donut-slice', 'data-ch-dimmed')).toEqual([
      true,
      true,
      true,
      true,
      false,
    ])
    expect(flags(container, 'donut-row', 'data-ch-active')).toEqual([
      false,
      false,
      false,
      false,
      true,
    ])
  })

  it('dims nothing with dimInactive={false}, and still marks the active row', () => {
    const { container } = renderChart({ activeId: 2, dimInactive: false })
    expect(container.querySelector('[data-ch-dimmed]')).toBeNull()
    expect(flags(container, 'donut-row', 'data-ch-active')).toEqual([
      false,
      false,
      true,
      false,
      false,
    ])
  })

  it('dims nothing and marks no row without an active slice', () => {
    const { container } = renderChart()
    expect(container.querySelector('[data-ch-dimmed], [data-ch-active]')).toBeNull()
  })

  it('never changes the ring', () => {
    const d = (props: Props) =>
      slicesOf(renderChart(props).container).map((s) => s.getAttribute('d'))
    expect(d({ activeId: 2 })).toEqual(d({}))
  })
})

describe('DonutChart ids', () => {
  it('warns about repeated ids from an id accessor returning "other", and does not throw', () => {
    const warn = quiet()
    const { container } = renderChart({ id: () => 'other' })
    expect(slicesOf(container)).toHaveLength(5)
    expect(warnings(warn, 'duplicate id')).toHaveLength(1)
    fireEvent.focus(chartEl())
    expect(press(container, 'End')).toEqual(['5 of 5, Other, 147,000, 8% of total'])
  })

  it('warns when a part takes the id "other" of the grouped slice', () => {
    const warn = quiet()
    const { container } = renderChart({
      id: (d: Line) => (d.line === 'Installs' ? 'other' : d.line),
    })
    expect(slicesOf(container)).toHaveLength(5)
    expect(warnings(warn, 'DonutChart row id "other"')).toHaveLength(1)
    fireEvent.focus(chartEl())
    expect(live(container)).toBe('1 of 4, Installs, 773,000, 42% of total')
  })

  it('does not warn about a row id "other" when nothing is grouped', () => {
    const warn = quiet()
    renderChart({ data: five, id: (d: Line) => (d.line === 'Installs' ? 'other' : d.line) })
    expect(warn).not.toHaveBeenCalled()
  })
})

describe('DonutChart points registration', () => {
  it('registers the same points array again when re-rendered with the same props', () => {
    const view = () => (
      <DonutChart<Line>
        data={lines}
        x={(d) => d.line}
        y={(d) => Number(d.revenue)}
        id={(d) => d.line}
        format={(v: number) => v.toLocaleString('en-US')}
        width={584}
        title="Revenue by service line"
        animate={false}
      />
    )
    const { rerender } = render(view())
    const first = registered.at(-1)
    expect(first).toHaveLength(5)
    rerender(view())
    rerender(view())
    expect(registered.at(-1)).toBe(first)
  })

  it('registers new points when a value changes', () => {
    const { rerender } = render(
      <DonutChart<Line> data={lines} x="line" y="revenue" width={584} title="R" animate={false} />,
    )
    const first = registered.at(-1)
    rerender(
      <DonutChart<Line>
        data={lines.map((l, i) => (i === 1 ? { ...l, revenue: 400000 } : l))}
        x="line"
        y="revenue"
        width={584}
        title="R"
        animate={false}
      />,
    )
    expect(registered.at(-1)).not.toBe(first)
  })
})

describe('DonutChart data table', () => {
  it('lists every row in data order: part, value and share', () => {
    renderChart()
    expect(headers()).toEqual(['Line', 'Value', 'Share'])
    const rows = tableRows()
    expect(rows.map((r) => rowText(r).name)).toEqual(lines.map((l) => l.line))
    expect(rowText(rows[4] as Element)).toEqual({ name: 'Maintenance', cells: ['62,000', '3%'] })
    const shares = rows.map((r) => Number.parseInt(rowText(r).cells[1] ?? '', 10))
    expect(shares.reduce((a, b) => a + b, 0)).toBe(100)
  })

  it('falls back to "Part" for a function accessor', () => {
    renderChart({ x: (d: Line) => d.line })
    expect(headers()[0]).toBe('Part')
  })

  it('reads a zero row as "0%"', () => {
    renderChart({ data: [...lines.slice(0, 3), { line: 'None', revenue: 0 }] })
    expect(rowText(tableRows()[3] as Element)).toEqual({ name: 'None', cells: ['0', '0%'] })
  })

  it('renames columns with dataTable.columns, and drops the table with dataTable={false}', () => {
    const { unmount } = renderChart({ dataTable: { columns: { Value: 'Revenue' } } })
    expect(headers()).toEqual(['Line', 'Revenue', 'Share'])
    unmount()
    renderChart({ dataTable: false })
    expect(screen.queryByRole('table')).toBeNull()
  })
})
