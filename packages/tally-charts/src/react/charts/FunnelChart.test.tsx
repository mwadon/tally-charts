import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChartsProvider } from '../ChartsProvider'
import type { ChartPoint } from '../types'
import { FunnelChart, type FunnelChartProps, type FunnelSeries } from './FunnelChart'
import { funnelGeometry } from './funnel-geometry'

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

type Step = {
  step: string
  count: unknown
  referral: number
  website: number
  ads: number
  other: number
}

const steps: Step[] = [
  { step: 'Leads', count: 1240, referral: 420, website: 380, ads: 300, other: 140 },
  { step: 'Site visits', count: 806, referral: 330, website: 250, ads: 150, other: 76 },
  { step: 'Quotes sent', count: 532, referral: 250, website: 160, ads: 80, other: 42 },
  { step: 'Quotes accepted', count: 298, referral: 170, website: 80, ads: 30, other: 18 },
  { step: 'Jobs paid', count: 262, referral: 155, website: 68, ads: 24, other: 15 },
]
const counts = [1240, 806, 532, 298, 262]

const bySource: FunnelSeries<Step>[] = [
  { id: 'referral', label: 'Referral', value: 'referral' },
  { id: 'website', label: 'Website', value: 'website' },
  { id: 'ads', label: 'Ads', value: 'ads' },
  { id: 'other', label: 'Other', value: 'other', tone: 'neutral' },
]

/** Steps with the given counts and names "Step 1", "Step 2", … */
const stepsOf = (values: readonly unknown[]): Step[] =>
  values.map((count, i) => ({
    step: `Step ${i + 1}`,
    count,
    referral: 0,
    website: 0,
    ads: 0,
    other: 0,
  }))

/** Any props, so a test can also pass the invalid `y` with `series`. */
type Props = Record<string, unknown>

/** A 584 px horizontal chart of `steps` by `count`, unless `props` says otherwise. */
function renderChart(props: Props = {}) {
  const base = props.series === undefined && !('y' in props) ? { y: 'count' } : {}
  const all = {
    data: steps,
    x: 'step',
    width: 584,
    orientation: 'horizontal',
    title: 'From lead to paid job',
    animate: false,
    ...base,
    ...props,
  } as unknown as FunnelChartProps<Step>
  return render(<FunnelChart<Step> {...all} />)
}

const parts = (root: Element, part: string) => [
  ...root.querySelectorAll<SVGElement>(`[data-ch-part="${part}"]`),
]
const num = (el: Element, attr: string) => Number(el.getAttribute(attr))
const texts = (root: Element, part: string) => parts(root, part).map((el) => el.textContent)
const tone = (el: Element) => el.getAttribute('data-ch-tone')
const orientationOf = (root: Element) =>
  root.querySelector('[data-ch-orientation]')?.getAttribute('data-ch-orientation')
const svgHeight = (root: Element) => num(root.querySelector('svg') as Element, 'height')
const quiet = () => vi.spyOn(console, 'warn').mockImplementation(() => {})
const rateOf = (step: Element) =>
  step.querySelector('[data-ch-part="funnel-rate"]')?.textContent ?? null
const weakest = (root: Element) =>
  parts(root, 'funnel-rate')
    .filter((el) => el.getAttribute('data-ch-weakest') === 'true')
    .map((el) => el.textContent)
/** Every attribute value in the chart, to look for NaN, Infinity and negative sizes. */
const attributes = (root: Element) =>
  [...root.querySelectorAll('*')].flatMap((el) =>
    [...el.attributes].map((a) => ({ name: a.name, value: a.value })),
  )

