import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Delta } from './Delta'
import { Stat } from './Stat'

const part = (root: HTMLElement, selector: string) => root.querySelector(selector)

describe('<Stat>', () => {
  it('formats a number and shows label, delta and caption', () => {
    const { container } = render(
      <Stat
        value={34}
        format="percent"
        label="Gross margin"
        delta={<Delta value={-1.2} format="pts" />}
        caption="vs last week"
      />,
    )
    expect(part(container, '.ch-stat-value')).toHaveTextContent('34.0%')
    expect(part(container, '.ch-stat-label')).toHaveTextContent('Gross margin')
    expect(part(container, '[data-ch-part="delta"]')).not.toBeNull()
    expect(part(container, '.ch-stat-caption')).toHaveTextContent('vs last week')
    expect(part(container, '[data-ch-part="stat"]')).toHaveAttribute('data-ch-size', 'lg')
  })

  it('shows preformatted text as is and tints the value by tone', () => {
    const { container } = render(<Stat value="$51K" tone="loss" size="md" />)
    const value = part(container, '.ch-stat-value')
    expect(value).toHaveTextContent('$51K')
    expect(value).toHaveAttribute('data-ch-tone', 'loss')
    expect(value).toHaveAttribute('data-ch-tone-text', 'true')
    expect(part(container, '.ch-stat-meta')).toBeNull()
  })

  it('shows a dash for a non-finite number', () => {
    const { container } = render(<Stat value={Number.NaN} />)
    expect(part(container, '.ch-stat-value')).toHaveTextContent('–')
  })
})
