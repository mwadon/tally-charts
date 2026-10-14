import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Chart } from '../Chart'
import { RowDividers, RowLabels, type RowLabelsProps } from './RowLabels'

type Line = { name: string; note?: string; v: number }
const lines: Line[] = [
  { name: 'Labor', note: '7.5 h planned', v: 8 },
  { name: 'Materials and supplies', v: 4 },
]

function renderRows(props: Partial<RowLabelsProps<Line>> = {}, data: Line[] = lines) {
  return render(
    <Chart<Line>
      data={data}
      width={300}
      height={50 * data.length}
      margin={{ top: 0, right: 50, bottom: 0, left: 100 }}
      x={{ field: 'v', domain: [0, 10] }}
      y={{ type: 'band', field: 'name', padding: 0 }}
      animate={false}
    >
      <RowLabels<Line> text="name" {...props} />
      <RowDividers />
    </Chart>,
  )
}

const labels = (root: HTMLElement) => [...root.querySelectorAll('[data-ch-part="row-label"]')]

describe('<RowLabels>', () => {
  it('draws one label per row at the left outer edge, centred in the row', () => {
    const { container } = renderRows()
    const [first, second] = labels(container)
    expect(labels(container).map((t) => t.textContent)).toEqual(['Labor', 'Materials and supplies'])
    expect(first).toHaveAttribute('x', '-100')
    expect(first).toHaveAttribute('text-anchor', 'start')
    expect(first).toHaveAttribute('y', '25')
    expect(second).toHaveAttribute('y', '75')
  })

  it('adds a muted second line when subtext is set', () => {
    const { container } = renderRows({ subtext: 'note' })
    const sub = container.querySelector('[data-ch-part="row-sublabel"]')
    expect(sub).toHaveTextContent('7.5 h planned')
    expect(labels(container)[0]).toHaveAttribute('y', '16')
    expect(sub).toHaveAttribute('y', '34')
    // The second row has no note, so its label stays centred.
    expect(labels(container)[1]).toHaveAttribute('y', '75')
  })

  it('aligns a right column to the outer edge minus the inset', () => {
    const { container } = renderRows({ side: 'right', inset: 10 })
    // innerWidth = 300 - 100 - 50 = 150; outer right edge = 200.
    expect(labels(container)[0]).toHaveAttribute('x', '190')
    expect(labels(container)[0]).toHaveAttribute('text-anchor', 'end')
  })

  it('places text at the top of the row', () => {
    const { container } = renderRows({ position: 'above' })
    expect(labels(container)[1]).toHaveAttribute('y', '50')
    expect(labels(container)[1]).toHaveAttribute('dominant-baseline', 'hanging')
  })

  it('cuts long labels with an ellipsis', () => {
    const { container } = renderRows({ maxWidth: 70 })
    expect(labels(container)[1]).toHaveTextContent('Materials…')
    expect(labels(container)[0]).toHaveTextContent('Labor')
  })

  it('colors text by tone and marks muted columns', () => {
    const { container } = renderRows({ tone: (d) => (d.v > 5 ? 'loss' : undefined), muted: true })
    expect(labels(container)[0]).toHaveAttribute('data-ch-tone', 'loss')
    expect(labels(container)[0]).toHaveStyle({ fill: 'var(--ch-loss)' })
    expect(labels(container)[1]).not.toHaveAttribute('data-ch-tone')
    expect(labels(container)[0]).toHaveAttribute('data-ch-muted', 'true')
  })

  it('warns and draws nothing without a band scale on y', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = render(
      <Chart
        data={lines}
        width={300}
        x={{ type: 'band', field: 'name' }}
        y={{ field: 'v', domain: [0, 10] }}
      >
        <RowLabels<Line> text="name" />
      </Chart>,
    )
    expect(labels(container)).toHaveLength(0)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('RowLabels need a band scale'))
  })
})

describe('<RowDividers>', () => {
  it('draws a line between rows across the whole chart width', () => {
    const { container } = renderRows({}, [...lines, { name: 'Permit', v: 2 }])
    const dividers = [...container.querySelectorAll('[data-ch-part="row-divider"]')]
    expect(dividers).toHaveLength(2)
    expect(dividers[0]).toHaveAttribute('y1', '50')
    expect(dividers[1]).toHaveAttribute('y1', '100')
    expect(dividers[0]).toHaveAttribute('x1', '-100')
    expect(dividers[0]).toHaveAttribute('x2', '200')
  })
})
