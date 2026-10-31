import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RangeMeter } from './RangeMeter'

describe('<RangeMeter>', () => {
  it('describes both values in its accessible name', () => {
    render(<RangeMeter value={10} reference={30} max={40} format="percent" label="Margin" />)
    expect(screen.getByRole('img', { name: 'Margin: 10.0% against 30.0%' })).toBeInTheDocument()
  })

  it('places the dot, the ring and the hatched gap between them', () => {
    const { container } = render(<RangeMeter value={10} reference={30} max={40} label="m" />)
    expect(container.querySelector('.ch-range-dot')).toHaveStyle({ left: '25%' })
    expect(container.querySelector('.ch-range-ring')).toHaveStyle({ left: '75%' })
    const gap = container.querySelector('.ch-range-gap')
    expect(gap).toHaveStyle({ left: '25%', width: '50%' })
    expect(gap).toHaveAttribute('data-ch-fill', 'hatch')
  })

  it('colors the value accent and the reference neutral by default', () => {
    const { container } = render(<RangeMeter value={10} reference={30} max={40} label="m" />)
    expect(container.querySelector('[data-ch-part="range-meter"]')).toHaveStyle({
      '--_ch-swatch-color': 'var(--ch-accent)',
      '--_ch-range-ref': 'var(--ch-neutral)',
    })
  })

  it('still applies an explicit loss tone and accent reference', () => {
    const { container } = render(
      <RangeMeter
        value={10}
        reference={30}
        max={40}
        tone="loss"
        referenceTone="accent"
        label="m"
      />,
    )
    expect(container.querySelector('[data-ch-part="range-meter"]')).toHaveStyle({
      '--_ch-swatch-color': 'var(--ch-loss)',
      '--_ch-range-ref': 'var(--ch-accent)',
    })
  })

  it('works when the value is above the reference', () => {
    const { container } = render(<RangeMeter value={30} reference={10} max={40} label="m" />)
    expect(container.querySelector('.ch-range-gap')).toHaveStyle({ left: '25%', width: '50%' })
  })

  it('shows custom labels above and the scale below', () => {
    const { container, rerender } = render(
      <RangeMeter
        value={12.3}
        reference={36}
        max={40}
        format="percent"
        label="m"
        valueLabel="Actual 12.3%"
        referenceLabel="Estimated 36.0%"
      />,
    )
    expect(container.querySelector('.ch-range-value-label')).toHaveTextContent('Actual 12.3%')
    expect(container.querySelector('.ch-range-ref-label')).toHaveTextContent('Estimated 36.0%')
    expect(container.querySelector('.ch-range-scale')).toHaveTextContent('0.0%40.0%')
    expect(container.querySelector('[data-ch-part="range-scale-min"]')).toHaveTextContent('0.0%')
    expect(container.querySelector('[data-ch-part="range-scale-max"]')).toHaveTextContent('40.0%')
    rerender(<RangeMeter value={12.3} reference={36} max={40} label="m" showScale={false} />)
    expect(container.querySelector('.ch-range-scale')).toBeNull()
  })

  it('draws no dot or gap for a missing value', () => {
    const { container } = render(
      <RangeMeter value={Number.NaN} reference={36} max={40} format="percent" label="Margin" />,
    )
    expect(screen.getByRole('img', { name: 'Margin: No data' })).toBeInTheDocument()
    expect(container.querySelector('.ch-range-dot')).toBeNull()
    expect(container.querySelector('.ch-range-gap')).toBeNull()
    expect(container.querySelector('.ch-range-value-label')).toBeNull()
    expect(container.querySelector('.ch-range-ring')).toHaveStyle({ left: '90%' })
  })

  it('draws no ring or gap for a missing reference', () => {
    const { container } = render(
      <RangeMeter value={10} reference={Number.NaN} max={40} format="percent" label="Margin" />,
    )
    expect(screen.getByRole('img', { name: 'Margin: 10.0%' })).toBeInTheDocument()
    expect(container.querySelector('.ch-range-ring')).toBeNull()
    expect(container.querySelector('.ch-range-gap')).toBeNull()
    expect(container.querySelector('.ch-range-ref-label')).toBeNull()
    expect(container.querySelector('.ch-range-dot')).toHaveStyle({ left: '25%' })
  })
})
