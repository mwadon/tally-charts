import { BarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'bar-chart/margin-by-week',
  title: 'Margin by week, last 6 weeks',
  rscSafe: true,
} satisfies ExampleMeta

const weeks = [
  { week: 'W1', margin: 31.2 },
  { week: 'W2', margin: 32.8 },
  { week: 'W3', margin: 33.5 },
  { week: 'W4', margin: 32.1 },
  { week: 'W5', margin: 34.0 },
  { week: 'W6', margin: 35.4 },
]

// Props stay serializable (no functions): the page is a server component.
export default function MarginByWeek() {
  return (
    <BarChart
      data={weeks}
      x="week"
      y="margin"
      domain={[26, 40]}
      format="percent"
      height={240}
      title={meta.title}
      description="Margin rose from 31.2% to 35.4% over six weeks."
    />
  )
}