describe('FunnelChart, horizontal, one stream', () => {
  it('draws one ribbon path in the accent tone, as funnelGeometry does for a 584 × 200 plot', () => {
    const { container } = renderChart()
    expect(orientationOf(container)).toBe('horizontal')
    expect(svgHeight(container)).toBe(280)
    const areas = parts(container, 'funnel-area')
    expect(areas).toHaveLength(1)
    expect(tone(areas[0] as Element)).toBe('accent')
    const { paths } = funnelGeometry({
      values: counts.map((c) => [c]),
      length: 584,
      thickness: 200,
      vertical: false,
    })
    expect(areas[0]?.getAttribute('d')).toBe(paths[0])
  })

  it('takes its tone from `tone`', () => {
    const { container } = renderChart({ tone: 'gain' })
    expect(tone(parts(container, 'funnel-area')[0] as Element)).toBe('gain')
  })

  it('draws a guide at every step line but the first, and its segment over the ribbon', () => {
    const { container } = renderChart()
    const guides = parts(container, 'funnel-guide')
    expect(guides).toHaveLength(4)
    guides.forEach((line, i) => {
      expect(num(line, 'x1')).toBeCloseTo(116.8 * (i + 1), 2)
      expect(num(line, 'x2')).toBeCloseTo(116.8 * (i + 1), 2)
      // From the figure top to the plot bottom.
      expect(num(line, 'y1')).toBe(-70)
      expect(num(line, 'y2')).toBe(200)
    })
    expect(container.querySelector('[data-ch-part="funnel-guides"]')).not.toBeNull()
    const inner = parts(container, 'funnel-guide-inner')
    expect(inner).toHaveLength(4)
    const { extents } = funnelGeometry({
      values: counts.map((c) => [c]),
      length: 584,
      thickness: 200,
      vertical: false,
    })
    inner.forEach((line, i) => {
      expect(num(line, 'x1')).toBeCloseTo(116.8 * (i + 1), 2)
      expect(num(line, 'y1')).toBeCloseTo(extents[i + 1]?.[0] ?? Number.NaN, 2)
      expect(num(line, 'y2')).toBeCloseTo(extents[i + 1]?.[1] ?? Number.NaN, 2)
    })
  })

  it('heads every step with its value, name and continue rate', () => {
    const { container } = renderChart()
    expect(texts(container, 'funnel-value')).toEqual(['1,240', '806', '532', '298', '262'])
    expect(texts(container, 'funnel-name')).toEqual(steps.map((s) => s.step))
    const stepGroups = parts(container, 'funnel-step')
    expect(stepGroups).toHaveLength(5)
    expect(stepGroups.map(rateOf)).toEqual([null, '65%', '66%', '56%', '88%'])
    const values = parts(container, 'funnel-value')
    expect(num(values[0] as Element, 'x')).toBe(0)
    expect(num(values[1] as Element, 'x')).toBeCloseTo(124.8, 2)
    // Baselines 16, 33 and 50 px from the figure top (the plot starts 70 px down).
    expect(num(values[0] as Element, 'y')).toBe(16 - 70)
    expect(num(parts(container, 'funnel-name')[0] as Element, 'y')).toBe(33 - 70)
    expect(num(parts(container, 'funnel-rate')[0] as Element, 'y')).toBe(50 - 70)
  })

  it('formats the values with `format`, and never the rates', () => {
    const { container } = renderChart({ format: 'currency' })
    const values = texts(container, 'funnel-value')
    expect(values[0]).not.toBe('1,240')
    expect(values[0]).toContain('1,240')
    expect(values[0]).toMatch(/\$/)
    expect(texts(container, 'funnel-rate')).toEqual(['65%', '66%', '56%', '88%'])
  })
})

describe('FunnelChart weakest step', () => {
  it('marks the lowest continue rate', () => {
    const { container } = renderChart()
    expect(weakest(container)).toEqual(['56%'])
  })

  it('marks nothing with highlight="none"', () => {
    const { container } = renderChart({ highlight: 'none' })
    expect(weakest(container)).toEqual([])
  })

  it('marks the first of a tie', () => {
    const { container } = renderChart({ data: stepsOf([100, 50, 25, 20]) })
    const rates = parts(container, 'funnel-rate')
    expect(rates.map((r) => r.textContent)).toEqual(['50%', '50%', '80%'])
    expect(rates.map((r) => r.getAttribute('data-ch-weakest'))).toEqual(['true', null, null])
  })

  it('marks nothing with only two steps', () => {
    const { container } = renderChart({ data: stepsOf([100, 40]) })
    expect(texts(container, 'funnel-rate')).toEqual(['40%'])
    expect(weakest(container)).toEqual([])
  })
})

describe('FunnelChart with series', () => {
  it('stacks one path per series in its tone, and heads the steps with the totals', () => {
    const { container } = renderChart({ series: bySource })
    const areas = parts(container, 'funnel-area')
    expect(areas.map(tone)).toEqual(['accent', 'accent-soft', 'warn', 'neutral'])
    expect(areas.map((a) => a.getAttribute('data-ch-series'))).toEqual([
      'referral',
      'website',
      'ads',
      'other',
    ])
    const { paths } = funnelGeometry({
      values: steps.map((s) => [s.referral, s.website, s.ads, s.other]),
      length: 584,
      thickness: 200,
      vertical: false,
    })
    expect(areas.map((a) => a.getAttribute('d'))).toEqual(paths)
    expect(texts(container, 'funnel-value')).toEqual(['1,240', '806', '532', '298', '262'])
    expect(texts(container, 'funnel-rate')).toEqual(['65%', '66%', '56%', '88%'])
    // An inner accent-soft layer gets no edge.
    expect(parts(container, 'area-edge')).toHaveLength(0)
  })

  it('edges an accent-soft first or last layer on its outer side only', () => {
    const first = renderChart({
      series: bySource.map((s, i) => (i === 0 ? { ...s, tone: 'accent-soft' as const } : s)),
    })
    const firstEdges = parts(first.container, 'area-edge')
    expect(firstEdges).toHaveLength(1)
    expect(tone(firstEdges[0] as Element)).toBe('accent-soft')
    first.unmount()

    const last = renderChart({
      series: bySource.map((s, i) => (i === 3 ? { ...s, tone: 'accent-soft' as const } : s)),
    })
    expect(parts(last.container, 'area-edge')).toHaveLength(1)
  })

  it('edges both sides of an accent-soft single stream', () => {
    const { container } = renderChart({ tone: 'accent-soft' })
    const edges = parts(container, 'area-edge').map((e) => e.getAttribute('d') ?? '')
    expect(edges).toHaveLength(2)
    // The edges trace the ribbon's outline: its near side up to the jump, then its far side.
    const area = parts(container, 'funnel-area')[0]?.getAttribute('d') ?? ''
    const [near, far] = edges as [string, string]
    expect(area.startsWith(`${near} L`)).toBe(true)
    expect(area.endsWith(`${far.slice(1)} Z`)).toBe(true)
    expect(near).not.toContain('L')
    expect(far).not.toContain('Z')
  })

  it('has no series attribute on a single stream', () => {
    const { container } = renderChart()
    expect(parts(container, 'funnel-area')[0]?.hasAttribute('data-ch-series')).toBe(false)
  })
})

