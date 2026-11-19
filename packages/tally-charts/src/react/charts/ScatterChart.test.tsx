import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ScatterChart, type ScatterChartProps } from './ScatterChart'

interface Job {
  name: string
  estimate: number | null | string
  margin: number | string | null
  hours: number | undefined
}

const rows: [string, number, number, number][] = [
  ['Alder Court', 8000, 44, 40],
  ['Birch Lane', 12000, 38, 58],
  ['Cedar Row', 15000, 52, 40],
  ['Dune House', 22000, 41, 103],
  ['Elm Terrace', 26000, 35, 79],
  ['Fern Hill', 34000, 46, 103],
  ['Grove Flats', 38000, 33, 160],
  ['Hazel Yard', 48000, 39, 160],
  ['Ivy Works', 60000, 36, 231],
  ['Juniper Mill', 88000, 34, 520],
  ['Kestrel Barn', 18000, 29, 79],
  ['Larch Depot', 30000, 24, 130],
  ['Maple Arcade', 44000, 18, 231],
  ['North Quay', 55000, 27, 271],
  ['Orchard Mews', 74000, 30, 361],
  ['Harbor Lofts', 68000, 12, 410],
]
const jobs: Job[] = rows.map(([name, estimate, margin, hours]) => ({
  name,
  estimate,
  margin,
  hours,
}))

const WIDTH = 600
const HEIGHT = 280

function props(extra: Partial<ScatterChartProps<Job>> = {}): ScatterChartProps<Job> {
  return {
    title: 'Job size against margin',
    data: jobs,
    x: 'estimate' as never,
    y: 'margin' as never,
    size: 'hours' as never,
    label: 'name',
    xLabel: 'Estimate',
    yLabel: 'Margin',
    sizeLabel: 'Hours',
    xFormat: 'currency-compact',
    yFormat: (v: number) => `${v}%`,
    sizeFormat: (v: number) => `${v} h`,
    tone: (j: Job) => (Number(j.margin) < 32 ? 'loss' : 'accent'),
    target: { value: 32, label: 'target 32%' },
    xDomain: [0, 100000],
    yDomain: [0, 60],
    width: WIDTH,
    height: HEIGHT,
    animate: false,
    ...extra,
  }
}

function renderScatter(extra: Partial<ScatterChartProps<Job>> = {}) {
  return render(<ScatterChart<Job> {...props(extra)} />)
}

const parts = (root: HTMLElement, part: string) => [
  ...root.querySelectorAll(`[data-ch-part="${part}"]`),
]
const bubbles = (root: HTMLElement) => parts(root, 'bubble')
const num = (el: Element, attr: string) => Number(el.getAttribute(attr))
const quiet = () => vi.spyOn(console, 'warn').mockImplementation(() => {})
/** Plot width: the target line runs the whole of it. */
const plotWidth = (root: HTMLElement) => num(parts(root, 'target')[0] as Element, 'x2')
const noBadNumbers = (root: HTMLElement) => {
  for (const el of root.querySelectorAll('*')) {
    for (const attr of ['cx', 'cy', 'r', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'width', 'height']) {
      const value = el.getAttribute(attr)
      if (value === null) continue
      expect(value, `${el.tagName} ${attr}`).not.toMatch(/NaN|undefined/)
    }
  }
  for (const el of root.querySelectorAll('[r], [width], [height]')) {
    for (const attr of ['r', 'width', 'height']) {
      const value = el.getAttribute(attr)
      if (value !== null && /^-?[\d.]+$/.test(value))
        expect(Number(value)).toBeGreaterThanOrEqual(0)
    }
  }
}

