import { DonutChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'donut-chart/list-below',
  title: 'Unpaid invoices by age',
  rscSafe: true,
} satisfies ExampleMeta

// Five parts and no "Other": the first four step through the tone, the fifth is neutral.
const ages = [
  { age: 'Not yet due', amount: 48200 },
  { age: '1–30 days late', amount: 21400 },
  { age: '31–60 days late', amount: 9800 },
  { age: '61–90 days late', amount: 4100 },
  { age: 'Over 90 days late', amount: 2500 },
]

// `legendPosition="bottom"` keeps the list under the ring at every width, and `sort="none"`
// keeps the ages in their own order.
export default function ListBelow() {
  return (
    <DonutChart
      data={ages}
      x="age"
      y="amount"
      format="currency-compact"
      sort="none"
      centerLabel="unpaid"
      legendPosition="bottom"
      tone="loss"
      title={meta.title}
      description="Today. 56% of the unpaid amount is not yet due; 8% is more than 60 days late."
    />
  )
}