describe('FunnelChart, vertical', () => {
  it('runs the steps down 64 px each, with horizontal guides', () => {
    const { container } = renderChart({ orientation: 'vertical' })
    expect(orientationOf(container)).toBe('vertical')
    expect(svgHeight(container)).toBe(5 * 64 + 16)
    const guides = parts(container, 'funnel-guide')
    expect(guides.map((g) => num(g, 'y1'))).toEqual([64, 128, 192, 256])
    expect(guides.map((g) => num(g, 'y2'))).toEqual([64, 128, 192, 256])
    // From the figure left to the plot right.
    expect(num(guides[0] as Element, 'x1')).toBe(-128)
    expect(num(guides[0] as Element, 'x2')).toBe(584 - 128)
    const { paths } = funnelGeometry({
      values: counts.map((c) => [c]),
      length: 320,
      thickness: 584 - 128,
      vertical: true,
    })
    expect(parts(container, 'funnel-area')[0]?.getAttribute('d')).toBe(paths[0])
  })

  it('puts the name block left of the ribbon: name, then value and rate one line down', () => {
    const { container } = renderChart({ orientation: 'vertical' })
    const names = parts(container, 'funnel-name')
    const values = parts(container, 'funnel-value')
    const rates = parts(container, 'funnel-rate')
    expect(names.map((n) => num(n, 'x'))).toEqual([-128, -128, -128, -128, -128])
    expect(values.map((n) => num(n, 'x'))).toEqual([-128, -128, -128, -128, -128])
    expect(num(names[1] as Element, 'y')).toBe(64 + 14)
    expect(num(values[1] as Element, 'y')).toBe(64 + 32)
    expect(num(rates[0] as Element, 'y')).toBe(64 + 32)
    expect(num(rates[0] as Element, 'x')).toBeGreaterThan(-128)
    expect(texts(container, 'funnel-rate')).toEqual(['65%', '66%', '56%', '88%'])
  })

  it('moves the labels and narrows the ribbon with labelWidth', () => {
    const { container } = renderChart({ orientation: 'vertical', labelWidth: 160 })
    expect(parts(container, 'funnel-name').map((n) => num(n, 'x'))).toEqual(Array(5).fill(-160))
    const { paths } = funnelGeometry({
      values: counts.map((c) => [c]),
      length: 320,
      thickness: 584 - 160,
      vertical: true,
    })
    expect(parts(container, 'funnel-area')[0]?.getAttribute('d')).toBe(paths[0])
  })

  it('adds margin.left to the label column, which keeps its place left of the ribbon', () => {
    const { container } = renderChart({ orientation: 'vertical', margin: { left: 16 } })
    expect(parts(container, 'funnel-name').map((n) => num(n, 'x'))).toEqual(Array(5).fill(-128))
    const xs = [...container.querySelectorAll('text')].map((t) => num(t, 'x'))
    expect(Math.min(...xs)).toBe(-128)
    // The plot starts 144 px in: the label column and the extra 16 px.
    const plot = container.querySelector('svg > g') as Element
    expect(plot.getAttribute('transform')).toBe('translate(144,8)')
    const { paths } = funnelGeometry({
      values: counts.map((c) => [c]),
      length: 320,
      thickness: 584 - 144,
      vertical: true,
    })
    expect(parts(container, 'funnel-area')[0]?.getAttribute('d')).toBe(paths[0])
    // Guides and hit rects still run from the figure's left edge, the extra margin included.
    expect(num(parts(container, 'funnel-guide')[0] as Element, 'x1')).toBe(-144)
    hits(container).forEach((r) => {
      expect(num(r, 'x')).toBe(-144)
      expect(num(r, 'width')).toBe(584)
    })
  })

  it('takes margin.left as is in horizontal', () => {
    const { container } = renderChart({ margin: { left: 16 } })
    const plot = container.querySelector('svg > g') as Element
    expect(plot.getAttribute('transform')).toBe('translate(16,70)')
    expect(num(parts(container, 'funnel-name')[0] as Element, 'x')).toBe(0)
  })

  it('divides an explicit height evenly between the steps', () => {
    const { container } = renderChart({ orientation: 'vertical', height: 400 })
    expect(svgHeight(container)).toBe(400)
    const step = (400 - 16) / 5
    parts(container, 'funnel-guide').forEach((g, i) => {
      expect(num(g, 'y1')).toBeCloseTo(step * (i + 1), 2)
    })
  })
})

