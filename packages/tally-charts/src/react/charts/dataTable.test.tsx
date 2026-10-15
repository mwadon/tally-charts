import { render, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { BarChart } from './BarChart'
import { BridgeChart } from './BridgeChart'
import { ComparisonBars } from './ComparisonBars'
import { DotHistogram } from './DotHistogram'
import { LineChart } from './LineChart'
import { RankedBars } from './RankedBars'
import { StripPlot } from './StripPlot'
import { headerOf, withTableOptions } from './shared'
import { WaffleColumns } from './WaffleColumns'
import { WaterfallChart } from './WaterfallChart'

// Every chart's first column is renamed "Row", whatever its default header ("Name", "Item" or
// "Column"); the caption replaces the title.
const dataTable = { caption: 'Rows', columns: { Name: 'Row', Item: 'Row', Column: 'Row' } }
const common = { width: 400, title: 'Chart', animate: false, dataTable } as const
const row = { name: 'Labor', plan: 640, actual: 1060, v: 12 }
const step = { label: 'Labor', value: -1.6 }

const cases: [string, () => ReactElement][] = [
  ['BarChart', () => <BarChart {...common} data={[row]} x="name" y="v" />],
  [
    'ComparisonBars',
    () => <ComparisonBars {...common} data={[row]} label="name" plan="plan" actual="actual" />,
  ],
  ['RankedBars', () => <RankedBars {...common} data={[row]} label="name" value="v" />],
  [
    'WaterfallChart',
    () => <WaterfallChart {...common} start={{ label: 'Target', value: 38 }} steps={[step]} />,
  ],
  [
    'BridgeChart',
    () => <BridgeChart {...common} start={{ label: 'Planned', value: 1260 }} steps={[step]} />,
  ],
  ['DotHistogram', () => <DotHistogram {...common} data={[row]} value="v" />],
  [
    'StripPlot',
    () => (
      <StripPlot
        {...common}
        data={[row]}
        series={[{ id: 'est', label: 'Estimated', value: 'v' }]}
      />
    ),
  ],
  ['WaffleColumns', () => <WaffleColumns {...common} data={[row]} x="name" y="v" />],
  [
    'LineChart',
    () => (
      <LineChart
        {...common}
        data={[row]}
        x="name"
        series={[{ id: 'v', label: 'Value', value: 'v' }]}
      />
    ),
  ],
]

describe('dataTable options on a high-level chart', () => {
  it.each(cases)('%s takes a caption and renamed headers', (_, chart) => {
    render(chart())
    const table = screen.getByRole('table', { name: 'Rows' })
    expect(within(table).getAllByRole('columnheader')[0]).toHaveTextContent(/^Row$/)
  })
})

describe('renaming headers', () => {
  it('ignores prototype keys: a header named like one stays as it is', () => {
    const table = {
      columns: [
        { header: 'constructor', value: () => 'a' },
        { header: 'toString', value: () => 'b' },
        { header: 'Name', value: () => 'c' },
      ],
    }
    const out = withTableOptions(table, { columns: { Name: 'Row' } })
    expect(out?.columns.map((column) => column.header)).toEqual(['constructor', 'toString', 'Row'])
  })
})

describe('headerOf', () => {
  it('writes a field name in sentence case', () => {
    expect(headerOf('margin', 'Value')).toBe('Margin')
    expect(headerOf('grossMargin', 'Value')).toBe('Gross margin')
    expect(headerOf('gross_margin', 'Value')).toBe('Gross margin')
    expect(headerOf('job-id', 'Value')).toBe('Job id')
  })

  it('falls back for function accessors and blank names', () => {
    expect(headerOf((d: { v: number }) => d.v, 'Value')).toBe('Value')
    expect(headerOf('  ', 'Value')).toBe('Value')
  })
})
