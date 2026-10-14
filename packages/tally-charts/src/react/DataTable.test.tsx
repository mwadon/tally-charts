import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataTable } from './DataTable'

const rows = [
  { week: 'W1', margin: 30 },
  { week: 'W2', margin: 34 },
]

describe('<DataTable>', () => {
  it('renders a captioned, visually hidden table with one row per datum', () => {
    render(
      <DataTable
        data={rows}
        caption="Margin by week"
        columns={[
          { header: 'Week', value: (d) => d.week },
          { header: 'Margin', value: (d) => `${d.margin}%` },
        ]}
      />,
    )
    const table = screen.getByRole('table', { name: 'Margin by week' })
    // A table ignores the 1px box of .ch-sr-only and keeps its full height, which stretched the
    // page below the chart. A block wrapper does the hiding instead.
    expect(table).not.toHaveClass('ch-sr-only')
    expect(table.parentElement?.tagName).toBe('DIV')
    expect(table.parentElement).toHaveClass('ch-sr-only')
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Week', 'Margin'])
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getByText('34%')).toBeInTheDocument()
  })
})
