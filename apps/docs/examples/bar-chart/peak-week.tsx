import { BarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'bar-chart/peak-week',
  title: 'Orders by week, peak labelled',
  rscSafe: true,
} satisfies ExampleMeta

const weeks = [
  { week: 'W1', orders: 120 },
  { week: 'W2', orders: 142 },
  { week: 'W3', orders: 188 },
  { week: 'W4', orders: 161 },
  { week: 'W5', orders: 133 },
  { week: 'W6', orders: 149 },
]

// Props stay serializable (no functions): the page is a server component.
export default function PeakWeek() {
  return (
    <BarChart
      data={weeks}
      x="week"
      y="orders"
      valueLabel="max"
      valueLabelVariant="pill"
      height={220}
      title={meta.title}
      description="Orders peaked at 188 in week 3."
    />
  )
}
