import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RankedBars, type RankedBarsProps } from './RankedBars'

type Cause = { name: string; amount: number | null; jobs?: string }
const causes: Cause[] = [
  { name: 'Callbacks', amount: 14400 },
  { name: 'Labor overruns', amount: 31200 },
  { name: 'Material variance', amount: 18700 },
]

function renderRanked(props: Partial<RankedBarsProps<Cause>> = {}) {
  return render(
    <RankedBars<Cause>
      data={causes}
      label="name"
      value="amount"
      format="currency-compact"
      width={400}
      title="Leakage by cause"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, selector: string) => [...root.querySelectorAll(selector)]
const names = (root: HTMLElement) =>
  parts(root, '[data-ch-part="row-labels"][data-ch-side="left"] [data-ch-part="row-label"]').map(
    (t) => t.textContent,
  )
const values = (root: HTMLElement) =>
  parts(root, '[data-ch-part="row-labels"][data-ch-side="right"]')
    .at(-1)
    ?.querySelectorAll('[data-ch-part="row-label"]')

describe('<RankedBars>', () => {
  it('sorts rows by size, largest first', () => {
    const { container } = renderRanked()
    expect(names(container)).toEqual(['Labor overruns', 'Material variance', 'Callbacks'])
    expect([...(values(container) ?? [])].map((t) => t.textContent)).toEqual([
      '$31.2K',
      '$18.7K',
      '$14.4K',
    ])
  })

  it('keeps data order with sort none and sorts ascending with asc', () => {
    const { container, unmount } = renderRanked({ sort: 'none' })
    expect(names(container)).toEqual(['Callbacks', 'Labor overruns', 'Material variance'])
    unmount()
    const asc = renderRanked({ sort: 'asc' })
    expect(names(asc.container)).toEqual(['Callbacks', 'Material variance', 'Labor overruns'])
  })

  it('shows only the first rows with limit', () => {
    const { container } = renderRanked({ limit: 2 })
    expect(parts(container, '[data-ch-part="bar"]')).toHaveLength(2)
  })

  it('draws a faint track behind every bar', () => {
    const { container } = renderRanked()
    expect(parts(container, '[data-ch-part="bar-track"]')).toHaveLength(3)
  })

  it('keeps original indexes as ids after sorting', () => {
    const onSelect = vi.fn()
    const { container } = renderRanked({ onSelect })
    fireEvent.click(parts(container, '[data-ch-part="bar-hit"]')[0] as Element)
    // The first row shown is "Labor overruns", index 1 in the data.
    expect(onSelect).toHaveBeenCalledWith(1, expect.objectContaining({ id: 1 }))
  })

  it('highlights the selected row in the selected tone', () => {
    const { container } = renderRanked({ selectedId: 2 })
    expect(parts(container, '[data-ch-part="row-highlight"]')).toHaveLength(1)
    const tones = parts(container, '[data-ch-part="bar"]').map((b) =>
      b.getAttribute('data-ch-tone'),
    )
    expect(tones).toEqual(['neutral', 'loss', 'neutral'])
    expect(values(container)?.[1]).toHaveAttribute('data-ch-tone', 'loss')
    expect(values(container)?.[0]).not.toHaveAttribute('data-ch-tone')
  })

  it('draws magnitudes for negative values and keeps the sign in the text', () => {
    const { container } = renderRanked({
      data: [
        { name: 'Discount', amount: -260 },
        { name: 'Materials', amount: -100 },
      ],
      format: 'currency',
      tone: 'loss',
    })
    const [big, small] = parts(container, '[data-ch-part="bar"]')
    expect(Number(big?.getAttribute('width'))).toBeGreaterThan(Number(small?.getAttribute('width')))
    expect(big).toHaveAttribute('data-ch-direction', 'right')
    expect([...(values(container) ?? [])].map((t) => t.textContent)).toEqual(['−$260', '−$100'])
    expect(values(container)?.[0]).toHaveAttribute('data-ch-tone', 'loss')
  })

  it('stacks the label above a thin bar in the stacked layout', () => {
    const { container } = renderRanked({ layout: 'stacked' })
    const label = parts(container, '[data-ch-part="row-label"]')[0]
    expect(label).toHaveAttribute('dominant-baseline', 'hanging')
    expect(label).toHaveAttribute('y', '0')
    const bar = parts(container, '[data-ch-part="bar"]')[0]
    expect(bar).toHaveAttribute('height', '6')
    // 52px row: text starts 14px below the row top, the bar ends 10px above the row bottom,
    // so each label sits with its own bar and far from the bar of the row above.
    expect(label?.closest('[data-ch-part="row-text"]')).toHaveAttribute(
      'transform',
      'translate(0 14)',
    )
    expect(bar).toHaveAttribute('y', '36')
  })

  it('keeps each stacked label closer to its own bar than to the bar above', () => {
    const { container } = renderRanked({ layout: 'stacked' })
    const shift = Number(
      container
        .querySelector('[data-ch-part="row-text"]')
        ?.getAttribute('transform')
        ?.match(/translate\(0 ([\d.]+)\)/)?.[1],
    )
    const [, label] = parts(
      container,
      '[data-ch-part="row-labels"][data-ch-side="left"] [data-ch-part="row-label"]',
    )
    const [above, own] = parts(container, '[data-ch-part="bar"]')
    const labelTop = Number(label?.getAttribute('y')) + shift
    // 15px label text, hanging from its y.
    const labelBottom = labelTop + 15
    const aboveBottom = Number(above?.getAttribute('y')) + Number(above?.getAttribute('height'))
    const ownTop = Number(own?.getAttribute('y'))
    // At most half the gap to the bar above, so each row reads as one unit (was 15 vs 16 px).
    expect(ownTop - labelBottom).toBeLessThan((labelTop - aboveBottom) / 2)
    expect(ownTop - labelBottom).toBeGreaterThan(0)
  })

  it('cuts a stacked label so it never runs into the value', () => {
    const name = 'Material variance and more'
    const narrow = renderRanked({ layout: 'stacked', width: 160, data: [{ name, amount: 5 }] })
    expect(names(narrow.container)[0]).toMatch(/…$/)
    narrow.unmount()
    const wide = renderRanked({ layout: 'stacked', width: 400, data: [{ name, amount: 5 }] })
    expect(names(wide.container)[0]).toBe(name)
  })

  it('leaves room for the meta column when cutting a stacked label', () => {
    const name = 'Ryan Mitchell Jr'
    const data = [{ name, amount: 5, jobs: '6 jobs' }]
    const { container } = renderRanked({ layout: 'stacked', width: 240, meta: 'jobs', data })
    expect(names(container)[0]).toMatch(/…$/)
  })

  it('shows muted meta text before the value', () => {
    const { container } = renderRanked({
      data: causes.map((c, i) => ({ ...c, jobs: `${i + 3} jobs` })),
      meta: 'jobs',
    })
    const muted = parts(container, '[data-ch-part="row-label"][data-ch-muted="true"]')
    expect(muted.map((t) => t.textContent)).toEqual(['4 jobs', '5 jobs', '3 jobs'])
  })

  it('keeps the full label for screen readers when it is cut', () => {
    const name = 'A very long cause name that will not fit'
    const { container } = renderRanked({ data: [{ name, amount: 5 }], labelWidth: 100 })
    expect(names(container)[0]).toMatch(/…$/)
    fireEvent.keyDown(screen.getByRole('figure'), { key: 'ArrowDown' })
    expect(container.querySelector('[aria-live]')?.textContent).toContain(name)
    expect(within(screen.getByRole('table')).getByText(name)).toBeInTheDocument()
  })

  it('shows the full label of a cut row in a tooltip on hover', () => {
    const name = 'A very long cause name that will not fit'
    const { container } = renderRanked({ data: [{ name, amount: 5 }], labelWidth: 100 })
    expect(names(container)[0]).toMatch(/…$/)
    fireEvent.pointerEnter(parts(container, '[data-ch-part="bar-hit"]')[0] as Element)
    expect(container.querySelector('[data-ch-part="tooltip"]')).toHaveTextContent(name)
  })

  it('skips the bar but keeps the label for a missing value', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderRanked({ data: [...causes, { name: 'Unbilled', amount: null }] })
    expect(names(container)).toEqual([
      'Labor overruns',
      'Material variance',
      'Callbacks',
      'Unbilled',
    ])
    expect(parts(container, '[data-ch-part="bar"]')).toHaveLength(3)
    expect(container.textContent).not.toContain('NaN')
  })

  it('renders a hidden data table in display order', () => {
    renderRanked()
    const table = screen.getByRole('table', { name: 'Leakage by cause' })
    const first = within(table).getAllByRole('row')[1] as HTMLElement
    expect(within(first).getByRole('rowheader')).toHaveTextContent('Labor overruns')
    expect(within(first).getByRole('cell')).toHaveTextContent('$31.2K')
  })

  it('reports the user datum to onSelect', () => {
    const onSelect = vi.fn()
    const { container } = renderRanked({ onSelect })
    fireEvent.click(parts(container, '[data-ch-part="bar-hit"]')[0] as Element)
    expect(onSelect.mock.calls[0]?.[1].datum).toBe(causes[1])
  })
})
