import { DonutChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'donut-chart/revenue-by-line',
  title: 'Revenue by service line',
  rscSafe: true,
} satisfies ExampleMeta

// Fictional revenue of a contractor by service line; total $1.84M.
const lines = [
  { line: 'Installs', revenue: 773000 },
  { line: 'Service plans', revenue: 442000 },
  { line: 'Repairs', revenue: 294000 },
  { line: 'Inspections', revenue: 184000 },
  { line: 'Maintenance', revenue: 62000 },
  { line: 'Consulting', revenue: 41000 },
  { line: 'Parts', revenue: 28000 },
  { line: 'Permits', revenue: 16000 },
]

// Field names and a preset format only: the page is a server component. Eight lines, five
// slices: the four smallest lines are summed into "Other".
export default function RevenueByLine() {
  return (
    <DonutChart
      data={lines}
      x="line"
      y="revenue"
      format="currency-compact"
      centerLabel="total revenue"
      title={meta.title}
      description="Q3. Installs bring 42% of revenue; the four smallest lines are grouped as Other."
    />
  )
}
