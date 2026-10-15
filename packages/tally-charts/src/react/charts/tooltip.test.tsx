import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import type { ChartPoint } from '../types'
import { BarChart } from './BarChart'
import { BridgeChart } from './BridgeChart'
import { ComparisonBars } from './ComparisonBars'
import { DotHistogram } from './DotHistogram'
import { LineChart } from './LineChart'
import { RankedBars } from './RankedBars'
import { StripPlot } from './StripPlot'
import { WaffleColumns } from './WaffleColumns'
import { WaterfallChart } from './WaterfallChart'

/** Custom tooltip content showing the datum it was given. */
const show = (point: ChartPoint<unknown>) => (
  <span data-testid="custom">{JSON.stringify(point.datum)}</span>
)
const common = { width: 400, title: 'Chart', animate: false, tooltip: show } as const

const row = { name: 'Labor', plan: 640, actual: 1060, v: 12 }
const step = { label: 'Labor', value: -1.6 }

const cases: [string, () => ReactElement, unknown][] = [
  ['BarChart', () => <BarChart {...common} data={[row]} x="name" y="v" activeId={0} />, row],
  [
    'ComparisonBars',
    () => (
      <ComparisonBars
        {...common}
        data={[row]}
        label="name"
        plan="plan"
        actual="actual"
        activeId={0}
      />
    ),
    row,
  ],
  [
    'RankedBars',
    () => <RankedBars {...common} data={[row]} label="name" value="v" activeId={0} />,
    row,
  ],
  [
    'WaterfallChart',
    () => (
      <WaterfallChart
        {...common}
        start={{ label: 'Target', value: 38 }}
        steps={[step]}
        activeId={0}
      />
    ),
    step,
  ],
  [
    'WaterfallChart end',
    () => (
      <WaterfallChart
        {...common}
        start={{ label: 'Target', value: 38 }}
        steps={[step]}
        activeId="end"
      />
    ),
    { label: 'Total', value: 36.4 },
  ],
  [
    'BridgeChart',
    () => (
      <BridgeChart
        {...common}
        start={{ label: 'Planned', value: 1260 }}
        steps={[step]}
        activeId={0}
      />
    ),
    step,
  ],
  ['DotHistogram', () => <DotHistogram {...common} data={[row]} value="v" activeId={0} />, row],
  [
    'StripPlot',
    () => (
      <StripPlot
        {...common}
        data={[row]}
        series={[{ id: 'est', label: 'Estimated', value: 'v' }]}
        activeId="est:0"
      />
    ),
    row,
  ],
  [
    'WaffleColumns',
    () => <WaffleColumns {...common} data={[row]} x="name" y="v" activeId={0} />,
    row,
  ],
  [
    'LineChart',
    () => (
      <LineChart
        {...common}
        data={[row]}
        x="name"
        series={[{ id: 'v', label: 'Value', value: 'v' }]}
        activeId="Labor"
      />
    ),
    row,
  ],
]

describe('a tooltip function on a high-level chart', () => {
  it.each(cases)('%s renders it with the original datum', (_, chart, datum) => {
    const { container, getByTestId } = render(chart())
    expect(getByTestId('custom')).toHaveTextContent(JSON.stringify(datum))
    expect(container.querySelector('[data-ch-part="tooltip"]')).toContainElement(
      getByTestId('custom'),
    )
    expect(container.querySelector('[data-ch-part="tooltip-pill"]')).toBeNull()
  })
})
