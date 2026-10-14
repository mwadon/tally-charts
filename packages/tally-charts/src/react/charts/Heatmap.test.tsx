import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Heatmap, type HeatmapProps } from './Heatmap'

type Leak = { branch: string; cause: string; amount: number | string | boolean | null }
const leaks: Leak[] = [
  { branch: 'Dallas', cause: 'Labor', amount: 14800 },
  { branch: 'Dallas', cause: 'Materials', amount: 7900 },
  { branch: 'Dallas', cause: 'Callbacks', amount: 3100 },
  { branch: 'Austin', cause: 'Labor', amount: 9200 },
  { branch: 'Austin', cause: 'Materials', amount: 5100 },
  { branch: 'Austin', cause: 'Callbacks', amount: 1900 },
]

// Breaks 4K, 7K, 13K: four bins on levels 1, 2, 4 and 5.
function renderHeatmap(props: Partial<HeatmapProps<Leak>> = {}) {
  return render(
    <Heatmap<Leak>
      data={leaks}
      row="branch"
      column="cause"
      value="amount"
      breaks={[4000, 7000, 13000]}
      format="currency-compact"
      title="Where it leaks"
      {...props}
    />,
  )
}

const cells = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-ch-part="heatmap-cell"]')] as HTMLElement[]
const texts = (els: Element[]) => els.map((el) => el.textContent)
const levels = (els: Element[]) => els.map((el) => el.getAttribute('data-ch-level'))