describe('FunnelChart orientation="auto"', () => {
  const longName = 'A very long step name that takes 40 chars'.slice(0, 40)

  it('is horizontal when every step gets 96 px and its header fits', () => {
    const { container } = renderChart({ orientation: 'auto' })
    expect(orientationOf(container)).toBe('horizontal')
    expect(svgHeight(container)).toBe(280)
  })

  it('is vertical when the steps get under 96 px each', () => {
    const { container } = renderChart({ orientation: 'auto', width: 400 })
    expect(orientationOf(container)).toBe('vertical')
    expect(svgHeight(container)).toBe(336)
  })

  it('is vertical with eight steps at 584 px', () => {
    const { container } = renderChart({
      orientation: 'auto',
      data: stepsOf([800, 700, 600, 500, 400, 300, 200, 100]),
    })
    expect(orientationOf(container)).toBe('vertical')
  })

  // Values are 18px: 11 characters estimate at 106.6 px, over the 104.8 px a 584 px column
  // leaves; 10 characters at 96.9 px fit.
  it('is vertical when a header value is wider than its column', () => {
    const { container } = renderChart({
      orientation: 'auto',
      format: (v: number) => `$${(v * 10000).toLocaleString('en-US')}`,
    })
    expect(texts(container, 'funnel-value')[0]).toBe('$12,400,000')
    expect(orientationOf(container)).toBe('vertical')
  })

  it('stays horizontal when every header value fits its column', () => {
    const { container } = renderChart({
      orientation: 'auto',
      format: (v: number) => `$${(v * 1000).toLocaleString('en-US')}`,
    })
    expect(texts(container, 'funnel-value')[0]).toBe('$1,240,000')
    expect(orientationOf(container)).toBe('horizontal')
  })

  it('stays horizontal for a long step name, which is cut instead', () => {
    expect(longName).toHaveLength(40)
    const data = steps.map((s, i) => (i === 1 ? { ...s, step: longName } : s))
    const { container } = renderChart({ orientation: 'auto', data })
    expect(orientationOf(container)).toBe('horizontal')
    const name = parts(container, 'funnel-name')[1] as Element
    expect(name.textContent).toMatch(/…$/)
  })

  it('never switches a forced orientation, and cuts names with a <title>', () => {
    const data = steps.map((s, i) => (i === 1 ? { ...s, step: longName } : s))
    const { container } = renderChart({ orientation: 'horizontal', width: 400, data })
    expect(orientationOf(container)).toBe('horizontal')
    const name = parts(container, 'funnel-name')[1] as Element
    expect(name.textContent).toMatch(/…$/)
    expect(name.textContent?.length).toBeLessThan(40)
    const step = parts(container, 'funnel-step')[1] as Element
    expect(step.querySelector('title')?.textContent).toBe(longName)
    // Names that fit get no title.
    expect(parts(container, 'funnel-step')[0]?.querySelector('title')).toBeNull()
  })

  it('cuts a long name in the vertical label column too', () => {
    const data = steps.map((s, i) => (i === 1 ? { ...s, step: longName } : s))
    const { container } = renderChart({ orientation: 'vertical', data })
    const name = parts(container, 'funnel-name')[1] as Element
    expect(name.textContent).toMatch(/…$/)
    expect(parts(container, 'funnel-step')[1]?.querySelector('title')?.textContent).toBe(longName)
  })
})

