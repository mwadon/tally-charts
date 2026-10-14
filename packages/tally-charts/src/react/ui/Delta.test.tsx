import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChartsProvider } from '../ChartsProvider'
import { Delta } from './Delta'

const delta = (root: HTMLElement) => root.querySelector('[data-ch-part="delta"]')

describe('<Delta>', () => {
  it('shows a falling value with a down arrow in the loss tone', () => {
    const { container } = render(<Delta value={-1.2} format="pts" />)
    expect(delta(container)).toHaveAttribute('data-ch-direction', 'down')
    expect(delta(container)).toHaveAttribute('data-ch-tone', 'loss')
    expect(delta(container)).toHaveTextContent('▼Down 1.2 pts')
  })

  it('uses the gain tone for a rise when up is good', () => {
    const { container } = render(<Delta value={6.2} format="percent" />)
    expect(delta(container)).toHaveAttribute('data-ch-tone', 'gain')
    expect(delta(container)).toHaveTextContent('▲Up 6.2%')
  })

  it('flips the tone when down is good and can show the sign', () => {
    const { container } = render(<Delta value={34} format="percent" good="down" signed />)
    expect(delta(container)).toHaveAttribute('data-ch-tone', 'loss')
    expect(delta(container)).toHaveTextContent('+34.0%')
  })

  it('shows no change in the neutral tone for zero', () => {
    const { container } = render(<Delta value={0} format="percent" />)
    expect(delta(container)).toHaveAttribute('data-ch-direction', 'flat')
    expect(delta(container)).toHaveAttribute('data-ch-tone', 'neutral')
    expect(delta(container)).toHaveTextContent('–No change 0.0%')
  })

  it('honors an explicit tone', () => {
    const { container } = render(<Delta value={2} tone="warn" />)
    expect(delta(container)).toHaveAttribute('data-ch-tone', 'warn')
  })

  it('keeps the arrow out of the accessibility tree', () => {
    const { container } = render(<Delta value={2} />)
    expect(container.querySelector('.ch-delta-arrow')).toHaveAttribute('aria-hidden', 'true')
  })

  it('formats with the ChartsProvider locale', () => {
    const { container } = render(
      <ChartsProvider locale="de-DE">
        <Delta value={1234.5} />
      </ChartsProvider>,
    )
    expect(delta(container)).toHaveTextContent('1.234,5')
  })

  it('renders nothing for a non-finite value', () => {
    const { container } = render(<Delta value={Number.NaN} />)
    expect(delta(container)).toBeNull()
  })
})
