import { Legend, LineChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'reference/07-forecast',
  title: 'Margin outlook: actual through September, forecast to December',
  rscSafe: true,
} satisfies ExampleMeta

// One point per month on a time axis, April to December 2026 (UTC). The forecasts and the band
// start at September's actual, so the lines join there.
const months = [
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

// Props stay serializable (no functions): the page is a server component.
export default function Forecast() {
  return (
    <div className="ref-dashboard">
      <article className="ref-card ref-card-wide">
        <header className="ref-card-header-row">
          <div>
            <h2 className="ref-card-title">Margin outlook</h2>
            <span className="ref-card-meta">Actual through September, forecast to December</span>
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
          yAxisFormat="percent"
          height={360}
        />
      </article>
    </div>
  )
}