describe('FunnelChart bad values', () => {
  it('skips rows with a missing, non-numeric or negative value, and warns once', () => {
    const warn = quiet()
    const { container } = renderChart({ data: stepsOf([1000, null, 'n/a', 800, -5, 400]) })
    expect(texts(container, 'funnel-value')).toEqual(['1,000', '800', '400'])
    expect(texts(container, 'funnel-name')).toEqual(['Step 1', 'Step 4', 'Step 6'])
    expect(parts(container, 'funnel-guide')).toHaveLength(2)
    expect(container.innerHTML).not.toContain('NaN')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain(
      'FunnelChart skipped a row with a missing, non-numeric or negative value.',
    )
  })

  it('takes the continue rate against the previous drawn step', () => {
    quiet()
    const { container } = renderChart({ data: stepsOf([1000, null, 500]) })
    expect(texts(container, 'funnel-rate')).toEqual(['50%'])
  })

  it('skips the whole row when one series value is bad', () => {
    quiet()
    const data = steps.map((s, i) => (i === 2 ? { ...s, ads: Number.NaN } : s))
    const { container } = renderChart({ series: bySource, data })
    expect(texts(container, 'funnel-value')).toEqual(['1,240', '806', '298', '262'])
    expect(parts(container, 'funnel-area')).toHaveLength(4)
    expect(container.innerHTML).not.toContain('NaN')
  })

  it('gives no rate after a zero step, and never reads Infinity', () => {
    const { container } = renderChart({ data: stepsOf([10, 0, 5]) })
    expect(parts(container, 'funnel-step').map(rateOf)).toEqual([null, '0%', null])
    expect(container.innerHTML).not.toContain('Infinity')
    expect(container.innerHTML).not.toContain('NaN')
  })

  it('draws no ribbon when every step is zero, but still the headers', () => {
    const { container } = renderChart({ data: stepsOf([0, 0, 0]) })
    expect(parts(container, 'funnel-area')).toHaveLength(0)
    expect(texts(container, 'funnel-value')).toEqual(['0', '0', '0'])
    expect(container.querySelector('[data-ch-part="empty"]')).toBeNull()
    expect(container.innerHTML).not.toContain('NaN')
  })

  it('reads a rate under half a percent as "<1%"', () => {
    const { container } = renderChart({ data: stepsOf([1000, 4]) })
    expect(texts(container, 'funnel-rate')).toEqual(['<1%'])
  })
})

describe('FunnelChart props', () => {
  it('types `y` and `series` as exclusive', () => {
    quiet()
    render(<FunnelChart title="One stream" data={steps} x="step" y="count" tone="gain" />)
    render(<FunnelChart title="By source" data={steps} x="step" series={bySource} />)
    // @ts-expect-error: `y` and `series` together
    render(<FunnelChart title="Both" data={steps} x="step" y="count" series={bySource} />)
    // @ts-expect-error: `tone` belongs to the one-stream form
    render(<FunnelChart title="Tone" data={steps} x="step" series={bySource} tone="gain" />)
  })

  it('has no `dimInactive`: nothing on this chart dims', () => {
    // @ts-expect-error: `dimInactive` is not a FunnelChart prop
    render(<FunnelChart title="Dim" data={steps} x="step" y="count" dimInactive />)
  })
})

describe('FunnelChart edge cases', () => {
  it('warns about nothing for good data, in either input mode', () => {
    const warn = quiet()
    renderChart({ orientation: 'auto' })
    renderChart({ series: bySource, orientation: 'vertical' })
    expect(warn).not.toHaveBeenCalled()
  })

  it('draws one step with no guide and no rate', () => {
    const { container } = renderChart({ data: stepsOf([500]) })
    expect(parts(container, 'funnel-guide')).toHaveLength(0)
    expect(parts(container, 'funnel-guide-inner')).toHaveLength(0)
    expect(parts(container, 'funnel-rate')).toHaveLength(0)
    expect(parts(container, 'funnel-area')).toHaveLength(1)
  })

  it.each(['auto', 'horizontal', 'vertical'] as const)(
    'stays sane at 60 px wide (%s)',
    (orientation) => {
      const { container } = renderChart({ width: 60, orientation })
      // The hit rects are drawn, so the sweep covers them too.
      expect(parts(container, 'funnel-hit')).toHaveLength(5)
      for (const { name, value } of attributes(container)) {
        expect(value).not.toContain('NaN')
        expect(value).not.toContain('Infinity')
        if (name === 'width' || name === 'height') expect(Number(value)).toBeGreaterThanOrEqual(0)
      }
    },
  )

  // A plot under 2 px thick: the ribbon's minimum thickness puts its edges outside the plot.
  it.each([
    ['horizontal', { height: 81 }],
    ['vertical', { width: 129 }],
  ] as const)('keeps hit rects sane on a plot under 2 px thick (%s)', (orientation, size) => {
    const { container } = renderChart({ orientation, ...size })
    expect(parts(container, 'funnel-hit')).toHaveLength(5)
    for (const { name, value } of attributes(container)) {
      expect(value).not.toContain('NaN')
      if (name === 'width' || name === 'height') expect(Number(value)).toBeGreaterThanOrEqual(0)
    }
  })

  it('is vertical at 60 px under auto', () => {
    const { container } = renderChart({ width: 60, orientation: 'auto' })
    expect(orientationOf(container)).toBe('vertical')
  })

  it('shows the empty state with both y and series, and warns once', () => {
    const warn = quiet()
    const { container } = renderChart({ y: 'count', series: bySource })
    expect(container.querySelector('[data-ch-part="empty"]')).not.toBeNull()
    expect(parts(container, 'funnel-area')).toHaveLength(0)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('FunnelChart needs either y or series, not both.')
  })

  it('shows the empty state with neither y nor series, and warns once', () => {
    const warn = quiet()
    const { container } = render(
      <FunnelChart<Step>
        {...({
          data: steps,
          x: 'step',
          title: 'No value',
          width: 584,
        } as unknown as FunnelChartProps<Step>)}
      />,
    )
    expect(container.querySelector('[data-ch-part="empty"]')).not.toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('FunnelChart needs either y or series, not both.')
  })

  it('shows the empty state for empty data', () => {
    const warn = quiet()
    const { container } = renderChart({ data: [] })
    expect(container.querySelector('[data-ch-part="empty"]')).not.toBeNull()
    expect(warn).not.toHaveBeenCalled()
  })

  it('shows the empty state, and warns, for an empty series list', () => {
    const warn = quiet()
    const { container } = renderChart({ series: [] })
    expect(container.querySelector('[data-ch-part="empty"]')).not.toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('FunnelChart needs at least one series')
  })

  it('shows the empty state when no row can be drawn', () => {
    quiet()
    const { container } = renderChart({ data: stepsOf([null, -1]) })
    expect(container.querySelector('[data-ch-part="empty"]')).not.toBeNull()
  })
})

