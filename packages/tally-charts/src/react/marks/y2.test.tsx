import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createScale, type LinearScaleSpec } from '../../core/scale'
import { Chart } from '../Chart'
import { type InternalChartContext, useChart } from '../context'
import { Area } from './Area'
import { Axis } from './Axis'
import { Band } from './Band'
import { Bars } from './Bars'
import { Grid } from './Grid'
import { Line } from './Line'
import { Target } from './Target'
import { ValueLabel } from './ValueLabel'
import { valueContext } from './value-scale'

vi.mock('../../core/scale', async (original) => {
  const actual = await original<typeof import('../../core/scale')>()
  return { ...actual, createScale: vi.fn(actual.createScale) }
})

type Row = { day: string; v: number; u: number; lo: number; hi: number; bad: string }
// `v` peaks on the first row and `u` on the second, so a mark on the wrong scale shows.
const rows: Row[] = [
  { day: 'a', v: 10, u: 250, lo: 100, hi: 500, bad: 'n/a' },
  { day: 'b', v: 5, u: 1000, lo: 500, hi: 750, bad: 'n/a' },
  { day: 'c', v: 2, u: 500, lo: 250, hi: 500, bad: 'n/a' },
]

// 300 × 100 with no margin: bands 100 wide, centres at 50, 150, 250. On y, 10 is pixel 0; on y2,
// 1000 is pixel 0, 500 is 50, 250 is 75.
const frame = {
  title: 'Traffic',
  chartId: 'c',
  width: 300,
  height: 100,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
  animate: false,
}

function renderDual(
  children: ReactNode,
  options: { y2?: LinearScaleSpec<Row>; activeId?: string } = {},
) {
  const y2 = 'y2' in options ? options.y2 : ({ field: 'u' } as LinearScaleSpec<Row>)
  const { activeId } = options
  return render(
    <Chart<Row>
      {...frame}
      data={rows}
      x={{ type: 'band', field: 'day', padding: 0 }}
      y={{ field: 'v' }}
      y2={y2}
      activeId={activeId}
    >
      {children}
    </Chart>,
  )
}

const parts = (root: HTMLElement, name: string) => [
  ...root.querySelectorAll<SVGElement>(`[data-ch-part="${name}"]`),
]
const numbers = (els: readonly SVGElement[], attr: string) =>
  els.map((el) => Number(el.getAttribute(attr)))

let warnSpy: ReturnType<typeof vi.spyOn>
const warnings = () => warnSpy.mock.calls.map((call: unknown[]) => String(call[0]))
const y2Warnings = () => warnings().filter((text: string) => /y2/.test(text))

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  warnSpy.mockRestore()
  vi.mocked(createScale).mockClear()
})

describe('valueContext', () => {
  const y = { kind: 'linear' } as InternalChartContext['y']
  const y2 = { kind: 'linear' } as InternalChartContext['y']
  const base = { y, warn: vi.fn() } as unknown as InternalChartContext

  it('returns the same object for y and for no scale', () => {
    expect(valueContext(base, 'y')).toBe(base)
    expect(valueContext(base, undefined)).toBe(base)
  })

  it('returns a copy with y swapped for y2', () => {
    const ctx = { ...base, y2 }
    const swapped = valueContext(ctx, 'y2')
    expect(swapped).not.toBe(ctx)
    expect(swapped?.y).toBe(y2)
    expect(ctx.y).toBe(y)
  })

  it('warns y2-missing and returns undefined without y2', () => {
    const warn = vi.fn()
    expect(valueContext({ ...base, warn }, 'y2')).toBeUndefined()
    expect(warn).toHaveBeenCalledWith('y2-missing', expect.stringContaining('y2'))
  })
})

