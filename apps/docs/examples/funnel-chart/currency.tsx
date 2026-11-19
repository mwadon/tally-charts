import { FunnelChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'funnel-chart/currency',
  title: 'Estimated job value, lead to paid',
  rscSafe: true,
} satisfies ExampleMeta

const pipeline = [
  { step: 'Leads', value: 1860000 },
  { step: 'Site visits', value: 1210000 },
  { step: 'Quotes sent', value: 798000 },
  { step: 'Quotes accepted', value: 447000 },
  { step: 'Jobs paid', value: 393000 },
]

// `format` takes a preset name, so the props stay serializable. The rates are never formatted.
export default function Currency() {
  return (
    <FunnelChart
      data={pipeline}
      x="step"
      y="value"
      format="currency-compact"
      tone="gain"
      title={meta.title}
      description="Q3. Of $1.86M in estimated value at the lead step, $393K was paid."
    />
  )
}