const live = (root: Element) => root.querySelector('[aria-live]')?.textContent
const chartEl = () => screen.getByRole('application', { name: 'From lead to paid job' })
const press = (root: Element, ...keys: string[]) =>
  keys.map((key) => {
    fireEvent.keyDown(chartEl(), { key })
    return live(root)
  })
const hits = (root: Element) => parts(root, 'funnel-hit')
const tooltipOf = (root: Element) => root.querySelector('[data-ch-part="tooltip"]')
const activeGuides = (root: Element) =>
  parts(root, 'funnel-guide').filter((g) => g.getAttribute('data-ch-active') === 'true')
const dimmed = (root: Element) =>
  parts(root, 'funnel-step').map((g) => g.hasAttribute('data-ch-dimmed'))
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

describe('FunnelChart keyboard and announcements', () => {
  it('announces each step: position, name, value and continue rate', () => {
    const { container } = renderChart()
    fireEvent.focus(chartEl())
    expect(live(container)).toBe('1 of 5, Leads, 1,240')
    expect(press(container, 'ArrowRight', 'End')).toEqual([
      '2 of 5, Site visits, 806, 65% of previous step',
      '5 of 5, Jobs paid, 262, 88% of previous step',
    ])
  })

  it('moves down and up the steps of a vertical funnel', () => {
    const { container } = renderChart({ orientation: 'vertical' })
    fireEvent.focus(chartEl())
    expect(press(container, 'ArrowDown', 'ArrowDown', 'ArrowUp')).toEqual([
      '2 of 5, Site visits, 806, 65% of previous step',
      '3 of 5, Quotes sent, 532, 66% of previous step',
      '2 of 5, Site visits, 806, 65% of previous step',
    ])
  })

  it('reads the series values after the rate', () => {
    const { container } = renderChart({ series: bySource })
    fireEvent.focus(chartEl())
    expect(press(container, 'ArrowRight', 'ArrowRight')[1]).toBe(
      '3 of 5, Quotes sent, 532, 66% of previous step, Referral 250, Website 160, Ads 80, Other 42',
    )
  })

  it('takes "of previous step" and "of first step" from ChartsProvider messages', () => {
    const { container } = render(
      <ChartsProvider
        messages={{ ofPreviousStep: 'z poprzedniego kroku', ofFirstStep: 'z pierwszego kroku' }}
      >
        <FunnelChart<Step>
          data={steps}
          x="step"
          y={(d) => Number(d.count)}
          width={584}
          orientation="horizontal"
          title="From lead to paid job"
          animate={false}
        />
      </ChartsProvider>,
    )
    fireEvent.focus(chartEl())
    expect(press(container, 'ArrowRight')[0]).toBe(
      '2 of 5, Site visits, 806, 65% z poprzedniego kroku',
    )
    expect(tooltipOf(container)).toHaveTextContent('65% z pierwszego kroku')
    expect(container.textContent).not.toContain('of previous step')
  })

  it('counts drawn steps only: a skipped row has no point', () => {
    quiet()
    const { container } = renderChart({ data: stepsOf([1000, null, 800]) })
    fireEvent.focus(chartEl())
    expect(live(container)).toBe('1 of 2, Step 1, 1,000')
    expect(press(container, 'ArrowRight')).toEqual(['2 of 2, Step 3, 800, 80% of previous step'])
    expect(hits(container)).toHaveLength(2)
  })
})