describe('marks on the second scale', () => {
  it('reaches the top at each scale’s own maximum', () => {
    const { container } = renderDual(
      <>
        <Bars id="day" />
        <Line scale="y2" />
      </>,
    )
    // Bars on y: 10, 5, 2.
    expect(numbers(parts(container, 'bar'), 'y')).toEqual([0, 50, 80])
    // Line on y2: 250, 1000, 500.
    expect(numbers(parts(container, 'line-dot'), 'cy')).toEqual([75, 0, 50])
    expect(y2Warnings()).toEqual([])
  })

  it('Line falls back to the field on y2', () => {
    const { container } = renderDual(<Line scale="y2" dots="none" />)
    expect(parts(container, 'line')[0]?.getAttribute('d')).toBe('M50,75L150,0L250,50')
  })

  it('Line with its own y accessor reads that field on the y2 scale', () => {
    const { container } = renderDual(<Line scale="y2" y="hi" />)
    expect(numbers(parts(container, 'line-dot'), 'cy')).toEqual([50, 25, 50])
  })

  it('Bars size and anchor from y2', () => {
    const { container } = renderDual(<Bars id="day" scale="y2" />)
    expect(numbers(parts(container, 'bar'), 'height')).toEqual([25, 100, 50])
    expect(numbers(parts(container, 'bar'), 'y')).toEqual([75, 0, 50])
  })

  it('registers Bars points at their y2 position', () => {
    const seen: number[][] = []
    function Probe() {
      seen.push(useChart().points.map((p) => p.y))
      return null
    }
    renderDual(
      <>
        <Bars id="day" scale="y2" />
        <Probe />
      </>,
    )
    expect(seen.at(-1)).toEqual([75, 0, 50])
  })

  it('Area uses y2 for its line and baseline', () => {
    const { container } = renderDual(<Area scale="y2" />)
    const d = parts(container, 'area')[0]?.getAttribute('d') ?? ''
    expect(d).toContain('50,75')
    expect(d).toContain('150,0')
    expect(d).toContain('250,100')
  })

  it('Band reads low and high on y2', () => {
    const { container } = renderDual(<Band scale="y2" low="lo" high="hi" />)
    const d = parts(container, 'band')[0]?.getAttribute('d') ?? ''
    // hi of the first row, 500, and lo of the first row, 100.
    expect(d).toContain('50,50')
    expect(d).toContain('50,90')
  })

  it('ValueLabel positions and picks the peak on y2', () => {
    const { container } = renderDual(<ValueLabel at="max" scale="y2" />)
    const [label] = parts(container, 'value-label')
    expect(label?.textContent).toBe('1,000')
    expect(label?.getAttribute('x')).toBe('150')
    expect(label?.getAttribute('y')).toBe('-6')
  })

  it('ValueLabel variant="pill" works on y2', () => {
    const { container } = renderDual(<ValueLabel at="max" variant="pill" scale="y2" />)
    const [pill] = parts(container, 'value-label-pill')
    expect(pill?.getAttribute('y')).toBe(String(0 - 6 - 18))
    expect(parts(container, 'value-label')[0]?.textContent).toBe('1,000')
  })

  it('Target y is a value on y2', () => {
    const { container } = renderDual(<Target y={500} scale="y2" />)
    expect(numbers(parts(container, 'target'), 'y1')).toEqual([50])
  })

  it('Target y of the same value on y is outside its domain', () => {
    const { container } = renderDual(<Target y={500} />)
    expect(parts(container, 'target')).toEqual([])
    expect(warnings().join()).toContain('outside the chart domain')
  })

  it('Target y that is not a number warns on y2, which is linear only', () => {
    const { container } = renderDual(<Target y="b" scale="y2" />)
    expect(parts(container, 'target')).toEqual([])
    expect(warnings().join()).toContain('outside the chart domain')
  })

  it('Grid stays on y', () => {
    const { container: withY2 } = renderDual(<Grid />)
    const { container: without } = renderDual(<Grid />, { y2: undefined })
    expect(withY2.innerHTML).toBe(without.innerHTML)
  })
})

