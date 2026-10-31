import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Sparkline } from './Sparkline'

const part = (c: HTMLElement, name: string) => c.querySelector(`[data-ch-part="${name}"]`)

describe('<Sparkline>', () => {
  it('is a labelled image without a tab stop', () => {
    const { container } = render(<Sparkline values={[3, 5, 4, 8]} label="Clicks" />)
    const root = screen.getByRole('img', { name: 'Clicks' })
    expect(root).toBe(part(container, 'sparkline'))
    expect(root).not.toHaveAttribute('tabindex')
    expect(root).toHaveStyle({ height: '28px', '--_ch-swatch-color': 'var(--ch-accent)' })
  })

  it('stretches a viewBox and keeps the stroke width', () => {
    const { container } = render(<Sparkline values={[3, 5, 4, 8]} label="c" height={40} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 100 100')
    expect(svg).toHaveAttribute('preserveAspectRatio', 'none')
    expect(part(container, 'sparkline-line')).toHaveAttribute('vector-effect', 'non-scaling-stroke')
    expect(part(container, 'sparkline')).toHaveStyle({ height: '40px' })
    expect(part(container, 'sparkline-line')?.getAttribute('d')).toBe(
      'M0,92L33.33,58.4L66.67,75.2L100,8',
    )
  })

  it('draws the endpoint in HTML at the last value, never as a circle', () => {
    const { container } = render(<Sparkline values={[0, 10, 5]} label="c" endpoint />)
    const dot = part(container, 'sparkline-endpoint') as HTMLElement
    expect(dot.tagName).toBe('SPAN')
    expect(dot).toHaveStyle({ left: '100%', top: '50%' })
    expect(container.querySelector('circle')).toBeNull()
    expect(container.querySelector('svg')?.contains(dot)).toBe(false)
  })

  it('puts the endpoint on the last valid value when the series ends in null', () => {
    const { container } = render(<Sparkline values={[0, 10, null]} label="c" endpoint />)
    expect(part(container, 'sparkline-endpoint')).toHaveStyle({ left: '50%', top: '8%' })
  })

  it('breaks the line at a null into two subpaths', () => {
    const { container } = render(<Sparkline values={[1, 2, null, 4, 5]} label="c" />)
    const d = part(container, 'sparkline-line')?.getAttribute('d') ?? ''
    expect(d.match(/M/g)).toHaveLength(2)
  })

  it('breaks the line at a non-finite value', () => {
    const { container } = render(<Sparkline values={[1, 2, Number.NaN, 4, 5]} label="c" />)
    expect(part(container, 'sparkline-line')?.getAttribute('d')?.match(/M/g)).toHaveLength(2)
  })

  it('draws a flat series at mid height', () => {
    const { container } = render(<Sparkline values={[5, 5, 5]} label="c" endpoint />)
    expect(part(container, 'sparkline-line')?.getAttribute('d')).toBe('M0,50L50,50L100,50')
    expect(part(container, 'sparkline-endpoint')).toHaveStyle({ top: '50%' })
  })

  it('draws one value as a zero-length subpath, which a round cap shows as a dot', () => {
    const { container } = render(<Sparkline values={[7]} label="c" endpoint />)
    expect(part(container, 'sparkline-line')?.getAttribute('d')).toBe('M50,50h0')
    expect(part(container, 'sparkline-endpoint')).toHaveStyle({ left: '50%', top: '50%' })
  })

  it('draws every isolated value, alone or next to a longer run', () => {
    const d = (values: (number | null)[]) =>
      part(
        render(<Sparkline values={values} label="c" />).container,
        'sparkline-line',
      )?.getAttribute('d')
    expect(d([1, null, 3, null, 5])).toBe('M0,92h0M50,50h0M100,8h0')
    expect(d([1, 2, null, 4])).toBe('M0,92L33.33,64M100,8h0')
    expect(d([null, 2, null])).toBe('M50,50h0')
  })

  it('gives an isolated value no area', () => {
    const { container } = render(<Sparkline values={[1, null, 3]} area label="c" />)
    expect(part(container, 'sparkline-area')).toBeNull()
    expect(part(container, 'sparkline-line')).not.toBeNull()
  })

  it('names the empty state and draws only the box', () => {
    const { container } = render(<Sparkline values={[null, Number.NaN]} label="Clicks" endpoint />)
    expect(screen.getByRole('img', { name: 'Clicks: No data' })).toBeInTheDocument()
    expect(container.querySelector('path')).toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(part(container, 'sparkline-endpoint')).toBeNull()
    render(<Sparkline values={[]} label="Empty" />)
    expect(screen.getByRole('img', { name: 'Empty: No data' })).toBeInTheDocument()
  })

  it('clamps values to the domain', () => {
    const { container } = render(
      <Sparkline values={[-5, 5, 50]} domain={[0, 10]} label="c" endpoint />,
    )
    expect(part(container, 'sparkline-line')?.getAttribute('d')).toBe('M0,92L50,50L100,8')
    expect(container.innerHTML).not.toContain('NaN')
  })

  it('maps a reversed domain as given, so its first value sits at the bottom', () => {
    const { container } = render(
      <Sparkline values={[1, 10]} domain={[10, 1]} target={4} endpoint label="c" />,
    )
    expect(part(container, 'sparkline-line')?.getAttribute('d')).toBe('M0,8L100,92')
    expect(part(container, 'sparkline-endpoint')).toHaveStyle({ left: '100%', top: '92%' })
    expect(part(container, 'sparkline-target')).toHaveAttribute('y1', '36')
  })

  it('clamps between the ends of a reversed domain', () => {
    const { container } = render(<Sparkline values={[20, 0]} domain={[10, 1]} label="c" />)
    expect(part(container, 'sparkline-line')?.getAttribute('d')).toBe('M0,92L100,8')
  })

  it('refuses a target outside an explicit domain, with one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    for (const domain of [
      [0, 5],
      [5, 0],
    ] as const) {
      const { container } = render(
        <Sparkline values={[1, 2]} domain={domain} target={9} label="c" />,
      )
      expect(part(container, 'sparkline-target')).toBeNull()
      expect(part(container, 'sparkline-line')).not.toBeNull()
    }
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('Sparkline target 9 is outside the domain')
    warn.mockRestore()
  })

  it('draws a target on the edge of an explicit domain, with no warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(<Sparkline values={[1, 2]} domain={[5, 0]} target={5} label="c" />)
    expect(part(container, 'sparkline-target')).toHaveAttribute('y1', '92')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('keeps NaN out of the markup for odd input', () => {
    for (const props of [
      { values: [1, 2], domain: [Number.NaN, 1] as const },
      { values: [1, 1], domain: [3, 3] as const },
      { values: [1, 2], target: Number.NaN },
      { values: [Number.POSITIVE_INFINITY, 2] },
    ]) {
      const { container, unmount } = render(<Sparkline label="c" endpoint area {...props} />)
      expect(container.innerHTML).not.toContain('NaN')
      expect(container.innerHTML).not.toContain('Infinity')
      unmount()
    }
  })

  it('draws a target rule and includes it in the inferred domain', () => {
    const { container } = render(<Sparkline values={[3, 5]} target={9} label="c" />)
    expect(part(container, 'sparkline-target')).toHaveAttribute('y1', '8')
    // The data tops out below the target: 5 is two thirds of the way between 3 and 9.
    expect(part(container, 'sparkline-line')?.getAttribute('d')).toBe('M0,92L100,64')
  })

  it('has no target by default', () => {
    const { container } = render(<Sparkline values={[3, 5]} label="c" />)
    expect(part(container, 'sparkline-target')).toBeNull()
  })

  it('adds a flat area without a gradient or id', () => {
    const { container } = render(<Sparkline values={[1, 2, null, 4, 5]} area label="c" />)
    const area = part(container, 'sparkline-area')
    expect(area?.getAttribute('d')?.match(/Z/g)).toHaveLength(2)
    expect(container.innerHTML).not.toMatch(/gradient|id=/i)
    expect(
      part(render(<Sparkline values={[1, 2]} label="c" />).container, 'sparkline-area'),
    ).toBeNull()
  })

  it('takes a tone and a class name', () => {
    const { container } = render(<Sparkline values={[1, 2]} label="c" tone="gain" className="x" />)
    expect(part(container, 'sparkline')).toHaveClass('ch-sparkline', 'x')
    expect(part(container, 'sparkline')).toHaveStyle({ '--_ch-swatch-color': 'var(--ch-gain)' })
  })

  it('renders the same markup every time', () => {
    const el = <Sparkline values={[3, 5, null, 8]} label="c" area endpoint target={4} />
    expect(renderToString(el)).toBe(renderToString(el))
  })
})
