import { StackedBarChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'stacked-bar-chart/cost-by-type',
  title: 'Monthly job cost by type',
  rscSafe: true,
} satisfies ExampleMeta

const months = [
  { month: 'Jan', labor: 24000, materials: 18000, subcontract: 9000 },
  { month: 'Feb', labor: 26000, materials: 20000, subcontract: 10000 },
  { month: 'Mar', labor: 27000, materials: 20000, subcontract: 11000 },
  { month: 'Apr', labor: 28000, materials: 21000, subcontract: 17000 },
  { month: 'May', labor: 27000, materials: 19000, subcontract: 10000 },
  { month: 'Jun', labor: 29000, materials: 20000, subcontract: 20000 },
]

// Props stay serializable (no functions): the page is a server component.
export default function CostByType() {
  return (
    <StackedBarChart
      data={months}
      x="month"
      series={[
        { id: 'labor', label: 'Labor', value: 'labor' },
        { id: 'materials', label: 'Materials', value: 'materials' },
        { id: 'subcontract', label: 'Subcontract', value: 'subcontract', tone: 'neutral' },
      ]}
      format="currency-compact"
      domain={[0, 80000]}
      height={260}
      title={meta.title}
      description="Labor is the largest part of the cost every month. Total cost peaked at $69K in June."
    />
  )
}