describe('Axis on the second scale', () => {
  const labels = (root: HTMLElement) => parts(root, 'axis-label').map((el) => el.textContent)

  it('labels the right side from y2', () => {
    const { container } = renderDual(<Axis side="right" scale="y2" ticks={2} />)
    expect(labels(container)).toEqual(expect.arrayContaining(['0', '1,000']))
    expect(y2Warnings()).toEqual([])
  })

  it('keeps side and scale independent', () => {
    const { container } = renderDual(<Axis side="left" scale="y2" ticks={2} />)
    expect(labels(container)).toContain('1,000')
    expect(parts(container, 'axis')[0]?.getAttribute('data-ch-side')).toBe('left')
  })

  it('warns on a horizontal side, ignoring the scale', () => {
    const { container } = renderDual(<Axis side="top" scale="y2" />)
    expect(y2Warnings()).toHaveLength(1)
    expect(y2Warnings()[0]).toContain('left or right')
    expect(labels(container)).toEqual(['a', 'b', 'c'])
  })

  it('tints labels through the swatch variable', () => {
    const { container } = renderDual(<Axis side="right" scale="y2" tone="accent" />)
    const axis = parts(container, 'axis')[0]
    expect(axis?.style.getPropertyValue('--_ch-swatch-color')).toBe('var(--ch-accent)')
    expect(axis?.getAttribute('data-ch-tone')).toBe('accent')
    for (const label of parts(container, 'axis-label')) {
      expect(label.getAttribute('data-ch-tone-text')).toBe('true')
    }
  })

  it('tone works on an axis on y', () => {
    const { container } = renderDual(<Axis side="left" tone="loss" />)
    const axis = parts(container, 'axis')[0]
    expect(axis?.style.getPropertyValue('--_ch-swatch-color')).toBe('var(--ch-loss)')
  })

  it('stays untinted without tone', () => {
    const { container } = renderDual(<Axis side="left" />)
    const axis = parts(container, 'axis')[0]
    expect(axis?.getAttribute('style')).toBeNull()
    expect(axis?.getAttribute('data-ch-tone')).toBeNull()
    expect(parts(container, 'axis-label')[0]?.getAttribute('data-ch-tone-text')).toBeNull()
  })
})

describe('scale="y2" without a y2', () => {
  const all = (
    <>
      <Line scale="y2" />
      <Area scale="y2" />
      <Band scale="y2" low="lo" high="hi" />
      <Bars id="day" scale="y2" />
      <ValueLabel scale="y2" />
      <Target y={5} scale="y2" />
      <Axis side="right" scale="y2" />
    </>
  )

  it('warns once and draws nothing', () => {
    const { container } = renderDual(all, { y2: undefined })
    expect(y2Warnings()).toHaveLength(1)
    expect(y2Warnings()[0]).toContain('<Chart y2>')
    expect(container.querySelector('[data-ch-part="plot"] svg > g')?.childElementCount).toBe(0)
  })

  it('registers no points, so the chart takes no focus', () => {
    const { container } = renderDual(<Bars id="day" scale="y2" />, { y2: undefined })
    expect(container.querySelector('[tabindex]')).toBeNull()
  })

  it('keeps hook order when y2 comes and goes', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rerender, container } = renderDual(all, { y2: undefined })
    const chart = (y2: LinearScaleSpec<Row> | undefined) => (
      <Chart<Row>
        {...frame}
        data={rows}
        x={{ type: 'band', field: 'day', padding: 0 }}
        y={{ field: 'v' }}
        y2={y2}
      >
        {all}
      </Chart>
    )
    rerender(chart({ field: 'u' }))
    expect(parts(container, 'bar')).toHaveLength(3)
    expect(parts(container, 'line-dot')).toHaveLength(3)
    rerender(chart(undefined))
    expect(parts(container, 'bar')).toHaveLength(0)
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})

describe('a y2 the chart cannot use', () => {
  function Probe({ onScale }: { onScale: (kind: string | undefined) => void }) {
    onScale(useChart().y2?.kind)
    return null
  }

  it('reports a linear y2 through useChart', () => {
    const onScale = vi.fn()
    renderDual(<Probe onScale={onScale} />)
    expect(onScale).toHaveBeenLastCalledWith('linear')
  })

  // The type rejects these; the warning is for JavaScript callers.
  it.each([
    ['band', { type: 'band', field: 'day' }],
    ['point', { type: 'point', field: 'day' }],
    ['time', { type: 'time', field: 'day' }],
  ] as const)('warns y2-scale for a %s y2 and has no scale', (_, y2) => {
    const onScale = vi.fn()
    render(
      <Chart<Row>
        {...frame}
        data={rows}
        x={{ type: 'band', field: 'day', padding: 0 }}
        y={{ field: 'v' }}
        // @ts-expect-error `y2` is linear only.
        y2={y2}
      >
        <Probe onScale={onScale} />
      </Chart>,
    )
    expect(y2Warnings()).toHaveLength(1)
    expect(y2Warnings()[0]).toContain('linear')
    expect(onScale).toHaveBeenLastCalledWith(undefined)
  })

  it('warns y2-orientation with a band y and has no scale', () => {
    const onScale = vi.fn()
    render(
      <Chart<Row>
        {...frame}
        data={rows}
        x={{ field: 'v' }}
        y={{ type: 'band', field: 'day' }}
        y2={{ field: 'u' }}
      >
        <Probe onScale={onScale} />
      </Chart>,
    )
    expect(y2Warnings()).toHaveLength(1)
    expect(y2Warnings()[0]).toContain('band or point scale on <Chart y>')
    expect(onScale).toHaveBeenLastCalledWith(undefined)
  })
})

