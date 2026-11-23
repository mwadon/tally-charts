import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChartsProvider } from '../ChartsProvider'
import { DonutChart, type DonutChartProps } from './DonutChart'
import { donutGeometry } from './donut-geometry'

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
    const name = row.querySelector('[data-ch-part="donut-name"]')?.textContent ?? ''
    expect(name.endsWith('…')).toBe(true)
    expect(name.length).toBeLessThan(40)
    expect(row.querySelector('title')?.textContent).toBe(long)
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
    // Alone, it is centred on the ring.
    expect(Math.abs(num(total as Element, 'y'))).toBeLessThan(14)
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
