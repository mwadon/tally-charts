import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StripPlot, type StripPlotProps, type StripSeries } from './StripPlot'

type Install = { job: string; est: number | null; act: number | null }
const installs: Install[] = [
  { job: 'A', est: 6, act: 8 },
  { job: 'B', est: 6.125, act: 9 },
  { job: 'C', est: 6.25, act: 8.2 },
]
const series: StripSeries<Install>[] = [
  { id: 'est', label: 'Estimated', value: 'est', tone: 'accent-soft' },
  { id: 'act', label: 'Actual', value: 'act', tone: 'loss' },
]

// 496px wide, 96px labels, 16px right: 384px for 4–12 h (48px per hour).
// 2 rows × 72px + 8px top + 28px axis = 180px; rows are 72px bands.
function renderStrip(props: Partial<StripPlotProps<Install>> = {}) {
  return render(
    <StripPlot<Install>
      data={installs}
      series={series}
      label="job"
      format="hours"
      domain={[4, 12]}
      width={496}
      radius={4}
      title="Dallas installs"
      animate={false}
      {...props}
    />,
  )
}

const parts = (root: HTMLElement, selector: string) => [...root.querySelectorAll(selector)]
const dots = (root: HTMLElement) => parts(root, '[data-ch-part="dot"]')

describe('<StripPlot>', () => {
  it('draws one dot per item per series in its row', () => {
    const { container } = renderStrip()
    expect(dots(container)).toHaveLength(6)
    const est = dots(container).filter((d) => d.getAttribute('data-ch-tone') === 'accent-soft')
    expect(est.map((d) => d.getAttribute('cx'))).toEqual(['96', '102', '108'])
    expect(est[0]).toHaveAttribute('cy', '62')
    const act = dots(container).filter((d) => d.getAttribute('data-ch-tone') === 'loss')
    expect(act[0]).toHaveAttribute('cy', '134')
  })

  it('lifts dots that would overlap', () => {
    const { container } = renderStrip()
    const est = dots(container).filter((d) => d.getAttribute('data-ch-tone') === 'accent-soft')
    expect(est[1]).toHaveAttribute('cy', '53')
    expect(est[2]).toHaveAttribute('cy', '62')
  })

  it('marks each row median with a labelled dashed line', () => {
    const { container } = renderStrip()
    const lines = parts(container, '[data-ch-part="median"]')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toHaveAttribute('x1', '102')
    const labels = parts(container, '[data-ch-part="median-label"]')
    expect(labels.map((t) => t.textContent)).toEqual(['6.1 h', '8.2 h'])
    expect(labels[1]).toHaveAttribute('data-ch-tone', 'loss')
  })

  it('labels the rows on the left', () => {
    const { container } = renderStrip()
    expect(parts(container, '[data-ch-part="row-label"]').map((t) => t.textContent)).toEqual([
      'Estimated',
      'Actual',
    ])
  })

  it('moves along a row and between rows', () => {
    const { container } = renderStrip()
    const figure = screen.getByRole('figure', { name: 'Dallas installs' })
    const live = () => container.querySelector('[aria-live]')?.textContent
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(live()).toBe('Estimated, A, 6 h')
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(live()).toBe('Estimated, B, 6.1 h')
    fireEvent.keyDown(figure, { key: 'ArrowDown' })
    expect(live()).toBe('Actual, A, 8 h')
  })

  it('reports the user datum on hover', () => {
    const onActiveChange = vi.fn()
    const { container } = renderStrip({ onActiveChange })
    const layer = container.querySelector('[data-ch-part="pointer-layer"]') as Element
    fireEvent.pointerMove(layer, { clientX: 96, clientY: 62 })
    expect(onActiveChange).toHaveBeenLastCalledWith(
      'est:0',
      expect.objectContaining({ datum: installs[0] }),
    )
  })

  it('skips missing values per series', () => {
    const { container } = renderStrip({
      data: [...installs, { job: 'D', est: null, act: '' as unknown as number }],
    })
    expect(dots(container)).toHaveLength(6)
    expect(container.textContent).not.toContain('NaN')
  })

  it('renders a hidden data table with one column per series', () => {
    renderStrip()
    const table = screen.getByRole('table', { name: 'Dallas installs' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['job', 'Estimated', 'Actual'])
    expect(within(table).getByText('8.2 h')).toBeInTheDocument()
  })

  it('leaves the medians out on request', () => {
    const { container } = renderStrip({ median: false })
    expect(parts(container, '[data-ch-part="median"]')).toHaveLength(0)
  })

  it('keeps geometry finite at zero width', () => {
    const { container } = renderStrip({ width: 0 })
    for (const el of parts(container, 'circle, rect, line')) {
      for (const name of ['cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'x1', 'x2', 'y1', 'y2']) {
        const value = el.getAttribute(name)
        if (value !== null) expect(Number.isFinite(Number(value))).toBe(true)
      }
    }
  })
})