describe('FunnelChart pointer and tooltip', () => {
  it('covers each column of a horizontal funnel with a hit rect', () => {
    const { container } = renderChart()
    const rects = hits(container)
    expect(rects).toHaveLength(5)
    rects.forEach((r, i) => {
      expect(num(r, 'x')).toBeCloseTo(116.8 * i, 2)
      expect(num(r, 'width')).toBeCloseTo(116.8, 2)
      expect(num(r, 'y')).toBe(-70)
      expect(num(r, 'height')).toBe(280)
    })
  })

  it('covers each row of a vertical funnel, label column included', () => {
    const { container } = renderChart({ orientation: 'vertical' })
    const rects = hits(container)
    expect(rects).toHaveLength(5)
    rects.forEach((r, i) => {
      expect(num(r, 'x')).toBe(-128)
      expect(num(r, 'width')).toBe(584)
      expect(num(r, 'y')).toBe(64 * i)
      expect(num(r, 'height')).toBe(64)
    })
  })

  it('shows the step, its value and both rates on hover', () => {
    const { container } = renderChart()
    fireEvent.pointerEnter(hits(container)[3] as Element)
    const tip = tooltipOf(container)
    expect(tip).toHaveTextContent('Quotes accepted')
    expect(tip).toHaveTextContent('298')
    expect(tip).toHaveTextContent('56% of previous step')
    expect(tip).toHaveTextContent('24% of first step')
  })

  it('adds one segment per series to the tooltip', () => {
    const { container } = renderChart({ series: bySource })
    fireEvent.pointerEnter(hits(container)[3] as Element)
    const tip = tooltipOf(container)
    expect(tip).toHaveTextContent('Quotes accepted')
    expect(tip).toHaveTextContent('Referral')
    expect(tip).toHaveTextContent('170')
    expect(tip).toHaveTextContent('Other')
  })

  it('shows no rates for the first step', () => {
    const { container } = renderChart()
    fireEvent.pointerEnter(hits(container)[0] as Element)
    const tip = tooltipOf(container)
    expect(tip).toHaveTextContent('Leads')
    expect(tip).not.toHaveTextContent('of previous step')
    expect(tip).not.toHaveTextContent('of first step')
  })

  it('draws no tooltip when tooltip is false, and passes the user row to a function tooltip', () => {
    const off = renderChart({ tooltip: false })
    fireEvent.pointerEnter(hits(off.container)[3] as Element)
    expect(tooltipOf(off.container)).toBeNull()
    off.unmount()
    const seen: unknown[] = []
    const custom = renderChart({
      tooltip: (point: ChartPoint<Step>) => {
        seen.push(point.datum)
        return <span>custom</span>
      },
    })
    fireEvent.pointerEnter(hits(custom.container)[3] as Element)
    expect(tooltipOf(custom.container)).toHaveTextContent('custom')
    expect(seen).toContain(steps[3])
  })

  it('activates the tapped step on touch, and keeps it when the tap ends', () => {
    const { container } = renderChart({ orientation: 'vertical' })
    const step = hits(container)[2] as Element
    // A touch tap sends pointerover/enter and pointerdown, but no pointermove.
    fireEvent.pointerEnter(step, { pointerType: 'touch' })
    fireEvent.pointerDown(step, { pointerType: 'touch' })
    fireEvent.pointerLeave(container.querySelector('figure') as Element, { pointerType: 'touch' })
    expect(tooltipOf(container)).toHaveTextContent('43% of first step')
    expect(num(activeGuides(container)[0] as Element, 'y1')).toBe(128)
  })

  it('moves the active step with the mouse and clears it when the mouse leaves', () => {
    const { container } = renderChart()
    fireEvent.pointerEnter(hits(container)[1] as Element, { pointerType: 'mouse' })
    expect(tooltipOf(container)).toHaveTextContent('Site visits')
    fireEvent.pointerEnter(hits(container)[4] as Element, { pointerType: 'mouse' })
    expect(tooltipOf(container)).toHaveTextContent('Jobs paid')
    fireEvent.pointerLeave(container.querySelector('figure') as Element, { pointerType: 'mouse' })
    expect(tooltipOf(container)).toBeNull()
    expect(activeGuides(container)).toHaveLength(0)
  })

  it('selects on click with the row id and the user row', () => {
    const onSelect = vi.fn()
    const { container, unmount } = renderChart({ onSelect })
    fireEvent.click(hits(container)[3] as Element)
    expect(onSelect).toHaveBeenCalledTimes(1)
    const [id, point] = onSelect.mock.calls[0] as [unknown, ChartPoint<Step>]
    expect(id).toBe(3)
    expect(point.datum).toBe(steps[3])
    unmount()
    const byId = vi.fn()
    const named = renderChart({ onSelect: byId, id: 'step' })
    fireEvent.click(hits(named.container)[0] as Element)
    expect(byId.mock.calls[0]?.[0]).toBe('Leads')
  })
})

