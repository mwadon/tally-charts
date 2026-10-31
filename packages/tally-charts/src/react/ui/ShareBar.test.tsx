import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShareBar } from './ShareBar'

const sources = [
  { label: 'Internal links', value: 2711, tone: 'gain' as const },
  { label: 'Search', value: 1968, tone: 'accent' as const },
  { label: 'Direct', value: 1101, tone: 'warn' as const },
  { label: 'Social', value: 43, tone: 'neutral' as const, fill: 'hatch' as const },
]

afterEach(() => vi.restoreAllMocks())

const NOT_FINITE = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN]

describe('<ShareBar>', () => {
  it('lists every part with value and percent, and hides the bar from screen readers', () => {
    const { container } = render(<ShareBar label="Where visitors come from" segments={sources} />)
    const group = screen.getByRole('group', { name: 'Where visitors come from' })
    const rows = within(group).getAllByRole('listitem')
    expect(rows.map((r) => r.textContent)).toEqual([
      'Internal links 2,711 · 46%',
      'Search 1,968 · 34%',
      'Direct 1,101 · 19%',
      'Social 43 · 1%',
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

  it('reads each row with spaces once the decorative dot is removed', () => {
    render(<ShareBar label="s" segments={sources} />)
    const row = screen.getAllByRole('listitem')[0] as HTMLElement
    const clone = row.cloneNode(true) as HTMLElement
    for (const n of clone.querySelectorAll('[aria-hidden]')) n.remove()
    const text = (clone.textContent ?? '').replace(/\s+/g, ' ')
    expect(text.trim()).toBe('Internal links 2,711 46%')
    expect(row.querySelector('[data-ch-part="share-value"]')?.textContent).toBe('2,711 · 46%')
  })

  it('names a legend-less bar with no segments just by its label', () => {
    render(<ShareBar label="Sources" segments={[]} legend={false} />)
    expect(screen.getByRole('img')).toHaveAccessibleName('Sources')
  })

  it.each(NOT_FINITE)('shows No data for %s, with no segments and one warning', (v) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <ShareBar label={`List ${v}`} segments={[{ label: 'a', value: v }]} />,
    )
    expect(container.querySelectorAll('[data-ch-part="share-segment"]')).toHaveLength(0)
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.getByRole('group')).toHaveAccessibleName(`List ${v}`)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain('not finite')
  })

  it.each(NOT_FINITE)('names a legend-less bar "label: No data" for %s', (v) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<ShareBar label={`Bare ${v}`} legend={false} segments={[{ label: 'bare', value: v }]} />)
    expect(screen.getByRole('img')).toHaveAccessibleName(`Bare ${v}: No data`)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('keeps drawing the valid segments next to a non-finite one', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <ShareBar
        label="Mixed"
        segments={[
          { label: 'ok', value: 5 },
          { label: 'bad', value: Number.POSITIVE_INFINITY },
        ]}
      />,
    )
    expect(container.querySelectorAll('[data-ch-part="share-segment"]')).toHaveLength(1)
    expect(screen.queryByText('No data')).toBeNull()
  })

  it('paints a segment and its swatch with `color`, in solid and hatch, and keeps the tone', () => {
    const { container } = render(
      <ShareBar
        label="Sources"
        segments={[
          { label: 'Search', value: 3, tone: 'accent', color: 'var(--brand)' },
          { label: 'Ads', value: 2, tone: 'warn', fill: 'hatch', color: '#fc0' },
          { label: 'Direct', value: 1, tone: 'neutral' },
        ]}
      />,
    )
    const segs = container.querySelectorAll<HTMLElement>('[data-ch-part="share-segment"]')
    const swatches = container.querySelectorAll<HTMLElement>('[data-ch-part="share-swatch"]')
    for (const [i, color] of [
      [0, 'var(--brand)'],
      [1, '#fc0'],
    ] as const) {
      expect(segs[i]?.style.getPropertyValue('--_ch-swatch-color')).toBe(color)
      expect(swatches[i]?.style.getPropertyValue('--_ch-swatch-color')).toBe(color)
      expect(segs[i]).toHaveAttribute('data-ch-colored', 'true')
    }
    expect(segs[0]).toHaveAttribute('data-ch-tone', 'accent')
    expect(segs[1]).toHaveAttribute('data-ch-fill', 'hatch')
    expect(segs[2]?.style.getPropertyValue('--_ch-swatch-color')).toBe('var(--ch-neutral)')
    expect(segs[2]).not.toHaveAttribute('data-ch-colored')
  })
})
