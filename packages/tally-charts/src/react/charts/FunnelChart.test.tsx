import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FunnelChart, type FunnelChartProps, type FunnelSeries } from './FunnelChart'
import { funnelGeometry } from './funnel-geometry'

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
      for (const { name, value } of attributes(container)) {
        expect(value).not.toContain('NaN')
        expect(value).not.toContain('Infinity')
        if (name === 'width' || name === 'height') expect(Number(value)).toBeGreaterThanOrEqual(0)
      }
    },
  )

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
