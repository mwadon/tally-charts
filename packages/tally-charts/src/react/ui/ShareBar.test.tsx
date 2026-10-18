import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ShareBar } from './ShareBar'

const sources = [
  { label: 'Internal links', value: 2711, tone: 'gain' as const },
  { label: 'Search', value: 1968, tone: 'accent' as const },
  { label: 'Direct', value: 1101, tone: 'warn' as const },
  { label: 'Social', value: 43, tone: 'neutral' as const, fill: 'hatch' as const },
]

describe('<ShareBar>', () => {
  it('lists every part with value and percent, and hides the bar from screen readers', () => {
    const { container } = render(<ShareBar label="Where visitors come from" segments={sources} />)
    const group = screen.getByRole('group', { name: 'Where visitors come from' })
    const rows = within(group).getAllByRole('listitem')
    expect(rows.map((r) => r.textContent)).toEqual([
      'Internal links2,711 · 46%',
      'Search1,968 · 34%',
      'Direct1,101 · 19%',
      'Social43 · 1%',
    ])
    expect(container.querySelector('[data-ch-part="share-bar"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })

  it('sizes segments by share, paints tone and fill, and keeps a 3px minimum', () => {
    const { container } = render(<ShareBar label="s" segments={sources} />)
    const segs = container.querySelectorAll('[data-ch-part="share-segment"]')
    expect(segs).toHaveLength(4)
    expect(segs[0]).toHaveStyle({ flexBasis: `${(2711 / 5823) * 100}%` })
    expect(segs[3]).toHaveAttribute('data-ch-fill', 'hatch')
    expect(segs[3]).toHaveAttribute('data-ch-tone', 'neutral')
    expect(segs[3]).toHaveClass('ch-fillable')
  })

  it('switches the value text with legendValue', () => {
    const { container, rerender } = render(
      <ShareBar label="s" segments={sources} legendValue="percent" />,
    )
    const first = () => container.querySelector('[data-ch-part="share-value"]')?.textContent
    expect(first()).toBe('46%')
    rerender(<ShareBar label="s" segments={sources} legendValue="value" />)
    expect(first()).toBe('2,711')
  })

  it('leaves the rest of a larger total as empty track', () => {
    const { container } = render(
      <ShareBar label="Pages" total={800} segments={[{ label: 'Reviewed', value: 62 }]} />,
    )
    expect(container.querySelector('[data-ch-part="share-segment"]')).toHaveStyle({
      flexBasis: '7.75%',
    })
    expect(screen.getByRole('listitem')).toHaveTextContent('62 · 8%')
  })

  it('without the list, names the bar as an image', () => {
    render(
      <ShareBar
        label="Devices"
        legend={false}
        segments={[
          { label: 'Mobile', value: 79 },
          { label: 'Desktop', value: 20 },
          { label: 'Tablet', value: 1 },
        ]}
      />,
    )
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Devices: Mobile 79% (79), Desktop 20% (20), Tablet 1% (1)',
    )
  })

  it('does not draw zero segments but lists them, and never renders NaN', () => {
    const { container } = render(
      <ShareBar
        label="z"
        segments={[
          { label: 'a', value: 0 },
          { label: 'b', value: 0 },
        ]}
      />,
    )
    expect(container.querySelectorAll('[data-ch-part="share-segment"]')).toHaveLength(0)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(container.innerHTML).not.toContain('NaN')
  })
})
