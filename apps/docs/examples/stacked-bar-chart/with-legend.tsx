import { Legend, StackedBarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'stacked-bar-chart/with-legend',
  title: 'Tickets opened by priority, per week',
  rscSafe: true,
} satisfies ExampleMeta

const weeks = [
  { week: 'W1', low: 34, medium: 21, high: 6 },
  { week: 'W2', low: 29, medium: 25, high: 9 },
  { week: 'W3', low: 38, medium: 19, high: 4 },
  { week: 'W4', low: 31, medium: 28, high: 11 },
]

// The chart has no legend of its own: compose `Legend` with the same tones.
export default function WithLegend() {
  return (
    <div>
      <Legend
        items={[
          { label: 'Low', tone: 'accent' },
          { label: 'Medium', tone: 'accent-soft' },
          { label: 'High', tone: 'warn' },
        ]}
      />
      <StackedBarChart
        data={weeks}
        x="week"
        series={[
          { id: 'low', label: 'Low', value: 'low' },
          { id: 'medium', label: 'Medium', value: 'medium' },
          { id: 'high', label: 'High', value: 'high' },
        ]}
        domain={[0, 80]}
        height={260}
        title={meta.title}
        description="Low priority tickets are the largest part every week. High priority peaked at 11 in week 4."
      />
    </div>
  )
}
