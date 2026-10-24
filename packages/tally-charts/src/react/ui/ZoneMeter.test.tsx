import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { thresholds } from '../../core/thresholds'
import { ZoneMeter } from './ZoneMeter'

afterEach(() => vi.restoreAllMocks())

const lcp = thresholds([2.5, 4], ['gain', 'warn', 'loss'], ['Good', 'Needs improvement', 'Poor'])
const seconds = (v: number) => `${v.toFixed(1)} s`

describe('<ZoneMeter>', () => {
  it('exposes a meter whose text names the value and its zone', () => {
    render(<ZoneMeter label="LCP" value={4.1} zones={lcp} max={6} format={seconds} />)
    const meter = screen.getByRole('meter', { name: 'LCP' })
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '6')
    expect(meter).toHaveAttribute('aria-valuenow', '4.1')
    expect(meter).toHaveAttribute('aria-valuetext', '4.1 s, Poor')
  })

  it('puts a value on a break in the upper zone', () => {
    render(<ZoneMeter label="LCP" value={2.5} zones={lcp} max={6} format={seconds} />)
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', '2.5 s, Needs improvement')
  })

  it('takes plain bins and follows an upper-inclusive spec', () => {
    const upper = thresholds(
      [2.5, 4],
      ['gain', 'warn', 'loss'],
      ['Good', 'Needs improvement', 'Poor'],
      {
        inclusive: 'upper',
      },
    )
    // A plain object, as a Server Component would pass it.
    const zones = { bins: upper.bins, inclusive: upper.inclusive }
    render(<ZoneMeter label="LCP" value={2.5} zones={zones} max={6} format={seconds} />)
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', '2.5 s, Good')
    render(<ZoneMeter label="CLS" value={4} zones={{ bins: lcp.bins }} max={6} format={seconds} />)
    expect(screen.getByRole('meter', { name: 'CLS' })).toHaveAttribute(
      'aria-valuetext',
      '4.0 s, Poor',
    )
  })

  it('draws linear zones clipped to the range, in their tones', () => {
    const { container } = render(<ZoneMeter label="LCP" value={1} zones={lcp} max={6} />)
    const zones = [...container.querySelectorAll('[data-ch-part="zone-meter-zone"]')]
    expect(zones.map((z) => z.getAttribute('data-ch-tone'))).toEqual(['gain', 'warn', 'loss'])
    expect(zones[0]).toHaveStyle({ left: '0%', width: '41.6667%' })
    expect(zones[1]).toHaveStyle({ left: '41.6667%', width: '25%' })
    expect(zones[2]).toHaveStyle({ left: '66.6667%', width: '33.3333%' })
    expect(container.querySelector('[data-ch-part="zone-meter-marker"]')).toHaveStyle({
      left: '16.6667%',
    })
  })

  it('draws one zone when every break is outside the range', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(<ZoneMeter label="LCP" value={1} zones={lcp} min={5} max={6} />)
    const zones = container.querySelectorAll('[data-ch-part="zone-meter-zone"]')
    expect(zones).toHaveLength(1)
    expect(zones[0]).toHaveStyle({ left: '0%', width: '100%' })
  })

  it('pins out-of-range values to the end and says so', () => {
    const { container, rerender } = render(
      <ZoneMeter label="LCP" value={6.4} zones={lcp} max={6} format={seconds} />,
    )
    const meter = screen.getByRole('meter')
    expect(meter).toHaveAttribute('aria-valuenow', '6')
    expect(meter).toHaveAttribute('aria-valuetext', '6.4 s, above 6.0 s, Poor')
    expect(container.querySelector('[data-ch-part="zone-meter-marker"]')).toHaveStyle({
      left: '100%',
    })
    rerender(<ZoneMeter label="LCP" value={-1} zones={lcp} max={6} format={seconds} />)
    expect(meter).toHaveAttribute('aria-valuetext', '-1.0 s, below 0.0 s, Good')
  })

  it('draws no marker for a missing value', () => {
    const { container } = render(<ZoneMeter label="LCP" value={Number.NaN} zones={lcp} max={6} />)
    const meter = screen.getByRole('meter')
    expect(meter).toHaveAttribute('aria-valuenow', '0')
    expect(meter).toHaveAttribute('aria-valuetext', 'No data')
    expect(container.querySelector('[data-ch-part="zone-meter-marker"]')).toBeNull()
  })

  it('labels min, every break inside the range and max, with overrides', () => {
    const { container, rerender } = render(
      <ZoneMeter label="LCP" value={1} zones={lcp} max={6} format={seconds} maxLabel="6 s+" />,
    )
    const labels = () =>
      [...container.querySelectorAll('[data-ch-part="zone-meter-label"]')].map((l) => l.textContent)
    expect(labels()).toEqual(['0.0 s', '2.5 s', '4.0 s', '6 s+'])
    expect(container.querySelector('[data-ch-part="zone-meter-labels"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    rerender(
      <ZoneMeter
        label="LCP"
        value={1}
        zones={lcp}
        max={6}
        minLabel={null}
        maxLabel={null}
        format={seconds}
      />,
    )
    expect(labels()).toEqual(['2.5 s', '4.0 s'])
    rerender(<ZoneMeter label="LCP" value={1} zones={lcp} max={6} ticks={false} />)
    expect(container.querySelector('[data-ch-part="zone-meter-labels"]')).toBeNull()
  })

  it('warns once about a break outside the range and about max <= min', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<ZoneMeter label="x" value={1} zones={lcp} max={3} />)
    render(<ZoneMeter label="y" value={1} zones={lcp} min={5} max={5} />)
    expect(warn.mock.calls.map((c) => String(c[0]))).toEqual([
      expect.stringContaining('ZoneMeter "x": break 4 is outside 0–3'),
      expect.stringContaining('ZoneMeter "y": max (5) must be greater than min (5)'),
    ])
  })
})