describe('<ScatterChart> bubbles', () => {
  it('draws one bubble per row, toned per row', () => {
    const { container } = renderScatter()
    const all = bubbles(container)
    expect(all).toHaveLength(16)
    expect(all.filter((b) => b.getAttribute('data-ch-tone') === 'loss')).toHaveLength(6)
    expect(all.filter((b) => b.getAttribute('data-ch-tone') === 'accent')).toHaveLength(10)
  })

  it('takes a constant tone, and defaults to accent', () => {
    const warn = renderScatter({ tone: 'warn' })
    expect(bubbles(warn.container).every((b) => b.getAttribute('data-ch-tone') === 'warn')).toBe(
      true,
    )
    warn.unmount()
    const plain = renderScatter({ tone: undefined })
    expect(bubbles(plain.container).every((b) => b.getAttribute('data-ch-tone') === 'accent')).toBe(
      true,
    )
  })

  it('places a bubble on the scales', () => {
    const { container } = renderScatter()
    const w = plotWidth(container)
    const h = HEIGHT - 32 - 48
    const harbor = bubbles(container).find(
      (b) => Math.abs(num(b, 'r') - 18 * Math.sqrt(410 / 520)) < 0.01,
    ) as Element
    expect(harbor).toBeDefined()
    expect(num(harbor, 'cx')).toBeCloseTo(0.68 * w, 5)
    expect(num(harbor, 'cy')).toBeCloseTo(h * (1 - 12 / 60), 5)
  })

  it('sizes the area by the value', () => {
    const { container } = renderScatter()
    const radii = bubbles(container).map((b) => num(b, 'r'))
    expect(Math.max(...radii)).toBe(18)
    expect(radii.some((r) => Math.abs(r - 18 * Math.sqrt(410 / 520)) < 0.01)).toBe(true)
    const small = renderScatter({ maxRadius: 10 })
    const smallRadii = bubbles(small.container).map((b) => num(b, 'r'))
    expect(Math.max(...smallRadii)).toBe(10)
    expect(smallRadii.some((r) => Math.abs(r - 10 * Math.sqrt(410 / 520)) < 0.01)).toBe(true)
  })

  it('draws dots of `radius` without size', () => {
    const plain = renderScatter({ size: undefined })
    expect(bubbles(plain.container).every((b) => num(b, 'r') === 5)).toBe(true)
    plain.unmount()
    const three = renderScatter({ size: undefined, radius: 3 })
    expect(bubbles(three.container).every((b) => num(b, 'r') === 3)).toBe(true)
  })

  it('draws larger bubbles first and keeps a 3 px minimum', () => {
    const data = [...jobs, { name: 'Tiny', estimate: 5000, margin: 20, hours: 1 }]
    const { container } = renderScatter({ data })
    const radii = bubbles(container).map((b) => num(b, 'r'))
    expect(radii).toHaveLength(17)
    expect(radii).toEqual([...radii].sort((a, b) => b - a))
    expect(radii.at(-1)).toBe(3)
  })

  it('keeps data order between bubbles of the same radius', () => {
    const { container } = renderScatter()
    // Alder Court (8000) and Cedar Row (15000) both have 40 hours: the smallest bubbles.
    const smallest = bubbles(container).filter(
      (b) => b.getAttribute('r') === bubbles(container).at(-1)?.getAttribute('r'),
    )
    const xs = smallest.map((b) => num(b, 'cx'))
    expect(xs).toHaveLength(2)
    expect(xs[0]).toBeLessThan(xs[1] as number)
  })

  it('sets only the swatch colour inline, so the stylesheet owns the fill', () => {
    const { container } = renderScatter({ tone: 'loss' })
    const b = bubbles(container)[0] as SVGElement
    expect(b.style.fill).toBe('')
    expect(b.style.getPropertyValue('--_ch-swatch-color')).toBe('var(--ch-loss)')
  })

  it('draws the target under the bubbles', () => {
    const { container } = renderScatter()
    const line = parts(container, 'target')[0] as Element
    const group = parts(container, 'bubbles')[0] as Element
    expect(line.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('calls tone with the user datum, the index and the data array', () => {
    const tone = vi.fn((_j: Job, _i: number, _all: readonly Job[]) => 'accent' as const)
    renderScatter({ tone })
    expect(tone).toHaveBeenCalled()
    const [datum, index, all] = tone.mock.calls[0] as [Job, number, readonly Job[]]
    expect(datum).toBe(jobs[0])
    expect(index).toBe(0)
    expect(all).toBe(jobs)
    expect(tone.mock.calls.some(([d, i]) => d === jobs[i])).toBe(true)
  })
})

describe('<ScatterChart> rows that cannot be drawn', () => {
  const bad: Job[] = [
    ...jobs.slice(0, 4),
    { name: 'No x', estimate: null, margin: 30, hours: 50 },
    { name: 'Text y', estimate: 20000, margin: 'n/a', hours: 50 },
    { name: 'Negative', estimate: 20000, margin: 30, hours: -5 },
    { name: 'No size', estimate: 20000, margin: 30, hours: undefined },
  ]

  it('skips them without NaN and warns once per kind', () => {
    const warn = quiet()
    const { container, rerender } = renderScatter({ data: bad })
    expect(bubbles(container)).toHaveLength(4)
    noBadNumbers(container)
    rerender(<ScatterChart<Job> {...props({ data: bad })} />)
    const messages = warn.mock.calls.map((c) => String(c[0]))
    expect(messages.filter((m) => m.includes('missing or non-numeric x or y'))).toHaveLength(1)
    expect(
      messages.filter((m) => m.includes('missing, non-numeric or negative size')),
    ).toHaveLength(1)
    warn.mockRestore()
  })

  it('skips a row outside an explicit domain without a warning', () => {
    const warn = quiet()
    const data = [...jobs, { name: 'Far', estimate: 150000, margin: 30, hours: 50 }]
    const { container } = renderScatter({ data })
    expect(bubbles(container)).toHaveLength(16)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('draws 3 px dots when every size is zero', () => {
    const data = jobs.map((j) => ({ ...j, hours: 0 }))
    const { container } = renderScatter({ data })
    expect(bubbles(container)).toHaveLength(16)
    expect(bubbles(container).every((b) => num(b, 'r') === 3)).toBe(true)
    noBadNumbers(container)
  })

  it('draws one row, and a zero size next to missing ones', () => {
    const one = renderScatter({ data: [jobs[0] as Job] })
    expect(bubbles(one.container)).toHaveLength(1)
    expect(num(bubbles(one.container)[0] as Element, 'r')).toBe(18)
    one.unmount()
    const warn = quiet()
    const data = [
      { name: 'A', estimate: 10000, margin: 20, hours: 0 },
      { name: 'B', estimate: 20000, margin: 30, hours: undefined },
    ]
    const { container } = renderScatter({ data })
    expect(bubbles(container)).toHaveLength(1)
    expect(num(bubbles(container)[0] as Element, 'r')).toBe(3)
    noBadNumbers(container)
    warn.mockRestore()
  })
})

describe('<ScatterChart> domains', () => {
  /** Tick labels of one axis, as numbers (the number format has no separators below 1000). */
  const ticks = (root: HTMLElement, axis: 'x' | 'y') =>
    [...root.querySelectorAll('[data-ch-part="axis"]')]
      .filter(
        (a) =>
          (a.querySelector('[data-ch-part="axis-label"]')?.getAttribute('text-anchor') ===
            'end') ===
          (axis === 'y'),
      )
      .flatMap((a) => [...a.querySelectorAll('[data-ch-part="axis-label"]')])
      .map((t) => Number((t.textContent ?? '').replace(/,/g, '')))

  const plain = {
    xDomain: undefined,
    yDomain: undefined,
    xFormat: 'number',
    yFormat: 'number',
  } as const

  it('starts both axes at zero and reaches the data', () => {
    const { container } = renderScatter({ ...plain, target: undefined })
    const x = ticks(container, 'x')
    const y = ticks(container, 'y')
    expect(x[0]).toBe(0)
    expect(x.at(-1)).toBeGreaterThanOrEqual(88000)
    expect(y[0]).toBe(0)
    expect(y.at(-1)).toBeGreaterThanOrEqual(52)
  })

  it('reaches a target above every point in the default y domain', () => {
    const below = renderScatter({ ...plain, target: 32 })
    expect(ticks(below.container, 'y').at(-1)).toBeLessThan(80)
    below.unmount()
    const { container } = renderScatter({ ...plain, target: 80 })
    expect(ticks(container, 'y').at(-1)).toBeGreaterThanOrEqual(80)
    expect(parts(container, 'target')).toHaveLength(1)
  })
})

describe('<ScatterChart> target', () => {
  it('draws the line at the value and the label right of the plot', () => {
    const { container } = renderScatter()
    const h = HEIGHT - 32 - 48
    const line = parts(container, 'target')
    expect(line).toHaveLength(1)
    expect(num(line[0] as Element, 'y1')).toBeCloseTo(h * (1 - 32 / 60), 5)
    const label = parts(container, 'target-label')
    expect(label).toHaveLength(1)
    expect(label[0]?.textContent).toBe('target 32%')
    expect(num(label[0] as Element, 'x')).toBeGreaterThan(plotWidth(container))
    expect(num(label[0] as Element, 'y')).toBeCloseTo(h * (1 - 32 / 60), 5)
  })

  it('shrinks the plot for the label', () => {
    const labelled = renderScatter()
    const bare = renderScatter({ target: 32 })
    expect(plotWidth(labelled.container)).toBeLessThan(plotWidth(bare.container))
    expect(parts(bare.container, 'target')).toHaveLength(1)
    expect(parts(bare.container, 'target-label')).toHaveLength(0)
  })

  it('draws nothing for a target outside an explicit y domain and keeps the margin', () => {
    const out = renderScatter({ target: { value: 90, label: 'x' } })
    expect(parts(out.container, 'target')).toHaveLength(0)
    expect(parts(out.container, 'target-label')).toHaveLength(0)
    const none = renderScatter({ target: undefined })
    const w = (root: HTMLElement) => num(parts(root, 'grid-line')[0] as Element, 'x2')
    expect(w(out.container)).toBe(w(none.container))
  })
})

describe('<ScatterChart> axis names and axes', () => {
  it('names the axes outside the plot and makes room', () => {
    const { container } = renderScatter({ target: undefined })
    const titles = parts(container, 'axis-title')
    expect(titles.map((t) => t.textContent)).toEqual(['Margin', 'Estimate'])
    const [yTitle, xTitle] = titles as Element[]
    const w = num(parts(container, 'grid-line')[0] as Element, 'x2')
    expect(num(yTitle as Element, 'x')).toBe(-44)
    expect(num(yTitle as Element, 'y')).toBe(-14)
    expect(yTitle?.getAttribute('text-anchor')).toBe('start')
    expect(num(xTitle as Element, 'x')).toBe(w)
    expect(num(xTitle as Element, 'y')).toBe(HEIGHT - 32 - 48 + 40)
    expect(xTitle?.getAttribute('text-anchor')).toBe('end')
    const bare = renderScatter({ target: undefined, xLabel: undefined, yLabel: undefined })
    const lineY = (root: HTMLElement) =>
      parts(root, 'grid-line')
        .map((l) => num(l, 'y1'))
        .filter((v) => v > 0)
    expect(Math.max(...lineY(container))).toBeLessThan(Math.max(...lineY(bare.container)))
  })

  it('leaves out a name whose axis is none', () => {
    const noY = renderScatter({ yAxis: 'none' })
    expect(parts(noY.container, 'axis-title').map((t) => t.textContent)).toEqual(['Estimate'])
    noY.unmount()
    const noX = renderScatter({ xAxis: 'none' })
    expect(parts(noX.container, 'axis-title').map((t) => t.textContent)).toEqual(['Margin'])
  })

  it('draws a grid and both axes, and each can be removed', () => {
    const { container } = renderScatter()
    expect(parts(container, 'grid-line').length).toBeGreaterThan(0)
    expect(parts(container, 'axis').length).toBe(2)
    const noGrid = renderScatter({ grid: false })
    expect(parts(noGrid.container, 'grid-line')).toHaveLength(0)
    noGrid.unmount()
    const noX = renderScatter({ xAxis: 'none' })
    expect(parts(noX.container, 'axis')).toHaveLength(1)
    noX.unmount()
    const noY = renderScatter({ yAxis: 'none' })
    expect(parts(noY.container, 'axis')).toHaveLength(1)
  })

  it('formats the axes with xFormat and yFormat unless an axis format is given', () => {
    const { container } = renderScatter()
    const labels = parts(container, 'axis-label').map((t) => t.textContent ?? '')
    expect(labels).toContain('$60K')
    expect(labels).toContain('30%')
    const custom = renderScatter({
      xAxisFormat: (v) => `x${v}`,
      yAxisFormat: (v) => `y${v}`,
    })
    const text = parts(custom.container, 'axis-label').map((t) => t.textContent ?? '')
    expect(text).toContain('x60000')
    expect(text).toContain('y30')
    expect(text).not.toContain('$60K')
  })
})

describe('<ScatterChart> edge cases', () => {
  it('survives a 60 px wide chart', () => {
    const { container } = renderScatter({ width: 60 })
    noBadNumbers(container)
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('shows the empty content without data', () => {
    renderScatter({ data: [], empty: 'Nothing here' })
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('accepts the props of the points without breaking', () => {
    const { container } = renderScatter({ id: 'name', tooltip: false, dataTable: false })
    expect(bubbles(container)).toHaveLength(16)
  })
})