describe('FunnelChart active step', () => {
  it('inks the active guide over the ribbon and dims no step', () => {
    const { container } = renderChart({ activeId: 3 })
    const active = activeGuides(container)
    expect(active).toHaveLength(1)
    expect(num(active[0] as Element, 'x1')).toBeCloseTo(116.8 * 3, 2)
    // Drawn after the ribbon, so it sits over it.
    const area = parts(container, 'funnel-area')[0] as Element
    expect(area.compareDocumentPosition(active[0] as Element)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    expect(parts(container, 'funnel-guide')).toHaveLength(4)
    expect(active[0]?.getAttribute('data-ch-active')).toBe('true')
    // Headers and labels keep their contrast: the active state is the inked guide alone.
    expect(dimmed(container)).toEqual([false, false, false, false, false])
  })

  it.each([0, 3, 4])('never dims a step while step %i is active', (activeId) => {
    const { container } = renderChart({ activeId })
    expect(container.querySelectorAll('[data-ch-dimmed]')).toHaveLength(0)
    const active = activeGuides(container)
    expect(active).toHaveLength(1)
    expect(active[0]?.getAttribute('data-ch-active')).toBe('true')
  })

  it('gives the first step a guide only while it is active', () => {
    const { container } = renderChart({ activeId: 0 })
    const guides = parts(container, 'funnel-guide')
    expect(guides).toHaveLength(5)
    const active = activeGuides(container)
    expect(active).toHaveLength(1)
    expect(num(active[0] as Element, 'x1')).toBe(0)
  })

  it('never changes the ribbon', () => {
    const d = (props: Props) =>
      parts(renderChart(props).container, 'funnel-area').map((a) => a.getAttribute('d'))
    expect(d({ activeId: 3 })).toEqual(d({}))
  })

  it('dims nothing and inks no guide without an active step', () => {
    const { container } = renderChart()
    expect(activeGuides(container)).toHaveLength(0)
    expect(dimmed(container)).toEqual([false, false, false, false, false])
  })
})

describe('FunnelChart points registration', () => {
  it('registers the same points array again when re-rendered with the same props', () => {
    const view = () => (
      <FunnelChart<Step>
        data={steps}
        x="step"
        series={bySource.map((s) => ({ ...s }))}
        format={(v: number) => v.toLocaleString('en-US')}
        width={584}
        orientation="horizontal"
        title="From lead to paid job"
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
      <FunnelChart<Step> data={steps} x="step" y="count" width={584} title="F" animate={false} />,
    )
    const first = registered.at(-1)
    rerender(
      <FunnelChart<Step>
        data={steps.map((s, i) => (i === 1 ? { ...s, count: 800 } : s))}
        x="step"
        y="count"
        width={584}
        title="F"
        animate={false}
      />,
    )
    expect(registered.at(-1)).not.toBe(first)
  })
})

describe('FunnelChart data table', () => {
  it('lists every row in data order: step, value and continue rate', () => {
    renderChart()
    expect(headers()).toEqual(['Step', 'Value', 'Continued'])
    const rows = tableRows()
    expect(rows.map((r) => rowText(r).name)).toEqual(steps.map((s) => s.step))
    expect(rowText(rows[3] as Element)).toEqual({ name: 'Quotes accepted', cells: ['298', '56%'] })
    // The first step has no rate: an empty cell.
    expect(rowText(rows[0] as Element).cells).toEqual(['1,240', '—no value'])
  })

  it('has one column per series and a total with series', () => {
    renderChart({ series: bySource })
    expect(headers()).toEqual(['Step', 'Referral', 'Website', 'Ads', 'Other', 'Total', 'Continued'])
    expect(rowText(tableRows()[3] as Element).cells).toEqual([
      '170',
      '80',
      '30',
      '18',
      '298',
      '56%',
    ])
  })

  it('keeps a skipped row, with its name and empty cells', () => {
    quiet()
    renderChart({ data: stepsOf([1000, null, 800]) })
    const rows = tableRows()
    expect(rows).toHaveLength(3)
    expect(rowText(rows[1] as Element)).toEqual({
      name: 'Step 2',
      cells: ['—no value', '—no value'],
    })
    expect(rowText(rows[2] as Element).cells).toEqual(['800', '80%'])
  })

  it('renames columns with dataTable.columns, and drops the table with dataTable={false}', () => {
    const { unmount } = renderChart({ dataTable: { columns: { Value: 'Count' } } })
    expect(headers()).toEqual(['Step', 'Count', 'Continued'])
    unmount()
    renderChart({ dataTable: false })
    expect(screen.queryByRole('table')).toBeNull()
  })
})
