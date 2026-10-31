import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InlineBar } from './InlineBar'

describe('<InlineBar>', () => {
  it('is a labelled image with the value and the target', () => {
    render(<InlineBar value={10} max={40} target={30} label="Margin" />)
    expect(screen.getByRole('img', { name: 'Margin: 10, target 30' })).toBeInTheDocument()
  })

  it('fills to the value, ticks the target and takes a fixed width', () => {
    const { container } = render(<InlineBar value={10} max={40} target={30} label="m" />)
    expect(container.querySelector('[data-ch-part="inline-bar"]')).toHaveStyle({ width: '64px' })
    expect(container.querySelector('.ch-inline-bar-fill')).toHaveStyle({ width: '25%' })
    expect(container.querySelector('.ch-inline-bar-target')).toHaveStyle({ left: '75%' })
  })

  it('defaults to a solid accent fill and omits the tick without a target', () => {
    const { container } = render(<InlineBar value={10} max={40} label="m" />)
    const fill = container.querySelector('.ch-inline-bar-fill')
    expect(fill).toHaveAttribute('data-ch-fill', 'solid')
    expect(fill).toHaveAttribute('data-ch-tone', 'accent')
    expect(container.querySelector('[data-ch-part="inline-bar"]')).toHaveStyle({
      '--_ch-swatch-color': 'var(--ch-accent)',
    })
    expect(container.querySelector('.ch-inline-bar-target')).toBeNull()
  })

  it('still applies an explicit loss tone and hatch fill', () => {
    const { container } = render(
      <InlineBar value={10} max={40} tone="loss" fill="hatch" label="m" />,
    )
    const fill = container.querySelector('.ch-inline-bar-fill')
    expect(fill).toHaveAttribute('data-ch-fill', 'hatch')
    expect(fill).toHaveAttribute('data-ch-tone', 'loss')
  })

  it('draws no fill for a missing value and keeps a finite target tick', () => {
    const { container } = render(
      <InlineBar value={Number.NaN} max={40} target={30} label="Margin" />,
    )
    expect(screen.getByRole('img', { name: 'Margin: No data' })).toBeInTheDocument()
    expect(container.querySelector('.ch-inline-bar-fill')).toBeNull()
    expect(container.querySelector('.ch-inline-bar-target')).toHaveStyle({ left: '75%' })
  })

  it('sets a percent width as an inline style and keeps a number in px', () => {
    const { container, rerender } = render(<InlineBar value={10} max={40} width="100%" label="m" />)
    const bar = container.querySelector('[data-ch-part="inline-bar"]') as HTMLElement
    expect(bar.style.width).toBe('100%')
    rerender(<InlineBar value={10} max={40} width={56} label="m" />)
    expect(bar.style.width).toBe('56px')
  })
})
