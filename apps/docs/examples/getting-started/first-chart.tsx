import { BarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'getting-started/first-chart',
  title: 'Revenue by month, first half',
  rscSafe: true,
} satisfies ExampleMeta

const months = [
  { month: 'Jan', revenue: 118 },
  { month: 'Feb', revenue: 126 },
  { month: 'Mar', revenue: 141 },
  { month: 'Apr', revenue: 137 },
  { month: 'May', revenue: 152 },
  { month: 'Jun', revenue: 164 },
]

// Props stay serializable (no functions): the page is a server component.
export default function FirstChart() {
  return (
    <BarChart
      data={months}
      x="month"
      y="revenue"
      height={240}
      title={meta.title}
      description="Revenue grew from 118k in January to 164k in June."
    />
  )
}
