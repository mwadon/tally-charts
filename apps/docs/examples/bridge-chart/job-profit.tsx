import { BridgeChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'bridge-chart/job-profit',
  title: 'Estimated profit to profit kept, one job',
  rscSafe: true,
} satisfies ExampleMeta

const steps = [
  { label: 'After permits', value: -300, note: 'permits' },
  { label: 'After rework', value: -450, note: 'rework' },
  { label: 'After rental', value: -250, note: 'rental' },
  { label: 'After travel', value: -200, note: 'travel' },
]

// `callout` is an array of segments, so it stays serializable. It is aria-hidden: the numbers are in `description` too.
export default function JobProfit() {
  return (
    <BridgeChart
      title={meta.title}
      description="Estimated profit of $2,400 shrank to $1,200 after permits, rework, rental and travel. The job kept 50% of the estimate."
      start={{ label: 'Estimated profit', value: 2400 }}
      steps={steps}
      format="currency"
      callout={[
        { value: '$1,200', label: 'kept' },
        { value: '50%', label: 'of estimate' },
      ]}
    />
  )
}
