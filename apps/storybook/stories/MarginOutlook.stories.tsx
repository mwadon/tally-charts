import type { Meta, StoryObj } from '@storybook/react-vite'
import { Legend, LineChart } from 'tally-charts'

// docs/reference/07-forecast.png, card "Margin outlook", on a time axis: one point per month,
// April to December 2026 (UTC).
type Month = {
  month: string
  actual: number | null
  path: number | null
  changes: number | null
  low: number | null
  high: number | null
}

// The forecasts and the band start at September's actual, so the lines join there.
const months: Month[] = [
  { month: '2026-04-01', actual: 32.9, path: null, changes: null, low: null, high: null },
  { month: '2026-05-01', actual: 34.2, path: null, changes: null, low: null, high: null },
  { month: '2026-06-01', actual: 34.9, path: null, changes: null, low: null, high: null },
  { month: '2026-07-01', actual: 34.5, path: null, changes: null, low: null, high: null },
  { month: '2026-08-01', actual: 34.1, path: null, changes: null, low: null, high: null },
  { month: '2026-09-01', actual: 33.6, path: 33.6, changes: 33.6, low: 33.6, high: 33.6 },
  { month: '2026-10-01', actual: null, path: 35.2, changes: 36.7, low: 34.1, high: 36.3 },
  { month: '2026-11-01', actual: null, path: 35.6, changes: 37.2, low: 34.2, high: 37.0 },
  { month: '2026-12-01', actual: null, path: 36.0, changes: 37.6, low: 34.3, high: 37.6 },
]

function MarginOutlook() {
  return (
    <article className="card card-wide">
      <header className="card-header-row">
        <div>
          <h2 className="card-title">Margin outlook</h2>
          <span className="card-meta">Actual through September, forecast to December</span>
        </div>
        <Legend
          shape="line"
          items={[
            { label: 'Actual', tone: 'accent', marker: 'dot' },
            { label: 'Current path', tone: 'accent', dashed: true, marker: 'ring' },
            { label: 'With your changes', tone: 'gain', dashed: true, marker: 'dot' },
            { label: 'Likely range', tone: 'accent', shape: 'band' },
          ]}
        />
      </header>
      <LineChart
        title="Margin outlook"
        description="Margin reaches 36.0% by December on the current path and 37.6% with your changes, still under the 38% target."
        data={months}
        // Half a month of room before April and after December, like the reference.
        x={{ type: 'time', field: 'month', domain: ['2026-03-17', '2026-12-16'] }}
        xAxis={9}
        xAxisFormat={{ month: 'short' }}
        series={[
          { id: 'actual', label: 'Actual', value: 'actual' },
          {
            id: 'path',
            label: 'Current path',
            value: 'path',
            style: 'forecast',
            tooltipLabel: 'on the current path',
          },
          {
            id: 'changes',
            label: 'With your changes',
            value: 'changes',
            style: 'scenario',
            tooltipLabel: 'with changes',
          },
        ]}
        band={{ low: 'low', high: 'high', label: 'Likely range' }}
        forecastFrom="2026-10-01"
        target={{ value: 38, label: 'Target 38%' }}
        domain={[30, 40]}
        format="percent"
        yAxisFormat={(v) => `${v}%`}
        height={360}
      />
    </article>
  )
}

const meta = {
  title: 'Reference/Margin outlook',
  component: MarginOutlook,
} satisfies Meta<typeof MarginOutlook>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = { parameters: { theme: 'light' } }
export const Dark: Story = { parameters: { theme: 'dark' } }
