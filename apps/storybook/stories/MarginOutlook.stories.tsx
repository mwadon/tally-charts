import type { Meta, StoryObj } from '@storybook/react-vite'
import { Legend, LineChart } from 'tally-charts'

// docs/reference/07-forecast.png, card "Margin outlook".
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
  { month: 'Apr', actual: 32.9, path: null, changes: null, low: null, high: null },
  { month: 'May', actual: 34.2, path: null, changes: null, low: null, high: null },
  { month: 'Jun', actual: 34.9, path: null, changes: null, low: null, high: null },
  { month: 'Jul', actual: 34.5, path: null, changes: null, low: null, high: null },
  { month: 'Aug', actual: 34.1, path: null, changes: null, low: null, high: null },
  { month: 'Sep', actual: 33.6, path: 33.6, changes: 33.6, low: 33.6, high: 33.6 },
  { month: 'Oct', actual: null, path: 35.2, changes: 36.7, low: 34.1, high: 36.3 },
  { month: 'Nov', actual: null, path: 35.6, changes: 37.2, low: 34.2, high: 37.0 },
  { month: 'Dec', actual: null, path: 36.0, changes: 37.6, low: 34.3, high: 37.6 },
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
            { label: 'Actual', tone: 'accent' },
            { label: 'Current path', tone: 'accent', dashed: true },
            { label: 'With your changes', tone: 'gain', dashed: true },
            { label: 'Likely range', tone: 'accent-soft', shape: 'bar' },
          ]}
        />
      </header>
      <LineChart
        title="Margin outlook"
        description="Margin reaches 36.0% by December on the current path and 37.6% with your changes, still under the 38% target."
        data={months}
        x="month"
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
        forecastFrom="Oct"
        target={{ value: 38, label: 'Target 38%' }}
        domain={[30, 40]}
        format="percent"
        axisFormat={(v) => `${v}%`}
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
