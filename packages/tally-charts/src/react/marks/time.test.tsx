import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { TimeScaleSpec } from '../../core/scale'
import { Chart } from '../Chart'
import { ChartsProvider } from '../ChartsProvider'
import { Area } from './Area'
import { Axis } from './Axis'
import { Band } from './Band'
import { Bars } from './Bars'
import { ColumnHighlight } from './ColumnHighlight'
import { Grid } from './Grid'
import { Line } from './Line'
import { Region } from './Region'
import { Target } from './Target'

type Day = { date: string | Date | number | null; v: number; lo: number; hi: number }
const days: Day[] = [
  { date: '2026-01-01', v: 2, lo: 1, hi: 3 },
  { date: new Date('2026-01-02T00:00:00Z'), v: 5, lo: 4, hi: 6 },
  { date: Date.UTC(2026, 0, 4), v: 8, lo: 7, hi: 9 },
]

// 400 × 100 with no margin over Jan 1 – Jan 5 (UTC): 100px per day; y = 100 − 10 × v.
const X: TimeScaleSpec<Day> = { type: 'time', field: 'date', domain: ['2026-01-01', '2026-01-05'] }

function renderTime(children: ReactNode, x: TimeScaleSpec<Day> = X, data: Day[] = days) {
  return render(
    <Chart<Day>
      title="Time"
      width={400}
      height={100}
      margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
      animate={false}
      data={data}
      x={x}
      y={{ field: 'v', domain: [0, 10] }}
    >
      {children}
    </Chart>,
  )
}

const parts = (root: HTMLElement, part: string) => [
  ...root.querySelectorAll(`[data-ch-part="${part}"]`),
]
const labels = (root: HTMLElement) => parts(root, 'axis-label').map((el) => el.textContent)
const attrs = (els: Element[], name: string) => els.map((el) => el.getAttribute(name))

describe('marks on a time x scale', () => {
  it('labels the axis with multi-scale dates at their positions', () => {
    const { container } = renderTime(<Axis side="bottom" />)
    expect(labels(container)).toEqual(['Jan 1, 2026', 'Jan 2', 'Jan 3', 'Jan 4', 'Jan 5'])
    expect(attrs(parts(container, 'axis-label'), 'x')).toEqual(['0', '100', '200', '300', '400'])
    // The ticks on the plot edges anchor inward, so they don't run past the plot.
    expect(attrs(parts(container, 'axis-label'), 'text-anchor')).toEqual([
      'start',
      'middle',
      'middle',
      'middle',
      'end',
    ])
  })

  it('formats the axis with a date spec, a function, or ends only', () => {
    const { container } = renderTime(
      <>
        <Axis side="bottom" ticks={2} format="day" />
        <Axis side="top" format={(v) => (v instanceof Date ? v.toISOString().slice(5, 10) : '')} />
        <Axis side="left" ticks="ends" />
      </>,
    )
    const [bottom, top] = parts(container, 'axis')
    expect([...(bottom?.children ?? [])].map((el) => el.textContent)).toEqual([
      'Jan 1, 2026',
      'Jan 3, 2026',
      'Jan 5, 2026',
    ])
    expect([...(top?.children ?? [])].map((el) => el.textContent)).toEqual([
      '01-01',
      '01-02',
      '01-03',
      '01-04',
      '01-05',
    ])
    expect(labels(container).slice(-2)).toEqual(['0', '10'])
  })

  it('labels the ends in full and anchors them inward on a time x axis', () => {
    const { container } = renderTime(<Axis side="bottom" ticks="ends" />)
    expect(labels(container)).toEqual(['Jan 1, 2026', 'Jan 5, 2026'])
    expect(attrs(parts(container, 'axis-label'), 'text-anchor')).toEqual(['start', 'end'])
  })

  it('uses the provider locale for dates', () => {
    const { container } = render(
      <ChartsProvider locale="de-DE">
        <Chart<Day>
          title="Zeit"
          width={400}
          height={100}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          data={days}
          x={X}
          y={{ domain: [0, 10] }}
        >
          <Axis side="bottom" ticks={2} />
        </Chart>
      </ChartsProvider>,
    )
    expect(labels(container)).toEqual(['1. Jan. 2026', '3. Jan.', '5. Jan.'])
  })

  it('draws lines, bands and areas through the dates', () => {
    const { container } = renderTime(
      <>
        <Band<Day> low="lo" high="hi" />
        <Area<Day> />
        <Line<Day> />
      </>,
    )
    expect(parts(container, 'line')[0]).toHaveAttribute('d', 'M0,80L100,50L300,20')
    expect(attrs(parts(container, 'line-dot'), 'cx')).toEqual(['0', '100', '300'])
    expect(parts(container, 'band')[0]).toHaveAttribute(
      'd',
      'M0,70L100,40L300,10L300,30L100,60L0,90Z',
    )
    expect(parts(container, 'area')[0]?.getAttribute('d')).toMatch(/^M0,80L100,50L300,20/)
  })

  it('skips points whose x is not a date, with one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderTime(<Line<Day> />, X, [
      ...days,
      { date: 'soon', v: 1, lo: 0, hi: 2 },
      { date: null, v: 1, lo: 0, hi: 2 },
    ])
    expect(attrs(parts(container, 'line-dot'), 'cx')).toEqual(['0', '100', '300'])
    expect(container.innerHTML).not.toContain('NaN')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('Line skipped an x value that is not a date')
  })

  it('shades a region between dates, or from a date to the end', () => {
    const { container } = renderTime(
      <>
        <Region from={new Date('2026-01-03T00:00:00Z')} />
        <Region from="2026-01-02" to={Date.UTC(2026, 0, 3)} tone="neutral" />
      </>,
    )
    const [toEnd, between] = parts(container, 'region')
    expect([toEnd?.getAttribute('x'), toEnd?.getAttribute('width')]).toEqual(['200', '200'])
    expect([between?.getAttribute('x'), between?.getAttribute('width')]).toEqual(['100', '100'])
  })

  it('warns and draws no region for an invalid date', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderTime(<Region from="later" />)
    expect(parts(container, 'region')).toHaveLength(0)
    expect(warn.mock.calls[0]?.[0]).toContain('Region from "later"')
  })

  it('draws a target rule at a date', () => {
    const { container } = renderTime(
      <>
        <Target x="2026-01-03" label="Launch" />
        <Target x={new Date('2026-02-01')} />
      </>,
    )
    const rules = parts(container, 'target')
    // The second date is outside the domain, so only the first rule is drawn.
    expect(rules).toHaveLength(1)
    expect(rules[0]).toHaveAttribute('x1', '200')
    expect(parts(container, 'target-label')[0]).toHaveTextContent('Launch')
  })

  it('rules the grid at the y ticks', () => {
    const { container } = renderTime(<Grid ticks={2} />)
    expect(attrs(parts(container, 'grid-line'), 'y1')).toEqual(['100', '50', '0'])
  })

  it('draws no bars and no column highlight, with one warning each', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderTime(
      <>
        <Bars<Day> />
        <ColumnHighlight at="2026-01-02" />
      </>,
    )
    expect(parts(container, 'bar')).toHaveLength(0)
    expect(parts(container, 'column-highlight')).toHaveLength(0)
    const messages = warn.mock.calls.map((call) => String(call[0]))
    expect(messages.filter((m) => m.includes('Bars need one band scale'))).toHaveLength(1)
    expect(messages.filter((m) => m.includes('ColumnHighlight needs a band scale'))).toHaveLength(1)
  })
})
