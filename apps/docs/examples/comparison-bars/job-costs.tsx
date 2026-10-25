import { ComparisonBars } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'comparison-bars/job-costs',
  title: 'Job costs, plan vs actual',
  rscSafe: true,
} satisfies ExampleMeta

const costs = [
  { category: 'Labor', plan: 640, actual: 1060 },
  { category: 'Materials', plan: 820, actual: 760 },
  { category: 'Equipment', plan: 300, actual: 300 },
  { category: 'Permits', plan: 150, actual: 190 },
]

// Props stay serializable (no functions): the page is a server component. `initialWidth` is the
// width the first render assumes, so a server-rendered page doesn't change layout after hydration.
export default function JobCosts() {
  return (
    <ComparisonBars
      data={costs}
      label="category"
      plan="plan"
      actual="actual"
      good="down"
      format="currency"
      initialWidth={640}
      title={meta.title}
      description="Labor ran $420 over plan and permits $40 over. Materials came in $60 under, and equipment was on plan."
    />
  )
}
