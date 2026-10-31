import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DotCount } from './DotCount'

const dots = (root: HTMLElement) => root.querySelectorAll('.ch-dot')

describe('<DotCount>', () => {
  it('draws one dot per item and labels the count', () => {
    const { container } = render(<DotCount count={29} label="29 jobs" />)
    expect(dots(container)).toHaveLength(29)
    expect(container.querySelector('.ch-dot-count-label')).toHaveTextContent('29 jobs')
    expect(container.querySelector('.ch-dot-grid')).toHaveAttribute('aria-hidden', 'true')
  })

  it('uses the accent tone by default and honors an explicit one', () => {
    const { container, rerender } = render(<DotCount count={3} />)
    expect(container.querySelector('[data-ch-part="dot-count"]')).toHaveStyle({
      '--_ch-swatch-color': 'var(--ch-accent)',
    })
    rerender(<DotCount count={3} tone="loss" />)
    expect(container.querySelector('[data-ch-part="dot-count"]')).toHaveStyle({
      '--_ch-swatch-color': 'var(--ch-loss)',
    })
  })

  it('caps the dots at max but keeps the full count in the label', () => {
    const { container } = render(<DotCount count={40} max={10} />)
    expect(dots(container)).toHaveLength(10)
    expect(container.querySelector('.ch-dot-count-label')).toHaveTextContent('40')
  })

  it('wraps rows at perRow', () => {
    const { container } = render(<DotCount count={4} perRow={15} />)
    expect(container.querySelector('.ch-dot-grid')).toHaveStyle({
      gridTemplateColumns: 'repeat(15, 8px)',
    })
  })

  it('keeps the count readable when the label is hidden', () => {
    const { container } = render(<DotCount count={3} label={null} />)
    expect(container.querySelector('.ch-dot-count-label')).toBeNull()
    expect(container.querySelector('.ch-sr-only')).toHaveTextContent('3')
  })

  it('draws nothing for a bad count', () => {
    const { container } = render(<DotCount count={Number.NaN} />)
    expect(dots(container)).toHaveLength(0)
    expect(container.querySelector('.ch-dot-count-label')).toHaveTextContent('0')
  })

  it('formats the default label and the screen-reader count', () => {
    const { container, rerender } = render(<DotCount count={1234} />)
    expect(container.querySelector('.ch-dot-count-label')).toHaveTextContent('1,234')
    rerender(<DotCount count={1234} label={null} />)
    expect(container.querySelector('.ch-sr-only')).toHaveTextContent('1,234')
  })

  it('falls back to 15 dots per row for a non-finite perRow', () => {
    const { container } = render(<DotCount count={4} perRow={Number.NaN} />)
    expect(container.querySelector('.ch-dot-grid')).toHaveStyle({
      gridTemplateColumns: 'repeat(15, 8px)',
    })
  })
})