describe('y2 with nothing to scale', () => {
  it('shows the empty state with no warnings from y2', () => {
    render(
      <Chart<Row>
        {...frame}
        data={[]}
        x={{ type: 'band', field: 'day' }}
        y={{ field: 'v' }}
        // @ts-expect-error `y2` is linear only.
        y2={{ type: 'band', field: 'day' }}
      >
        <Line scale="y2" />
      </Chart>,
    )
    expect(screen.getByText('No data')).toBeTruthy()
    expect(warnings()).toEqual([])
  })

  it('does not warn about a y2 with no domain on empty data', () => {
    render(
      <Chart<Row>
        {...frame}
        data={[]}
        x={{ type: 'band', field: 'day' }}
        y={{ field: 'v' }}
        y2={{}}
      >
        <Line scale="y2" />
      </Chart>,
    )
    expect(warnings()).toEqual([])
  })

  it('keeps y marks and draws no NaN when the y2 field has no valid numbers', () => {
    const { container } = renderDual(
      <>
        <Bars id="day" />
        <Line scale="y2" y="bad" />
        <Line scale="y2" />
        <Area scale="y2" />
        <Band scale="y2" low="bad" high="bad" />
        <Bars id="day" y="bad" scale="y2" interactive={false} />
        <ValueLabel scale="y2" />
        <Axis side="right" scale="y2" />
      </>,
      { y2: { field: 'bad' } as LinearScaleSpec<Row> },
    )
    expect(parts(container, 'bar')).toHaveLength(3)
    expect(container.innerHTML).not.toContain('NaN')
  })

  it('warns under its own key when y2 has no field or domain', () => {
    const { container } = renderDual(<Line scale="y2" y="u" dots="none" />, { y2: {} })
    expect(warnings().join()).toContain('The y2 scale has no domain')
    expect(container.innerHTML).not.toContain('NaN')
  })
})

describe('reversed y2', () => {
  const y2 = { field: 'u', domain: [1000, 0] } as LinearScaleSpec<Row>

  it('puts the larger value at the bottom', () => {
    const { container } = renderDual(<Line scale="y2" />, { y2 })
    expect(numbers(parts(container, 'line-dot'), 'cy')).toEqual([25, 100, 50])
  })

  it('labels the axis the same way', () => {
    const { container } = renderDual(<Axis side="right" scale="y2" ticks={2} />, { y2 })
    const label = parts(container, 'axis-label').find((el) => el.textContent === '1,000')
    expect(label?.getAttribute('y')).toBe('100')
  })

  it('turns the Area gradient over from the scale it was given', () => {
    const flipped = renderDual(<Area scale="y2" />, { y2 })
    expect(
      flipped.container
        .querySelector('[data-ch-part="area-group"] linearGradient')
        ?.getAttribute('y1'),
    ).toBe('1')
    // y stays upright, so the same chart's Area on y is not flipped.
    const upright = renderDual(<Area />, { y2 })
    expect(
      upright.container
        .querySelector('[data-ch-part="area-group"] linearGradient')
        ?.getAttribute('y1'),
    ).toBe('0')
  })
})

describe('active ring on y2', () => {
  it('appears with dots and Bars id equal to the category', () => {
    const { container } = renderDual(
      <>
        <Bars id="day" />
        <Line scale="y2" />
      </>,
      { activeId: 'b' },
    )
    const [ring] = parts(container, 'dot-ring')
    expect(ring?.getAttribute('cx')).toBe('150')
    expect(ring?.getAttribute('cy')).toBe('0')
  })

  it('is absent with dots="none"', () => {
    const { container } = renderDual(
      <>
        <Bars id="day" />
        <Line scale="y2" dots="none" />
      </>,
      { activeId: 'b' },
    )
    expect(parts(container, 'dot-ring')).toEqual([])
  })
})

