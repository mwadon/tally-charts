import { BridgeChart } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'bridge-chart/quote-to-cash',
  title: 'From quote to cash collected',
  rscSafe: true,
} satisfies ExampleMeta

const steps = [
  { label: 'After change orders', value: 3600, note: 'change orders' },
  { label: 'After discounts', value: -2400, note: 'discounts' },
  { label: 'After retainage', value: -3000, note: 'retainage' },
  { label: 'After write-offs', value: -1700, note: 'write-offs' },
]

// Each `note` is the short word after the change. highlightLast={false} keeps the last column hatched like the rest.
export default function QuoteToCash() {
  return (
    <BridgeChart
      title={meta.title}
      description="A $48,000 quote grew to $51,600 with change orders, then fell to $44,500 after discounts, retainage and write-offs."
      start={{ label: 'Quoted', value: 48000 }}
      steps={steps}
      format="currency"
      highlightLast={false}
    />
  )
}
