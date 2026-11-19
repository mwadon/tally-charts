import { FunnelChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'funnel-chart/vertical',
  title: 'Crew hiring, applications to first day',
  rscSafe: true,
} satisfies ExampleMeta

const hiring = [
  { step: 'Applications', count: 480 },
  { step: 'Screened', count: 312 },
  { step: 'Phone calls', count: 190 },
  { step: 'Site trials', count: 96 },
  { step: 'Interviews', count: 64 },
  { step: 'Offers', count: 30 },
  { step: 'Accepted', count: 24 },
  { step: 'Started', count: 21 },
]

// Forced vertical at every width: 64 px per step, the labels in a column left of the ribbon.
export default function Vertical() {
  return (
    <FunnelChart
      data={hiring}
      x="step"
      y="count"
      orientation="vertical"
      title={meta.title}
      description="Eight steps. The weakest step is interviews to offers, where 47% continue."
    />
  )
}
