import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Legend } from './Legend'

describe('<Legend>', () => {
  it('renders a list item per entry with swatch metadata', () => {
    render(
      <Legend
        items={[
          { label: 'Estimate', tone: 'accent', fill: 'hatch' },
          { label: 'Actual', tone: 'accent' },
          { label: 'Critical', tone: 'loss', count: 6, shape: 'dot' },
        ]}
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Estimate')
    const swatch = (i: number) => items[i]?.querySelector('.ch-swatch')
    expect(swatch(0)).toHaveAttribute('data-ch-fill', 'hatch')
    expect(swatch(0)).toHaveAttribute('data-ch-tone', 'accent')
    expect(swatch(0)).toHaveAttribute('aria-hidden', 'true')
    expect(swatch(1)).toHaveAttribute('data-ch-fill', 'solid')
    expect(swatch(2)).toHaveAttribute('data-ch-shape', 'dot')
    expect(items[2]).toHaveTextContent('Critical6')
  })

  it('applies the legend-level shape to items without one', () => {
    render(<Legend shape="dot" items={[{ label: 'On target', tone: 'gain' }]} />)
    expect(screen.getByRole('listitem').querySelector('.ch-swatch')).toHaveAttribute(
      'data-ch-shape',
      'dot',
    )
  })

  it('draws line swatches, dashed for forecasts', () => {
    render(
      <Legend
        shape="line"
        items={[
          { label: 'Actual', tone: 'accent' },
          { label: 'Current path', tone: 'accent', dashed: true },
        ]}
      />,
    )
    const swatches = screen.getAllByRole('listitem').map((li) => li.querySelector('.ch-swatch'))
    expect(swatches[0]).toHaveAttribute('data-ch-shape', 'line')
    expect(swatches[0]).not.toHaveAttribute('data-ch-dashed')
    expect(swatches[1]).toHaveAttribute('data-ch-dashed', 'true')
  })

  it('paints sequential levels instead of tones', () => {
    render(
      <Legend
        items={[
          { label: 'Under $4K', level: 1 },
          { label: '$13K and up', level: 5 },
        ]}
      />,
    )
    const swatch = screen.getAllByRole('listitem')[1]?.querySelector('.ch-swatch') as HTMLElement
    expect(swatch).toHaveAttribute('data-ch-level', '5')
    expect(swatch).not.toHaveAttribute('data-ch-tone')
    expect(swatch.style.getPropertyValue('--_ch-swatch-color')).toBe('var(--ch-seq-5)')
  })

  it('falls back to the neutral tone', () => {
    render(<Legend items={[{ label: 'Other' }]} />)
    expect(screen.getByRole('listitem').querySelector('.ch-swatch')).toHaveAttribute(
      'data-ch-tone',
      'neutral',
    )
  })

  it('marks line swatches with the series dot, filled or hollow', () => {
    render(
      <Legend
        shape="line"
        items={[
          { label: 'Actual', tone: 'accent', marker: 'dot' },
          { label: 'Current path', tone: 'accent', dashed: true, marker: 'ring' },
          { label: 'Target', tone: 'neutral' },
        ]}
      />,
    )
    const swatches = screen.getAllByRole('listitem').map((li) => li.querySelector('.ch-swatch'))
    expect(swatches[0]).toHaveAttribute('data-ch-marker', 'dot')
    expect(swatches[1]).toHaveAttribute('data-ch-marker', 'ring')
    expect(swatches[2]).not.toHaveAttribute('data-ch-marker')
  })

  it('draws a band swatch like the Band mark', () => {
    render(<Legend items={[{ label: 'Likely range', tone: 'accent', shape: 'band' }]} />)
    expect(screen.getByRole('listitem').querySelector('.ch-swatch')).toHaveAttribute(
      'data-ch-shape',
      'band',
    )
  })
})