describe('<Heatmap>', () => {
  it('lays out a grid with headers, totals and one tab stop', () => {
    const { container } = renderHeatmap()
    const grid = screen.getByRole('grid', { name: 'Where it leaks' })
    expect(texts(within(grid).getAllByRole('columnheader'))).toEqual([
      '',
      'Labor$24K',
      'Materials$13K',
      'Callbacks$5K',
      'Total',
    ])
    expect(texts(within(grid).getAllByRole('rowheader'))).toEqual(['Dallas', 'Austin'])
    const dallas = within(grid).getAllByRole('row')[1] as HTMLElement
    expect(texts(within(dallas).getAllByRole('gridcell'))).toEqual([
      '$14.8K',
      '$7.9K',
      '$3.1K',
      '$25.8K',
    ])
    const stops = container.querySelectorAll('[tabindex="0"]')
    expect(stops).toHaveLength(1)
    expect(stops[0]).toHaveTextContent('$14.8K')
  })

  it('bins values onto the sequential levels', () => {
    const { container } = renderHeatmap()
    expect(levels(cells(container))).toEqual(['5', '4', '1', '4', '2', '1'])
  })

  it('renders the bin legend with default labels', () => {
    const { container } = renderHeatmap()
    const legend = container.querySelector('[data-ch-part="legend"]') as HTMLElement
    expect(texts(within(legend).getAllByRole('listitem'))).toEqual([
      'Under $4K',
      '$4K to $7K',
      '$7K to $13K',
      '$13K and up',
    ])
    expect(levels([...legend.querySelectorAll('.ch-swatch')])).toEqual(['1', '2', '4', '5'])
  })

  it('takes custom bin labels and spreads fewer bins over the levels', () => {
    const { container } = renderHeatmap({ breaks: [7000], binLabels: ['Small', 'Large'] })
    const legend = container.querySelector('[data-ch-part="legend"]') as HTMLElement
    expect(texts(within(legend).getAllByRole('listitem'))).toEqual(['Small', 'Large'])
    expect(levels([...legend.querySelectorAll('.ch-swatch')])).toEqual(['1', '5'])
    expect(levels(cells(container))).toEqual(['5', '5', '1', '5', '1', '1'])
  })

  it('shows a dash for a missing cell', () => {
    const { container } = renderHeatmap({
      data: leaks.filter((l) => !(l.branch === 'Austin' && l.cause === 'Callbacks')),
    })
    const missing = cells(container)[5] as HTMLElement
    expect(missing).toHaveAttribute('data-ch-level', '0')
    expect(missing).toHaveTextContent('–No data')
    expect(within(missing).getByText('No data')).toHaveClass('ch-sr-only')
    // The totals leave it out.
    const austin = screen.getAllByRole('row')[2] as HTMLElement
    expect(within(austin).getAllByRole('gridcell').at(-1)).toHaveTextContent('$14.3K')
    expect(screen.getAllByRole('columnheader')[3]).toHaveTextContent('Callbacks$3.1K')
  })

  it('skips non-numeric values without throwing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const odd = leaks.map((l, i) =>
      i === 1 ? { ...l, amount: 'n/a' } : i === 4 ? { ...l, amount: true } : l,
    )
    const { container } = renderHeatmap({ data: odd })
    expect(levels(cells(container))).toEqual(['5', '0', '1', '4', '0', '1'])
    expect(container.textContent).not.toContain('NaN')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('Heatmap shows a dash')
  })

  it('moves between cells with the arrow keys and selects with Enter', () => {
    const onSelect = vi.fn()
    const onActiveChange = vi.fn()
    const { container } = renderHeatmap({ onSelect, onActiveChange })
    const all = cells(container)
    act(() => all[0]?.focus())
    expect(onActiveChange).toHaveBeenLastCalledWith(
      'Dallas:Labor',
      expect.objectContaining({
        row: 'Dallas',
        column: 'Labor',
        value: 14800,
        level: 5,
        datum: leaks[0],
      }),
    )
    fireEvent.keyDown(all[0] as HTMLElement, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(all[1])
    expect(all[1]).toHaveAttribute('tabindex', '0')
    expect(all[0]).toHaveAttribute('tabindex', '-1')
    fireEvent.keyDown(all[1] as HTMLElement, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(all[4])
    // At the bottom edge the focus stays, and the key is handled so the page doesn't scroll.
    expect(fireEvent.keyDown(all[4] as HTMLElement, { key: 'ArrowDown' })).toBe(false)
    expect(document.activeElement).toBe(all[4])
    fireEvent.keyDown(all[4] as HTMLElement, { key: 'Home' })
    expect(document.activeElement).toBe(all[3])
    fireEvent.keyDown(all[3] as HTMLElement, { key: 'End' })
    expect(document.activeElement).toBe(all[5])
    fireEvent.keyDown(all[5] as HTMLElement, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(
      'Austin:Callbacks',
      expect.objectContaining({ value: 1900 }),
    )
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(1)
    fireEvent.keyDown(all[5] as HTMLElement, { key: 'Escape' })
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
  })

  it('activates a cell on hover and clears when the pointer leaves', () => {
    const onActiveChange = vi.fn()
    const { container } = renderHeatmap({ onActiveChange })
    fireEvent.pointerEnter(cells(container)[1] as HTMLElement)
    expect(cells(container)[1]).toHaveAttribute('data-ch-active', 'true')
    fireEvent.pointerLeave(screen.getByRole('grid'))
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
    expect(container.querySelector('[data-ch-active]')).toBeNull()
  })

  it('follows a controlled activeId', () => {
    const { container } = renderHeatmap({ activeId: 'Austin:Labor' })
    expect(cells(container)[3]).toHaveAttribute('data-ch-active', 'true')
    expect(container.querySelectorAll('[data-ch-active]')).toHaveLength(1)
  })

  it('orders rows and columns as given and fills the gaps', () => {
    const { container } = renderHeatmap({
      rows: ['Austin', 'Dallas', 'Houston'],
      columns: ['Callbacks', 'Labor'],
    })
    expect(texts(screen.getAllByRole('rowheader'))).toEqual(['Austin', 'Dallas', 'Houston'])
    expect(texts(screen.getAllByRole('columnheader'))).toEqual([
      '',
      'Callbacks$5K',
      'Labor$24K',
      'Total',
    ])
    const houston = screen.getAllByRole('row')[3] as HTMLElement
    expect(texts(within(houston).getAllByRole('gridcell'))).toEqual([
      '–No data',
      '–No data',
      '–No data',
    ])
    expect(levels(cells(container)).slice(4)).toEqual(['0', '0'])
  })

  it('turns the totals and the legend off', () => {
    const { container } = renderHeatmap({ totals: false, legend: false })
    expect(texts(screen.getAllByRole('columnheader'))).toEqual([
      '',
      'Labor',
      'Materials',
      'Callbacks',
    ])
    expect(container.querySelector('[data-ch-part="legend"]')).toBeNull()
  })

  it('sorts unsorted breaks with one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderHeatmap({ breaks: [13000, 4000, 7000, 4000] })
    expect(levels(cells(container))).toEqual(['5', '4', '1', '4', '2', '1'])
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('sorted')
  })

  it('recolors the levels with tone', () => {
    const { container } = renderHeatmap({ tone: 'accent' })
    const root = container.querySelector('[data-ch-part="heatmap"]') as HTMLElement
    expect(root.style.getPropertyValue('--ch-seq-base')).toBe('var(--ch-accent)')
  })

  it('shows an empty state without data', () => {
    renderHeatmap({ data: [] })
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(screen.queryByRole('grid')).toBeNull()
  })

  it('selects with Space and Enter and prevents the default of both', () => {
    const onSelect = vi.fn()
    const { container } = renderHeatmap({ onSelect })
    const first = cells(container)[0] as HTMLElement
    expect(fireEvent.keyDown(first, { key: ' ' })).toBe(false)
    expect(onSelect).toHaveBeenLastCalledWith(
      'Dallas:Labor',
      expect.objectContaining({ value: 14800 }),
    )
    expect(fireEvent.keyDown(first, { key: 'Enter' })).toBe(false)
    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  it('selects on click', () => {
    const onSelect = vi.fn()
    const { container } = renderHeatmap({ onSelect })
    fireEvent.click(cells(container)[2] as HTMLElement)
    expect(onSelect).toHaveBeenCalledWith(
      'Dallas:Callbacks',
      expect.objectContaining({ value: 3100 }),
    )
  })

  it('clamps ArrowUp and ArrowLeft at the top-left edge', () => {
    const { container } = renderHeatmap()
    const all = cells(container)
    act(() => all[0]?.focus())
    expect(fireEvent.keyDown(all[0] as HTMLElement, { key: 'ArrowUp' })).toBe(false)
    expect(fireEvent.keyDown(all[0] as HTMLElement, { key: 'ArrowLeft' })).toBe(false)
    expect(document.activeElement).toBe(all[0])
  })

  it('handles Escape only when a cell is active', () => {
    const { container } = renderHeatmap()
    const first = cells(container)[0] as HTMLElement
    expect(fireEvent.keyDown(first, { key: 'Escape' })).toBe(true)
    act(() => first.focus())
    expect(fireEvent.keyDown(first, { key: 'Escape' })).toBe(false)
    expect(container.querySelector('[data-ch-active]')).toBeNull()
    expect(fireEvent.keyDown(first, { key: 'Escape' })).toBe(true)
  })

  it('caps breaks at four with one warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderHeatmap({ breaks: [1000, 2000, 4000, 7000, 13000] })
    const legend = container.querySelector('[data-ch-part="legend"]') as HTMLElement
    expect(within(legend).getAllByRole('listitem')).toHaveLength(5)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('at most 5 bins')
    warn.mockRestore()
  })

  it('uses level 3 and a single label without breaks', () => {
    const { container } = renderHeatmap({ breaks: [] })
    expect(levels(cells(container))).toEqual(['3', '3', '3', '3', '3', '3'])
    const legend = container.querySelector('[data-ch-part="legend"]') as HTMLElement
    expect(texts(within(legend).getAllByRole('listitem'))).toEqual(['All values'])
    expect(levels([...legend.querySelectorAll('.ch-swatch')])).toEqual(['3'])
  })

  it('falls back to default labels when binLabels has the wrong length', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderHeatmap({ binLabels: ['Only one'] })
    const legend = container.querySelector('[data-ch-part="legend"]') as HTMLElement
    expect(texts(within(legend).getAllByRole('listitem'))[0]).toBe('Under $4K')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('binLabels')
    warn.mockRestore()
  })

  it('clears the active cell when focus leaves the grid', () => {
    const onActiveChange = vi.fn()
    const { container } = renderHeatmap({ onActiveChange })
    const first = cells(container)[0] as HTMLElement
    act(() => first.focus())
    expect(first).toHaveAttribute('data-ch-active', 'true')
    act(() => first.blur())
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
    expect(container.querySelector('[data-ch-active]')).toBeNull()
  })

  it('keeps one tab stop on the first cell when the focused cell disappears', () => {
    const { container, rerender } = renderHeatmap()
    act(() => cells(container)[4]?.focus())
    expect(cells(container)[4]).toHaveAttribute('tabindex', '0')
    rerender(
      <Heatmap<Leak>
        data={leaks}
        row="branch"
        column="cause"
        value="amount"
        breaks={[4000, 7000, 13000]}
        rows={['Dallas']}
        title="Where it leaks"
      />,
    )
    const stops = container.querySelectorAll('[tabindex="0"]')
    expect(stops).toHaveLength(1)
    expect(stops[0]).toBe(cells(container)[0])
  })

  it('reports hover and focus in controlled mode but renders only the prop', () => {
    const onActiveChange = vi.fn()
    const { container } = renderHeatmap({ activeId: 'Austin:Labor', onActiveChange })
    fireEvent.pointerEnter(cells(container)[1] as HTMLElement)
    expect(onActiveChange).toHaveBeenLastCalledWith('Dallas:Materials', expect.anything())
    act(() => cells(container)[2]?.focus())
    expect(onActiveChange).toHaveBeenLastCalledWith('Dallas:Callbacks', expect.anything())
    expect(container.querySelectorAll('[data-ch-active]')).toHaveLength(1)
    expect(cells(container)[3]).toHaveAttribute('data-ch-active', 'true')
  })

  it('does not go stale when a controlled parent ignores a change', async () => {
    const onActiveChange = vi.fn()
    const { container } = renderHeatmap({ activeId: 'Dallas:Labor', onActiveChange })
    const second = cells(container)[1] as HTMLElement
    fireEvent.pointerEnter(second)
    fireEvent.pointerEnter(second)
    expect(onActiveChange).toHaveBeenCalledTimes(1)
    await Promise.resolve()
    // The parent still says Dallas:Labor, so the same move is reported again...
    fireEvent.pointerEnter(second)
    expect(onActiveChange).toHaveBeenCalledTimes(2)
    await Promise.resolve()
    // ...and moving to the id the parent already holds is not a change.
    fireEvent.pointerEnter(cells(container)[0] as HTMLElement)
    expect(onActiveChange).toHaveBeenCalledTimes(2)
  })
})
