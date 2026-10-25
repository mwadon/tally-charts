import { BarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'migration/chart-title',
  title: 'Margin by week',
  rscSafe: true,
} satisfies ExampleMeta

const weeks = [
  { week: 'W1', margin: 31.2 },
  { week: 'W2', margin: 32.8 },
  { week: 'W3', margin: 33.5 },
  { week: 'W4', margin: 32.1 },
]

// A `title` names the chart. Without a title or an aria-labelledby this is a type error in 1.0.
export default function ChartTitle() {
  return (
    <BarChart
      data={weeks}
      x="week"
      y="margin"
      domain={[26, 40]}
      format="percent"
      height={220}
      title={meta.title}
    />
  )
}
