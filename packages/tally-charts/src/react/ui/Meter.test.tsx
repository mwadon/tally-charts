import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Meter } from './Meter'

describe('<Meter>', () => {
  it('exposes a named meter with its value and target', () => {
    render(<Meter value={34} min={20} max={45} target={38} format="percent" label="Gross margin" />)
    const meter = screen.getByRole('meter', { name: 'Gross margin' })
    expect(meter).toHaveAttribute('aria-valuenow', '34')
    expect(meter).toHaveAttribute('aria-valuemin', '20')
    expect(meter).toHaveAttribute('aria-valuemax', '45')
    expect(meter).toHaveAttribute('aria-valuetext', '34.0%, target 38.0%')
  })

  it('fills to the value and puts the tick at the target', () => {
    const { container } = render(<Meter value={30} min={20} max={40} target={35} label="m" />)
    expect(container.querySelector('.ch-meter-fill')).toHaveStyle({ width: '50%' })
    expect(container.querySelector('[data-ch-part="meter-target"]')).toHaveStyle({ left: '75%' })
  })

  it('hatches the fill in the tone by default', () => {
    const { container } = render(<Meter value={30} label="m" />)
    const fill = container.querySelector('.ch-meter-fill')
    expect(fill).toHaveAttribute('data-ch-fill', 'hatch')
    expect(fill).toHaveAttribute('data-ch-tone', 'accent')
  })

  it('labels the start and the target, and hides labels set to null', () => {
    const { container, rerender } = render(
      <Meter value={34} min={20} max={45} target={38} format="percent" label="m" />,
    )
    expect(container.querySelector('.ch-meter-labels')).toHaveTextContent('20.0%Target 38.0%')
    rerender(
      <Meter
        value={34}
        min={20}
        max={45}
        target={38}
        label="m"
        minLabel="20%"
        targetLabel={null}
      />,
    )
    expect(container.querySelector('.ch-meter-labels')).toHaveTextContent('20%')
    expect(container.querySelector('.ch-meter-target-label')).toBeNull()
  })

  it('clamps out-of-range values and survives bad input', () => {
    const { container, rerender } = render(<Meter value={160} label="m" />)
    expect(container.querySelector('.ch-meter-fill')).toHaveStyle({ width: '100%' })
    rerender(<Meter value={Number.NaN} label="m" />)
    const meter = screen.getByRole('meter')
    expect(meter).toHaveAttribute('aria-valuenow', '0')
    expect(meter).toHaveAttribute('aria-valuetext', 'No data')
    expect(container.querySelector('.ch-meter-fill')).toHaveStyle({ width: '0%' })
  })
})
