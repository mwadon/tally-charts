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
})
