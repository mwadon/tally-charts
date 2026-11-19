import { FunnelChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'funnel-chart/lead-to-paid',
  title: 'From lead to paid job',
  rscSafe: true,
} satisfies ExampleMeta

const steps = [
  { step: 'Leads', count: 1240 },
  { step: 'Site visits', count: 806 },
  { step: 'Quotes sent', count: 532 },
  { step: 'Quotes accepted', count: 298 },
  { step: 'Jobs paid', count: 262 },
]

// Field names only: the page is a server component. The weakest continue rate (56%) is marked.
export default function LeadToPaid() {
  return (
    <FunnelChart
      data={steps}
      x="step"
      y="count"
      title={meta.title}
      description="Q3. 21% of leads become paid jobs; the weakest step is quotes sent to quotes accepted, where 56% continue."
    />
  )
}