describe('without y2', () => {
  const marks = (scale?: 'y') => (
    <>
      <Grid />
      <Area scale={scale} />
      <Band scale={scale} low={(d: Row) => d.v / 2} high="v" />
      <Bars id="day" scale={scale} />
      <Line scale={scale} />
      <ValueLabel scale={scale} />
      <Target y={5} scale={scale} />
      <Axis side="left" scale={scale} />
    </>
  )

  it('creates only the two scales it always did', () => {
    renderDual(marks(), { y2: undefined })
    expect(vi.mocked(createScale)).toHaveBeenCalledTimes(2)
  })

  it('creates a third with y2', () => {
    renderDual(marks(), { y2: { field: 'u' } })
    expect(vi.mocked(createScale)).toHaveBeenCalledTimes(3)
  })

  it('renders the same markup with scale="y" as with no scale', () => {
    const plain = renderDual(marks(), { y2: undefined }).container.innerHTML
    const explicit = renderDual(marks('y'), { y2: undefined }).container.innerHTML
    // The gradient's id has a useId in it, which differs from one root to the next.
    const normalize = (html: string) => html.replace(/-area-[^"#)]*/g, '-area')
    expect(normalize(explicit)).toBe(normalize(plain))
    expect(y2Warnings()).toEqual([])
  })
})

describe('a point y', () => {
  it('warns y2-orientation, like a band y', () => {
    render(
      <Chart<Row>
        {...frame}
        data={rows}
        x={{ field: 'v' }}
        y={{ type: 'point', field: 'day' }}
        y2={{ field: 'u' }}
      >
        <Line />
      </Chart>,
    )
    expect(y2Warnings()).toHaveLength(1)
    expect(y2Warnings()[0]).toContain('band or point scale on <Chart y>')
  })
})

describe('Bars that stay mounted', () => {
  const chart = (y2: LinearScaleSpec<Row>, scale?: 'y2') => (
    <Chart<Row>
      {...frame}
      data={rows}
      x={{ type: 'band', field: 'day', padding: 0 }}
      y={{ field: 'v' }}
      y2={y2}
    >
      <Bars id="day" scale={scale} />
    </Chart>
  )

  it('follows a changed y2 domain', () => {
    const { container, rerender } = render(chart({ field: 'u', domain: [0, 1000] }, 'y2'))
    expect(numbers(parts(container, 'bar'), 'height')).toEqual([25, 100, 50])
    rerender(chart({ field: 'u', domain: [0, 2000] }, 'y2'))
    expect(numbers(parts(container, 'bar'), 'height')).toEqual([12.5, 50, 25])
  })

  it('follows scale flipping between y and y2', () => {
    const { container, rerender } = render(chart({ field: 'u' }))
    expect(numbers(parts(container, 'bar'), 'height')).toEqual([100, 50, 20])
    rerender(chart({ field: 'u' }, 'y2'))
    expect(numbers(parts(container, 'bar'), 'height')).toEqual([25, 100, 50])
    rerender(chart({ field: 'u' }))
    expect(numbers(parts(container, 'bar'), 'height')).toEqual([100, 50, 20])
    expect(y2Warnings()).toEqual([])
  })
})

describe('Axis markup without tone', () => {
  // The attributes from before the second axis: a group with a part and a side, and labels with a
  // part, a position and an anchor. Nothing about tone or a style.
  it.each([
    ['left', ['-8', '100'], 'end', 'middle'],
    ['right', ['308', '100'], 'start', 'middle'],
    ['bottom', ['50', '108'], 'middle', 'hanging'],
    ['top', ['50', '-8'], 'middle', 'auto'],
  ] as const)('%s keeps its attributes', (side, [x, y], anchor, baseline) => {
    const { container } = renderDual(<Axis side={side} ticks={2} />)
    const group = parts(container, 'axis')[0] as SVGElement
    expect(group.tagName).toBe('g')
    expect(group.getAttributeNames().sort()).toEqual(['data-ch-part', 'data-ch-side'])
    expect(group.getAttribute('data-ch-side')).toBe(side)
    const label = parts(container, 'axis-label')[0] as SVGElement
    expect(label.getAttributeNames().sort()).toEqual([
      'data-ch-part',
      'dominant-baseline',
      'text-anchor',
      'x',
      'y',
    ])
    expect(label.getAttribute('x')).toBe(x)
    expect(label.getAttribute('text-anchor')).toBe(anchor)
    expect(label.getAttribute('dominant-baseline')).toBe(baseline)
    expect(label.getAttribute('y')).toBe(y)
  })
})
